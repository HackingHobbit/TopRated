// Client-safe product faceting helpers. Pure functions, no server-only imports,
// so both Server and Client Components can use them. These power the shop
// filters (type / year / format) and the shared "single" definition.
//
// Year + format are DERIVED from the product name at read time (mirroring the
// logic in scripts/ingest_inventory.py) so we don't need a schema migration.

import type { Product } from './types';

/** Top-level product categories that represent actual trading cards. */
export const CARD_CATEGORIES = ['sports', 'tcg'] as const;

export type ProductType = 'sealed' | 'single' | 'supplies';

/**
 * The canonical product-type bucket. Resolves the long-standing "singles"
 * ambiguity: a single is a NON-sealed card (sports/tcg) — NOT a beverage,
 * accessory, or memorabilia item. Everything non-card falls under 'supplies'.
 */
export function productType(p: Product): ProductType {
  if (p.isSealed) return 'sealed';
  if ((CARD_CATEGORIES as readonly string[]).includes(p.category)) return 'single';
  return 'supplies';
}

export function isSingle(p: Product): boolean {
  return productType(p) === 'single';
}

export function isSealed(p: Product): boolean {
  return productType(p) === 'sealed';
}

/** Human labels for the three type buckets, in display order. */
export const TYPE_LABELS: Record<ProductType, string> = {
  sealed: 'Sealed Boxes',
  single: 'Singles',
  supplies: 'Supplies & Extras',
};

/**
 * Extract the release year from a (cleaned) product name. Names have already
 * been normalized by ingest to 4-digit years, e.g. "2025 Donruss …" or
 * "2023-2024 Mosaic …". Returns the leading 4-digit year, or null.
 */
export function deriveYear(name: string): string | null {
  const m = name.match(/\b(19|20)\d{2}\b/);
  return m ? m[0] : null;
}

// Product-format keywords → label. Order matters: most specific first
// (mirrors FORMAT_HINTS in scripts/ingest_inventory.py).
const FORMAT_HINTS: Array<[string, RegExp]> = [
  ['Hobby Case', /\bhobby case\b/i],
  ['Hobby Box', /\bhobby box\b/i],
  ['Booster Box', /\bbooster box\b/i],
  ['Blaster', /\bblaster\b/i],
  ['Mega Box', /\bmega box\b/i],
  ['Jumbo', /\bjumbo\b/i],
  ['Elite Trainer Box', /\b(elite trainer box|etb)\b/i],
  ['Tin', /\btin\b/i],
  ['Collection', /\bcollection\b/i],
  ['Bundle', /\bbundle\b/i],
  ['Booster Pack', /\b(booster pack|booster bundle|booster)\b/i],
  ['Case', /\bcase\b/i],
  ['Calendar', /\bcalendar\b/i],
];

/** Best-guess retail format for a product, or null if none is evident. */
export function deriveFormat(name: string): string | null {
  for (const [label, re] of FORMAT_HINTS) {
    if (re.test(name)) return label;
  }
  return null;
}
