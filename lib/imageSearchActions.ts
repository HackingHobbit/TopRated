'use server';

// Admin-only image search + import, powering the "Search for Image" button in
// the product editors. Search aggregates several FREE sources in parallel and
// merges/ranks the results; each source is optional and simply contributes
// nothing when its key/service is absent:
//
//   • Google Programmable Search (GOOGLE_CSE_KEY + GOOGLE_CSE_CX) — general web
//   • eBay Browse API (EBAY_CLIENT_ID + EBAY_CLIENT_SECRET)       — collectibles
//   • Scryfall / Pokémon TCG / YGOPRODeck                          — exact TCG cards
//   • Local SearXNG (SEARXNG_URL)                                  — unlimited, local only
//
// So it works from the deployed site once web keys are set, and still uses a
// local SearXNG when you run the admin locally. A chosen image is re-hosted
// into Supabase Storage so we never depend on a vendor hot-link.

import { randomUUID } from 'crypto';
import { assertAdmin } from './auth-guard';
import { getSupabaseAdmin } from './supabase/admin';
import { SUPABASE_URL } from './supabase/env';
import type { ImageCandidate } from './types';

const BUCKET = 'product-images';
const UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36';

const TRUSTED = [
  'steelcitycollectibles.com', 'blowoutcards.com', 'dacardworld.com',
  'gtsdistribution.com', 'collectorstore.com', 'cloutsnchara.com', 'beckett',
  'tcgplayer.com', 'tcgplayer-cdn.tcgplayer.com', 'topps.com',
  'paniniamerica.net', 'fanatics', 'pokemoncenter.com', 'pokemon.com',
  'upperdeck.com', 'panini', 'cardboardconnection.com', 'ebayimg.com',
  'shopify.com', 'squarespace-cdn.com', 'bigcommerce.com',
];
const JUNK = ['jsdelivr.net', 'unsplash', 'artic.edu', 'fbsbx.com',
  'lookaside', 'pinterest', 'pinimg.com', 'wikimedia', 'gravatar'];

type CandInput = Omit<ImageCandidate, 'score'>;

interface SearchResult {
  ok: boolean;
  candidates?: ImageCandidate[];
  query?: string;
  error?: string;
}

interface ImportResult {
  ok: boolean;
  image?: { url: string; path: string };
  error?: string;
}

function hostOf(u: string): string {
  try {
    return new URL(u).hostname.toLowerCase();
  } catch {
    return '';
  }
}

function score(c: { w: number; h: number; host: string; engine: string }): number {
  let s = (Math.min(c.w * c.h, 4_000_000) / 4_000_000) * 100;
  if (TRUSTED.some((t) => c.host.includes(t))) s += 60;
  if (JUNK.some((j) => c.host.includes(j))) s -= 500;
  // Source trust: exact card matches first, then marketplace, then general web.
  if (['scryfall', 'pokemon', 'ygo'].includes(c.engine)) s += 90;
  else if (c.engine === 'ebay') s += 50;
  else if (c.engine === 'google') s += 30;
  else if (c.engine === 'duckduckgo') s += 25;
  if ((c.w > 0 && c.w < 300) || (c.h > 0 && c.h < 300)) s -= 40;
  return Math.round(s * 10) / 10;
}

function cand(c: CandInput): ImageCandidate {
  return { ...c, score: score(c) };
}


// ---------------------------------------------------------------- adapters
// Each adapter NEVER throws — it returns [] on missing config / error / no
// match, so one flaky source can't break the aggregate search.

