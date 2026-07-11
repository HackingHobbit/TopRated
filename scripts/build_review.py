#!/usr/bin/env python3
"""Image-review gallery.

Two ways to use it:

  Static (offline):   python3 scripts/build_review.py
      -> writes scripts/image_review.html (open it with `open`). Review + pick,
         Export approvals.json, then enrich_images.py --apply.

  Live (refine/keep-looking):   python3 scripts/review_server.py
      -> serves the same gallery with a "Keep looking" checkbox and a per-product
         query box + "Search again", so you can re-run SearXNG for products whose
         candidates don't match, without leaving the page.

render_html(data, live) builds the page for both.
"""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
CANDIDATES = ROOT / "scripts" / "image_candidates.json"
OUT = ROOT / "scripts" / "image_review.html"

TEMPLATE = """<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Top Rated — Image Review</title>
<style>
  :root{color-scheme:dark}
  body{margin:0;background:#0a0b0f;color:#e7e7ea;font:14px/1.5 -apple-system,Segoe UI,Roboto,sans-serif}
  header{position:sticky;top:0;background:#14151b;border-bottom:1px solid #2a2b33;padding:12px 20px;
    display:flex;align-items:center;gap:18px;z-index:10;flex-wrap:wrap}
  header h1{font-size:16px;margin:0;color:#fff}
  header .count{color:#9aa0aa}
  label.keep{display:none;align-items:center;gap:6px;color:#cdd2da;font-size:13px}
  button{cursor:pointer;font:inherit}
  .export{margin-left:auto;background:#DC2626;color:#fff;border:0;border-radius:8px;padding:9px 16px;font-weight:600}
  .wrap{padding:20px;max-width:1200px;margin:0 auto}
  .prod{border:1px solid #2a2b33;border-radius:12px;padding:14px;margin-bottom:16px;background:#101219}
  .prod h2{font-size:15px;margin:0 0 2px}
  .meta{color:#8b909a;font-size:12px;margin-bottom:10px}
  .cands{display:flex;gap:10px;flex-wrap:wrap}
  .cand{position:relative;width:150px;border:2px solid #2a2b33;border-radius:10px;overflow:hidden;background:#0a0b0f;cursor:pointer}
  .cand.sel{border-color:#22c55e;box-shadow:0 0 0 2px #22c55e55}
  .cand img{width:150px;height:150px;object-fit:contain;background:#17181f;display:block}
  .cand .lbl{padding:5px 7px;font-size:10px;color:#9aa0aa;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .zoombtn{position:absolute;top:5px;right:5px;width:26px;height:26px;border:0;border-radius:6px;
    background:rgba(0,0,0,.62);color:#fff;font-size:14px;line-height:26px;text-align:center;padding:0}
  .zoombtn:hover{background:#DC2626}
  .none{width:150px;height:auto;border:2px dashed #3a3b44;border-radius:10px;color:#c98;background:transparent;
    display:flex;align-items:center;justify-content:center;text-align:center;padding:8px}
  .none.sel{border-color:#DC2626;color:#f87171}
  .empty{color:#f59e0b;font-size:12px}
  .refine{display:flex;gap:8px;margin-top:12px;align-items:center;flex-wrap:wrap}
  .refine input{flex:1;min-width:240px;max-width:560px;padding:7px 10px;background:#0a0b0f;
    border:1px solid #2a2b33;border-radius:8px;color:#e7e7ea}
  .refine button{background:#23252e;border:1px solid #3a3b44;color:#e7e7ea;border-radius:8px;padding:7px 12px}
  .refine button:hover{border-color:#DC2626}
  .rstat{color:#9aa0aa;font-size:12px}
  .lbl a{color:#9ab4e6;text-decoration:none} .lbl a:hover{text-decoration:underline}
  .lookup{font-size:12px;color:#8b909a;margin:-2px 0 12px} .lookup a{color:#9ab4e6;text-decoration:none} .lookup a:hover{text-decoration:underline}
  /* lightbox */
  .lb{position:fixed;inset:0;background:rgba(0,0,0,.9);display:none;flex-direction:column;z-index:100}
  .lb.open{display:flex}
  .lb .bar{display:flex;align-items:center;gap:14px;padding:12px 18px;color:#e7e7ea;background:#14151b;border-bottom:1px solid #2a2b33}
  .lb .bar .title{font-weight:600}.lb .bar .sub{color:#9aa0aa;font-size:12px}.lb .bar .spacer{margin-left:auto}
  .lb .stage{flex:1;overflow:auto;display:flex;align-items:center;justify-content:center;padding:16px}
  .lb .stage img{height:78vh;max-width:90vw;object-fit:contain;transition:transform .12s;cursor:zoom-in;background:#0f1015}
  .lb .stage img.z2{transform:scale(2);cursor:zoom-out}
  .lb button{background:#23252e;color:#e7e7ea;border:1px solid #3a3b44;border-radius:8px;padding:8px 12px}
  .lb button.primary{background:#22c55e;border-color:#22c55e;color:#08130a;font-weight:700}
  .lb button.primary.on{background:#16351f;color:#22c55e}
  .lb .nav{position:absolute;top:50%;transform:translateY(-50%);font-size:26px;width:46px;height:60px;background:rgba(0,0,0,.5);border:0;color:#fff}
  .lb .nav.prev{left:8px}.lb .nav.next{right:8px}
</style></head><body>
<header>
  <h1>Top Rated — Image Review</h1>
  <span class="count" id="count"></span>
  <label class="keep" id="keepWrap"><input type="checkbox" id="keepLooking" checked> Keep looking on &ldquo;No good match&rdquo;</label>
  <button class="export" onclick="exportApprovals()">Export approvals.json</button>
</header>
<div class="wrap" id="wrap"></div>

<div class="lb" id="lb">
  <div class="bar">
    <span class="title" id="lbTitle"></span>
    <span class="sub" id="lbSub"></span>
    <span id="lbLoad" style="color:#f59e0b;font-size:12px;margin-left:8px"></span>
    <a id="lbSrc" target="_blank" rel="noopener" style="color:#9ab4e6;font-size:13px;text-decoration:none;margin-left:10px">source &#8599;</a>
    <span class="spacer"></span>
    <button onclick="lbToggle()">1&times; / 2&times;</button>
    <button class="primary" id="lbSelBtn" onclick="lbSelect()">Select this</button>
    <button onclick="lbClose()">Close &times;</button>
  </div>
  <button class="nav prev" onclick="lbNav(-1)">&lsaquo;</button>
  <div class="stage"><img id="lbImg" alt="" onclick="lbToggle()"></div>
  <button class="nav next" onclick="lbNav(1)">&rsaquo;</button>
</div>

<script>
const DATA = __PAYLOAD__;
const LIVE = __LIVE__;
const sel = JSON.parse(localStorage.getItem('tr_img_sel')||'{}'); // id -> url ("" = rejected)
let lb = {pid:null, idx:0}; let lbToken = 0;
const J = JSON.stringify;

function save(){localStorage.setItem('tr_img_sel',JSON.stringify(sel));updateCount();}
function updateCount(){
  const chosen=Object.values(sel).filter(v=>v).length;
  const rejected=Object.values(sel).filter(v=>v==="" ).length;
  document.getElementById('count').textContent=`${chosen} chosen · ${rejected} rejected · ${DATA.length} products`;
}
function prod(pid){return DATA.find(p=>p.id===pid);}
function vendorLinks(name){
  const q=encodeURIComponent(name);
  const L=(u,t)=>`<a href="${u}" target="_blank" rel="noopener">${t}</a>`;
  return 'Look this product up: '+[
    L(`https://www.ebay.com/sch/i.html?_nkw=${q}`,'eBay'),
    L(`https://www.google.com/search?tbm=shop&q=${q}`,'Google Shopping'),
    L(`https://www.google.com/search?tbm=isch&q=${q}`,'Google Images'),
  ].join(' · ');
}
function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function cssesc(s){return String(s).replace(/["\\\\]/g,'\\\\$&');}

function candsHTML(p){
  let h='';
  if(!p.candidates||!p.candidates.length){
    h+=`<div class="empty">No candidates yet — ${LIVE?'edit the query and Search again':'needs a manual URL or a photo'}.</div>`;
  }else{
    h+=`<div class="cands" data-pid="${esc(p.id)}">`;
    p.candidates.forEach((c,idx)=>{
      const s=sel[p.id]===c.url?' sel':'';
      h+=`<div class="cand${s}" data-url="${esc(c.url)}" onclick='choose(${J(p.id)},${J(c.url)})'>
        <button class="zoombtn" title="Zoom" onclick='event.stopPropagation();zoom(${J(p.id)},${idx})'>&#10530;</button>
        <img loading="lazy" src="${esc(c.thumb||c.url)}" onerror="this.style.opacity=.25">
        <div class="lbl">${c.page?`<a href="${esc(c.page)}" target="_blank" rel="noopener" title="Open the vendor/source page this image came from" onclick="event.stopPropagation()">${esc(c.host||'source')} &#8599;</a>`:esc(c.host||'')} · ${esc(c.resolution||'')}</div></div>`;
    });
    h+=`<div class="none${sel[p.id]===''?' sel':''}" onclick='choose(${J(p.id)},"")'>No good match</div>`;
    h+=`</div>`;
  }
  if(LIVE){
    h+=`<div class="refine">
      <input id="q_${esc(p.id)}" value="${esc(p.query||'')}" placeholder="refine the search query…"
        onkeydown="if(event.key==='Enter')requery(${J(p.id)})">
      <button onclick='requery(${J(p.id)})'>&#8635; Search again</button>
      <span class="rstat" id="rs_${esc(p.id)}"></span></div>`;
  }
  return h;
}
function reHighlight(pid){
  const box=document.querySelector(`.cands[data-pid="${cssesc(pid)}"]`); if(!box)return;
  box.querySelectorAll('.cand').forEach(el=>el.classList.toggle('sel', el.dataset.url===sel[pid]));
  const none=box.querySelector('.none'); if(none) none.classList.toggle('sel', sel[pid]==="");
}
function choose(pid,url){
  sel[pid]=url; save(); reHighlight(pid);
  if(url==="" && LIVE && document.getElementById('keepLooking').checked) requery(pid);
}
async function requery(pid){
  if(!LIVE) return;
  const qEl=document.getElementById('q_'+pid); const q=qEl?qEl.value.trim():'';
  const rs=document.getElementById('rs_'+pid); if(rs) rs.textContent='searching…';
  try{
    const url='/api/requery?id='+encodeURIComponent(pid)+(q?('&q='+encodeURIComponent(q)):'');
    const data=await (await fetch(url)).json();
    if(data.error) throw new Error(data.error);
    const p=prod(pid); p.candidates=data.candidates; p.query=data.query;
    document.getElementById('cw_'+cssId(pid)).innerHTML=candsHTML(p);
    reHighlight(pid);
    const rs2=document.getElementById('rs_'+pid); if(rs2) rs2.textContent=`${data.candidates.length} candidates · query: “${data.query}”`;
  }catch(e){ const rs2=document.getElementById('rs_'+pid); if(rs2) rs2.textContent='error: '+e.message; }
}
function cssId(pid){return String(pid).replace(/[^A-Za-z0-9_-]/g,'_');}

function zoom(pid,idx){lb={pid,idx};document.getElementById('lb').classList.add('open');renderLB();}
function renderLB(){
  const p=prod(lb.pid); const c=p.candidates[lb.idx];
  const img=document.getElementById('lbImg'), load=document.getElementById('lbLoad');
  img.classList.remove('z2');
  const thumb=c.thumb||c.url;
  img.src=thumb;                                  // instant: thumbnail is already cached from the grid
  const token=++lbToken;
  if(c.url && c.url!==thumb){
    load.textContent='loading full-res…';
    const full=new Image(); full.decoding='async';
    full.onload=()=>{ if(token===lbToken){ img.src=c.url; load.textContent=''; } };
    full.onerror=()=>{ if(token===lbToken){ load.textContent='(full-res blocked — showing thumbnail)'; } };
    full.src=c.url;
  } else { load.textContent=''; }
  const n=p.candidates.length;
  [(lb.idx+1)%n,(lb.idx-1+n)%n].forEach(j=>{const u=p.candidates[j].url; if(u)(new Image()).src=u;});
  document.getElementById('lbTitle').textContent=p.name;
  document.getElementById('lbSub').textContent=`${lb.idx+1}/${n} · ${c.host||''} · ${c.resolution||''} · ${c.engine||''}`;
  const srcEl=document.getElementById('lbSrc'); srcEl.href=c.page||c.url; srcEl.style.display=c.page?'inline':'none';
  const chosen=sel[lb.pid]===c.url;
  const b=document.getElementById('lbSelBtn'); b.textContent=chosen?'Selected \\u2713':'Select this'; b.classList.toggle('on',chosen);
}
function lbNav(d){const p=prod(lb.pid);lb.idx=(lb.idx+d+p.candidates.length)%p.candidates.length;renderLB();}
function lbSelect(){const c=prod(lb.pid).candidates[lb.idx];choose(lb.pid,c.url);renderLB();}
function lbToggle(){document.getElementById('lbImg').classList.toggle('z2');}
function lbClose(){document.getElementById('lb').classList.remove('open');}
document.addEventListener('keydown',e=>{
  if(!document.getElementById('lb').classList.contains('open'))return;
  if(e.key==='Escape')lbClose(); else if(e.key==='ArrowLeft')lbNav(-1);
  else if(e.key==='ArrowRight')lbNav(1); else if(e.key==='Enter')lbSelect();
});
document.getElementById('lb').addEventListener('click',e=>{if(e.target.id==='lb')lbClose();});

function render(){
  const wrap=document.getElementById('wrap');
  if(LIVE) document.getElementById('keepWrap').style.display='flex';
  DATA.forEach(p=>{
    const d=document.createElement('div');d.className='prod';
    d.innerHTML=`<h2>${esc(p.name)}</h2>`+
      `<div class="meta">${esc(p.category||'')} · ${esc(p.subCategory||'')}</div>`+
      `<div class="lookup">${vendorLinks(p.name)}</div>`+
      `<div id="cw_${cssId(p.id)}">${candsHTML(p)}</div>`;
    wrap.appendChild(d);
  });
  updateCount();
}
function exportApprovals(){
  const out=Object.entries(sel).filter(([,u])=>u).map(([id,url])=>({id,url}));
  const blob=new Blob([JSON.stringify(out,null,2)],{type:'application/json'});
  const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='approvals.json';a.click();
}
render();
</script></body></html>"""


def render_html(data, live=False):
    payload = json.dumps(data).replace("</", "<\\/")
    return TEMPLATE.replace("__PAYLOAD__", payload).replace("__LIVE__", "true" if live else "false")


if __name__ == "__main__":
    data = json.loads(CANDIDATES.read_text())
    OUT.write_text(render_html(data, live=False))
    print(f"Wrote {OUT}")
    print(f"Products: {len(data)} | with candidates: {sum(1 for d in data if d.get('candidates'))}")
    print("Static gallery: open scripts/image_review.html")
    print("Live gallery (refine/keep-looking): python3 scripts/review_server.py")
