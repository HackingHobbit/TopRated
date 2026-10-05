import 'server-only';

// Pulls products, prices and stock from the store's REAL Clover account
// (production Platform API) and reconciles the website
// catalog against it. Clover is the source of truth for price and stock:
//   - price: copied from Clover (fixed-price items only)
//   - quantity: copied from Clover's itemStock
//   - is_out_of_stock: on when Clover stock is 0, off when it's above 0
//     (pre-order items are exempt — they sell before stock arrives)
// Items new to the website are added with a generic placeholder image and
// image_representative = true, so staff can find and replace them later.
// Names, descriptions, images and merchandising flags of existing products
// are never touched — those are curated on the website.

import type { SupabaseClient } from '@supabase/supabase-js';
import { PLACEHOLDER_IMAGE } from '../site';

const CLOVER_API = 'https://api.clover.com';
const PAGE_SIZE = 1000;


interface CloverApiItem {
  id: string;
  name: string;
  price?: number; // cents
  priceType?: string; // FIXED | VARIABLE | PER_UNIT
  deleted?: boolean;
  itemStock?: { quantity?: number } | null;
  categories?: { elements?: { name: string }[] };
}

interface SiteProduct {
  id: string;
  name: string;
  price: number | string;
  quantity: number;
  is_out_of_stock: boolean;
  is_pre_order: boolean;
}

export interface SyncChange {
  id: string;
  name: string;
  detail: string;
}

export interface InventorySyncReport {
  cloverItems: number;
  matched: number;
  priceChanges: SyncChange[];
  nowOutOfStock: SyncChange[];
  backInStock: SyncChange[];
  quantityUpdates: number;
  added: SyncChange[];
  skipped: SyncChange[];
  /** Website products with no Clover item (e.g. singles) — left alone. */
  websiteOnly: number;
  applied: boolean;
}

export async function fetchCloverItems(merchantId: string, token: string): Promise<CloverApiItem[]> {
  const all: CloverApiItem[] = [];
  for (let offset = 0; ; offset += PAGE_SIZE) {
    const url =
      `${CLOVER_API}/v3/merchants/${encodeURIComponent(merchantId)}/items` +
      `?limit=${PAGE_SIZE}&offset=${offset}&expand=itemStock,categories`;
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
      signal: AbortSignal.timeout(30_000),
      cache: 'no-store',
    });
    if (res.status === 401) throw new Error('Clover rejected the token (401). Check the merchant ID and API token.');
    if (!res.ok) throw new Error(`Clover returned ${res.status} ${res.statusText}.`);
    const page = ((await res.json()).elements ?? []) as CloverApiItem[];
    all.push(...page);
    if (page.length < PAGE_SIZE) break;
  }
  return all.filter((it) => !it.deleted);
}

// ---- name + category helpers (ported from scripts/ingest_inventory.py) ----

const TYPO_FIXES: Record<string, string> = {
  Jeresy: 'Jersey',
  Staduim: 'Stadium',
  Cactucs: 'Cactus',
  Evoltuion: 'Evolution',
  Downtoen: 'Downtown',
  'Topp Series': 'Topps Series',
  Upperdeck: 'Upper Deck',
  Starwars: 'Star Wars',
  Yerbamate: 'Yerba Mate',
  Risng: 'Rising',
  Wnba: 'WNBA',
  Nba: 'NBA',
  Nfl: 'NFL',
  Mlb: 'MLB',
  Nhl: 'NHL',
  Ufc: 'UFC',
  Wwe: 'WWE',
  Etb: 'ETB',
  Mtg: 'MTG',
  Tcg: 'TCG',
};

const century = (yy: string) => (Number(yy) >= 30 ? '19' : '20');

