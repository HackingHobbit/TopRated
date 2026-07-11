#!/usr/bin/env python3
"""Generate a self-contained image-review gallery from image_candidates.json.

Open scripts/image_review.html in a browser: for each product, click the
candidate image that correctly matches it (or "No good match"), then click
"Export approvals.json". Feed that file to:

    python3 scripts/enrich_images.py --apply scripts/approvals.json

Nothing goes live until you export approvals and run --apply.
"""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
CANDIDATES = ROOT / "scripts" / "image_candidates.json"
OUT = ROOT / "scripts" / "image_review.html"

data = json.loads(CANDIDATES.read_text())
payload = json.dumps(data).replace("</", "<\\/")

HTML = """<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Top Rated — Image Review</title>
<style>
  :root{color-scheme:dark}
  body{margin:0;background:#0a0b0f;color:#e7e7ea;font:14px/1.5 -apple-system,Segoe UI,Roboto,sans-serif}
  header{position:sticky;top:0;background:#14151b;border-bottom:1px solid #2a2b33;padding:12px 20px;
    display:flex;align-items:center;gap:16px;z-index:10}
  header h1{font-size:16px;margin:0;color:#fff}
  header .count{color:#9aa0aa}
  button{cursor:pointer;font:inherit}
  .export{margin-left:auto;background:#DC2626;color:#fff;border:0;border-radius:8px;padding:9px 16px;font-weight:600}
  .wrap{padding:20px;max-width:1200px;margin:0 auto}
  .prod{border:1px solid #2a2b33;border-radius:12px;padding:14px;margin-bottom:16px;background:#101219}
  .prod h2{font-size:15px;margin:0 0 2px}
  .meta{color:#8b909a;font-size:12px;margin-bottom:10px}
  .cands{display:flex;gap:10px;flex-wrap:wrap}
  .cand{width:150px;border:2px solid #2a2b33;border-radius:10px;overflow:hidden;background:#0a0b0f;cursor:pointer}
  .cand.sel{border-color:#22c55e;box-shadow:0 0 0 2px #22c55e55}
  .cand img{width:150px;height:150px;object-fit:contain;background:#17181f;display:block}
  .cand .lbl{padding:5px 7px;font-size:10px;color:#9aa0aa;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .none{width:150px;height:auto;border:2px dashed #3a3b44;border-radius:10px;color:#c98;background:transparent;
    display:flex;align-items:center;justify-content:center;text-align:center;padding:8px}
  .none.sel{border-color:#DC2626;color:#f87171}
  .empty{color:#f59e0b;font-size:12px}
</style></head><body>
<header>
  <h1>Top Rated — Image Review</h1>
  <span class="count" id="count"></span>
  <button class="export" onclick="exportApprovals()">Export approvals.json</button>
</header>
<div class="wrap" id="wrap"></div>
<script>
const DATA = __PAYLOAD__;
const sel = JSON.parse(localStorage.getItem('tr_img_sel')||'{}'); // id -> url ("" = rejected)
function save(){localStorage.setItem('tr_img_sel',JSON.stringify(sel));updateCount();}
function updateCount(){
  const chosen=Object.values(sel).filter(v=>v).length;
  const rejected=Object.values(sel).filter(v=>v==="" ).length;
  document.getElementById('count').textContent=`${chosen} chosen · ${rejected} rejected · ${DATA.length} products`;
}
function choose(id,url,el){
  sel[id]=url; save();
  const parent=el.closest('.cands');
  parent.querySelectorAll('.cand,.none').forEach(n=>n.classList.remove('sel'));
  el.classList.add('sel');
}
function render(){
  const wrap=document.getElementById('wrap');
  DATA.forEach(p=>{
    const d=document.createElement('div');d.className='prod';
    let html=`<h2>${esc(p.name)}</h2><div class="meta">${esc(p.category||'')} · ${esc(p.subCategory||'')} · query: “${esc(p.query||'')}”</div>`;
    if(!p.candidates||!p.candidates.length){html+=`<div class="empty">No candidates found — needs a manual URL or a photo.</div>`;}
    else{
      html+=`<div class="cands">`;
      p.candidates.forEach(c=>{
        const s=sel[p.id]===c.url?' sel':'';
        html+=`<div class="cand${s}" onclick='choose(${JSON.stringify(p.id)},${JSON.stringify(c.url)},this)'>
          <img loading="lazy" src="${esc(c.thumb||c.url)}" onerror="this.style.opacity=.25;this.alt='(preview blocked)'">
          <div class="lbl">${esc(c.host||'')} · ${esc(c.resolution||'')} · ${esc(c.engine||'')}</div></div>`;
      });
      const sn=sel[p.id]===""?' sel':'';
      html+=`<div class="none${sn}" onclick='choose(${JSON.stringify(p.id)},"",this)'>No good match</div>`;
      html+=`</div>`;
    }
    d.innerHTML=html;wrap.appendChild(d);
  });
  updateCount();
}
function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function exportApprovals(){
  const out=Object.entries(sel).filter(([,u])=>u).map(([id,url])=>({id,url}));
  const blob=new Blob([JSON.stringify(out,null,2)],{type:'application/json'});
  const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='approvals.json';a.click();
}
render();
</script></body></html>"""

OUT.write_text(HTML.replace("__PAYLOAD__", payload))
print(f"Wrote {OUT}")
print(f"Products: {len(data)} | with candidates: {sum(1 for d in data if d.get('candidates'))}")
print("Open it:  open scripts/image_review.html")