async function fromSearxng(q: string): Promise<ImageCandidate[]> {
  const base = process.env.SEARXNG_URL || 'http://127.0.0.1:8080';
  try {
    const qs = new URLSearchParams({ q, categories: 'images', format: 'json', safesearch: '0' });
    const res = await fetch(`${base}/search?${qs}`, {
      headers: { 'User-Agent': UA, Accept: 'application/json' },
      signal: AbortSignal.timeout(12_000),
      cache: 'no-store',
    });
    if (!res.ok) return [];
    const data = await res.json();
    const out: ImageCandidate[] = [];
    for (const r of data.results ?? []) {
      const url = r.img_src || r.thumbnail_src;
      if (!url) continue;
      const nums = String(r.resolution || '').match(/\d+/g);
      const [w, h] = nums && nums.length >= 2 ? [Number(nums[0]), Number(nums[1])] : [0, 0];
      out.push(cand({
        url, thumb: r.thumbnail_src || url, page: r.url || url, host: hostOf(url),
        resolution: r.resolution || '', w, h, engine: r.engine || 'searxng',
      }));
    }
    return out;
  } catch {
    return [];
  }
}

// DuckDuckGo image search — KEYLESS. Unofficial: fetch a page to grab the
// one-time `vqd` token, then hit the i.js JSON endpoint. Works from the
// deployed server with no credentials. Caveat: it's scraping-based and DDG can
// rate-limit datacenter IPs, so treat it as best-effort, not guaranteed.
async function fromDuckDuckGo(q: string): Promise<ImageCandidate[]> {
  try {
    const tokenRes = await fetch(
      `https://duckduckgo.com/?q=${encodeURIComponent(q)}&iax=images&ia=images`,
      { headers: { 'User-Agent': UA, Accept: 'text/html' }, signal: AbortSignal.timeout(5_000), cache: 'no-store' }
    );
    if (!tokenRes.ok) return [];
    const html = await tokenRes.text();
    const m = html.match(/vqd=["']?([\d-]+)["']?/);
    if (!m) return [];
    const res = await fetch(
      `https://duckduckgo.com/i.js?l=us-en&o=json&q=${encodeURIComponent(q)}&vqd=${m[1]}&f=,,,&p=1`,
      {
        headers: { 'User-Agent': UA, Accept: 'application/json', Referer: 'https://duckduckgo.com/' },
        signal: AbortSignal.timeout(5_000),
        cache: 'no-store',
      }
    );
    if (!res.ok) return [];
    const data = await res.json();
    return (data.results ?? []).slice(0, 20).map((r: Record<string, unknown>) => {
      const w = Number(r.width) || 0;
      const h = Number(r.height) || 0;
      const url = String(r.image);
      return cand({
        url,
        thumb: (r.thumbnail as string) || url,
        page: (r.url as string) || url,
        host: hostOf(url),
        resolution: w && h ? `${w}x${h}` : '',
        w, h, engine: 'duckduckgo',
      });
    });
  } catch {
    return [];
  }
}

async function fromGoogle(q: string): Promise<ImageCandidate[]> {
  const key = process.env.GOOGLE_CSE_KEY;
  const cx = process.env.GOOGLE_CSE_CX;
  if (!key || !cx) return [];
  try {
    const u =
      `https://www.googleapis.com/customsearch/v1?key=${key}&cx=${cx}` +
      `&searchType=image&num=10&safe=off&q=${encodeURIComponent(q)}`;
    const res = await fetch(u, { signal: AbortSignal.timeout(12_000), cache: 'no-store' });
    if (!res.ok) return [];
    const data = await res.json();
    return (data.items ?? []).map((it: Record<string, unknown>) => {
      const img = (it.image ?? {}) as Record<string, unknown>;
      const w = Number(img.width) || 0;
      const h = Number(img.height) || 0;
      const url = String(it.link);
      return cand({
        url,
        thumb: (img.thumbnailLink as string) || url,
        page: (img.contextLink as string) || url,
        host: hostOf(url),
        resolution: w && h ? `${w}x${h}` : '',
        w, h, engine: 'google',
      });
    });
  } catch {
    return [];
  }
}

// eBay Browse needs an application (client-credentials) token; cache it.
let ebayToken = { value: '', exp: 0 };
async function ebayAppToken(): Promise<string | null> {
  const id = process.env.EBAY_CLIENT_ID;
  const secret = process.env.EBAY_CLIENT_SECRET;
  if (!id || !secret) return null;
  const now = Date.now();
  if (ebayToken.value && ebayToken.exp > now + 60_000) return ebayToken.value;
  try {
    const basic = Buffer.from(`${id}:${secret}`).toString('base64');
    const res = await fetch('https://api.ebay.com/identity/v1/oauth2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: `Basic ${basic}`,
      },
      body: 'grant_type=client_credentials&scope=https%3A%2F%2Fapi.ebay.com%2Foauth%2Fapi_scope',
      signal: AbortSignal.timeout(12_000),
    });
    if (!res.ok) return null;
    const d = await res.json();
    ebayToken = { value: d.access_token, exp: now + (Number(d.expires_in) || 7200) * 1000 };
    return ebayToken.value;
  } catch {
    return null;
  }
}