export function cleanName(raw: string): string {
  let n = raw.trim();
  n = n.replace(/\b(\d{2})'/g, (_, yy: string) => `${century(yy)}${yy}`); // 25' -> 2025
  n = n.replace(/\b(\d{2})-(\d{2})\b/g, (_, a: string, b: string) => `${century(a)}${a}-${b}`); // 25-26 -> 2025-26
  // Leading bare year: "26 Bowman Football Mega" -> "2026 Bowman ..." (but not "10 Pack ...").
  n = n.replace(/^(\d{2})\s+(?!(?:pk|pack|packs|ct|count|cards?)\b)(?=[a-z])/i, (_, yy: string) => `${century(yy)}${yy} `);
  for (const [wrong, right] of Object.entries(TYPO_FIXES)) {
    const escaped = wrong.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    n = n.replace(new RegExp(`\\b${escaped}\\b`, 'gi'), right);
  }
  return n.replace(/\s+/g, ' ').trim();
}

// Name-based fallback for Clover items with no category (first match wins).
const CATEGORY_HINTS: [RegExp, string][] = [
  [/\b(absolute|donruss|prizm|mosaic|select|phoenix|optic|certified|panini)\b.*\b(downtown|stained glass|jumbo|football|nfl)\b/, 'NFL'],
  [/\b(absolute|phoenix)\b/, 'NFL'],
  [/\b(donruss|prizm)\b.*\b(wnba|liv golf)\b/, 'NBA'],
  [/\btopps series\b/, 'MLB'],
  [/\btopps slab case\b/, 'Accessories'],
  [/\bbowman( chrome)?\b/, 'MLB'],
  [/\btopps chrome (cactus jack|wwe|ufc)\b/, 'Combat'],
  [/\b(pokemon|one piece|lorcana|mtg|magic|yu-?gi-?oh|chaos rising|white flare|ascended hero|etb|booster)\b/, 'TCG'],
];

function inferCategory(name: string): string | null {
  const nl = name.toLowerCase();
  for (const [re, cat] of CATEGORY_HINTS) if (re.test(nl)) return cat;
  return null;
}

const money = (n: number) => `$${n.toFixed(2)}`;

/**
 * Compare Clover against the website and, when `apply` is true, write the
 * changes. With `apply` false it's a dry run that only reports.
 */
export async function runInventorySync(
  supabase: SupabaseClient,
  merchantId: string,
  token: string,
  apply: boolean
): Promise<InventorySyncReport> {
  const items = await fetchCloverItems(merchantId, token);

  const { data: productRows, error: pErr } = await supabase
    .from('products')
    .select('id, name, price, quantity, is_out_of_stock, is_pre_order');
  if (pErr) throw new Error(`Could not read products: ${pErr.message}`);
  const { data: categoryRows, error: cErr } = await supabase.from('categories').select('id, top_level');
  if (cErr) throw new Error(`Could not read categories: ${cErr.message}`);

  const products = new Map((productRows as SiteProduct[]).map((p) => [p.id, p]));
  const topLevel = new Map((categoryRows as { id: string; top_level: string }[]).map((c) => [c.id, c.top_level]));

  const report: InventorySyncReport = {
    cloverItems: items.length,
    matched: 0,
    priceChanges: [],
    nowOutOfStock: [],
    backInStock: [],
    quantityUpdates: 0,
    added: [],
    skipped: [],
    websiteOnly: 0,
    applied: apply,
  };

  const updates: { id: string; patch: Record<string, unknown> }[] = [];
  const inserts: Record<string, unknown>[] = [];
  const hasFixedPrice = (it: CloverApiItem) => (it.priceType ?? 'FIXED') === 'FIXED' && (it.price ?? 0) > 0;

  for (const it of items) {
    const tracked = it.itemStock != null && typeof it.itemStock.quantity === 'number';
    const qty = tracked ? Math.max(0, Math.floor(it.itemStock!.quantity!)) : null;
    const existing = products.get(it.id);

    if (existing) {
      report.matched++;
      const patch: Record<string, unknown> = {};

      if (hasFixedPrice(it)) {
        const newPrice = it.price! / 100;
        const oldPrice = Number(existing.price);
        if (Math.round(oldPrice * 100) !== it.price) {
          patch.price = newPrice;
          report.priceChanges.push({ id: it.id, name: existing.name, detail: `${money(oldPrice)} → ${money(newPrice)}` });
        }
      }

      if (qty !== null) {
        if (qty !== existing.quantity) {
          patch.quantity = qty;
          report.quantityUpdates++;
        }
        if (!existing.is_pre_order) {
          const oos = qty <= 0;
          if (oos !== existing.is_out_of_stock) {
            patch.is_out_of_stock = oos;
            (oos ? report.nowOutOfStock : report.backInStock).push({
              id: it.id,
              name: existing.name,
              detail: oos ? 'Clover stock is 0' : `Clover stock is ${qty}`,
            });
          }
        }
      }

      if (Object.keys(patch).length > 0) updates.push({ id: it.id, patch });
      continue;
    }

    // New to the website.
    const name = cleanName(it.name ?? '');
    if (!name) continue;
    if (!hasFixedPrice(it)) {
      report.skipped.push({ id: it.id, name, detail: 'no fixed price in Clover' });
      continue;
    }
    const cloverCategory = (it.categories?.elements ?? [])
      .map((c) => c.name.trim())
      .find((c) => topLevel.has(c));
    const category = cloverCategory ?? inferCategory(name);
    if (!category || !topLevel.has(category)) {
      report.skipped.push({ id: it.id, name, detail: 'no category in Clover' });
      continue;
    }
    const top = topLevel.get(category)!;
    const outOfStock = qty === null ? false : qty <= 0;
    inserts.push({
      id: it.id,
      name,
      description: `${name}. Available at Top Rated Cards & Collectibles in Windsor, CA.`,
      price: it.price! / 100,
      image: PLACEHOLDER_IMAGE,
      image_representative: true,
      category_id: category,
      quantity: qty ?? 0,
      is_sealed: top === 'sports' || top === 'tcg',
      is_out_of_stock: outOfStock,
    });
    report.added.push({
      id: it.id,
      name,
      detail: `${category} · ${money(it.price! / 100)}${outOfStock ? ' · out of stock' : ''}`,
    });
  }

  const cloverIds = new Set(items.map((it) => it.id));
  report.websiteOnly = [...products.keys()].filter((id) => !cloverIds.has(id)).length;

  if (apply) {
    // Partial updates can't go through upsert (it would need every NOT NULL
    // column), so update row by row in small parallel batches.
    for (let i = 0; i < updates.length; i += 20) {
      const results = await Promise.all(
        updates.slice(i, i + 20).map((u) => supabase.from('products').update(u.patch).eq('id', u.id))
      );
      const failed = results.find((r) => r.error);
      if (failed?.error) throw new Error(`Update failed: ${failed.error.message}`);
    }
    if (inserts.length > 0) {
      const { error } = await supabase.from('products').insert(inserts);
      if (error) throw new Error(`Adding new products failed: ${error.message}`);
    }
  }

  return report;
}