async function fromEbay(q: string): Promise<ImageCandidate[]> {
  try {
    const token = await ebayAppToken();
    if (!token) return [];
    const res = await fetch(
      `https://api.ebay.com/buy/browse/v1/item_summary/search?limit=15&q=${encodeURIComponent(q)}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'X-EBAY-C-MARKETPLACE-ID': process.env.EBAY_MARKETPLACE_ID || 'EBAY_US',
        },
        signal: AbortSignal.timeout(12_000),
        cache: 'no-store',
      }
    );
    if (!res.ok) return [];
    const d = await res.json();
    const out: ImageCandidate[] = [];
    for (const it of d.itemSummaries ?? []) {
      const url = it.image?.imageUrl;
      if (!url) continue;
      out.push(cand({
        url,
        thumb: it.thumbnailImages?.[0]?.imageUrl || url,
        page: it.itemWebUrl || url,
        host: hostOf(url),
        resolution: '',
        w: 0, h: 0, engine: 'ebay',
      }));
    }
    return out;
  } catch {
    return [];
  }
}

async function fromScryfall(q: string): Promise<ImageCandidate[]> {
  try {
    const res = await fetch(
      `https://api.scryfall.com/cards/search?order=released&q=${encodeURIComponent(q)}`,
      { headers: { 'User-Agent': UA, Accept: 'application/json' }, signal: AbortSignal.timeout(10_000), cache: 'no-store' }
    );
    if (!res.ok) return []; // 404 when nothing matches
    const d = await res.json();
    const out: ImageCandidate[] = [];
    for (const c of (d.data ?? []).slice(0, 6)) {
      const img = c.image_uris?.large || c.image_uris?.normal || c.card_faces?.[0]?.image_uris?.large;
      if (!img) continue;
      out.push(cand({
        url: img, thumb: c.image_uris?.small || img, page: c.scryfall_uri || img,
        host: 'scryfall.com', resolution: 'card', w: 0, h: 0, engine: 'scryfall',
      }));
    }
    return out;
  } catch {
    return [];
  }
}

async function fromPokemon(q: string): Promise<ImageCandidate[]> {
  try {
    const headers: Record<string, string> = { Accept: 'application/json' };
    if (process.env.POKEMONTCG_API_KEY) headers['X-Api-Key'] = process.env.POKEMONTCG_API_KEY;
    const res = await fetch(
      `https://api.pokemontcg.io/v2/cards?pageSize=6&q=${encodeURIComponent(`name:"${q}"`)}`,
      { headers, signal: AbortSignal.timeout(10_000), cache: 'no-store' }
    );
    if (!res.ok) return [];
    const d = await res.json();
    const out: ImageCandidate[] = [];
    for (const c of d.data ?? []) {
      const img = c.images?.large || c.images?.small;
      if (!img) continue;
      out.push(cand({
        url: img, thumb: c.images?.small || img, page: 'https://pokemontcg.io',
        host: 'pokemontcg.io', resolution: 'card', w: 0, h: 0, engine: 'pokemon',
      }));
    }
    return out;
  } catch {
    return [];
  }
}

async function fromYgo(q: string): Promise<ImageCandidate[]> {
  try {
    const res = await fetch(
      `https://db.ygoprodeck.com/api/v7/cardinfo.php?num=6&offset=0&fname=${encodeURIComponent(q)}`,
      { headers: { Accept: 'application/json' }, signal: AbortSignal.timeout(10_000), cache: 'no-store' }
    );
    if (!res.ok) return []; // 400 when nothing matches
    const d = await res.json();
    const out: ImageCandidate[] = [];
    for (const c of (d.data ?? []).slice(0, 6)) {
      const img = c.card_images?.[0]?.image_url;
      if (!img) continue;
      out.push(cand({
        url: img, thumb: c.card_images?.[0]?.image_url_small || img,
        page: c.ygoprodeck_url || img, host: 'ygoprodeck.com',
        resolution: 'card', w: 0, h: 0, engine: 'ygo',
      }));
    }
    return out;
  } catch {
    return [];
  }
}

function rank(cands: ImageCandidate[]): ImageCandidate[] {
  const seen = new Set<string>();
  const out: ImageCandidate[] = [];
  for (const c of [...cands].sort((a, b) => b.score - a.score)) {
    if (!c.url || seen.has(c.url)) continue;
    seen.add(c.url);
    out.push(c);
  }
  return out.slice(0, 24);
}

/** Aggregate free image sources, ranked. Admin-only. */
export async function searchImages(query: string): Promise<SearchResult> {
  await assertAdmin();
  const q = query.trim();
  if (!q) return { ok: false, error: 'Enter something to search for.' };

  // Collect results as each source resolves, but never wait longer than the
  // overall deadline — so a slow/rate-limited source (e.g. DuckDuckGo) can't
  // hold up the fast ones (SearXNG, card APIs). We return whatever has arrived.
  const OVERALL_MS = 4500;
  const all: ImageCandidate[] = [];
  const jobs = [
    fromSearxng(q), fromDuckDuckGo(q), fromGoogle(q), fromEbay(q),
    fromScryfall(q), fromPokemon(q), fromYgo(q),
  ].map((p) =>
    p.then((r) => { if (Array.isArray(r)) all.push(...r); }).catch(() => {})
  );
  await Promise.race([
    Promise.allSettled(jobs),
    new Promise((res) => setTimeout(res, OVERALL_MS)),
  ]);

  if (all.length === 0) {
    return {
      ok: false,
      error:
        'No matching images came back — try a different search term, or paste ' +
        'an image URL below.',
    };
  }
  return { ok: true, query: q, candidates: rank(all) };
}

/** Download a chosen image and re-host it into Supabase Storage. Admin-only. */
export async function importImageFromUrl(
  url: string,
  pathPrefix = 'enriched'
): Promise<ImportResult> {
  await assertAdmin();
  if (!/^https?:\/\//i.test(url)) {
    return { ok: false, error: 'That doesn’t look like a valid image URL.' };
  }
  const admin = getSupabaseAdmin();
  if (!admin || !SUPABASE_URL) {
    return { ok: false, error: 'Supabase storage isn’t configured.' };
  }

  let bytes: ArrayBuffer;
  let contentType: string;
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': UA },
      signal: AbortSignal.timeout(20_000),
      cache: 'no-store',
    });
    if (!res.ok) throw new Error(`source returned ${res.status}`);
    contentType = res.headers.get('content-type') || 'image/jpeg';
    if (!contentType.startsWith('image/')) throw new Error('not an image');
    bytes = await res.arrayBuffer();
  } catch (e) {
    return {
      ok: false,
      error: `Couldn’t fetch that image (${e instanceof Error ? e.message : 'error'}). Try another.`,
    };
  }

  const ext = contentType.includes('png')
    ? 'png'
    : contentType.includes('webp')
      ? 'webp'
      : contentType.includes('gif')
        ? 'gif'
        : 'jpg';
  const path = `${pathPrefix}/${randomUUID()}.${ext}`;
  const { error: upErr } = await admin.storage
    .from(BUCKET)
    .upload(path, bytes, { contentType, upsert: false });
  if (upErr) return { ok: false, error: upErr.message };

  const { data } = admin.storage.from(BUCKET).getPublicUrl(path);
  return { ok: true, image: { url: data.publicUrl, path } };
}
