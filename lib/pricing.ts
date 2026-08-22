// Shared checkout pricing constants. Client-safe (no server-only imports) so
// the checkout page can mirror exactly what `placeOrder` charges server-side.

export const PER_ITEM_LIMIT = 3;
export const FREE_SHIPPING_THRESHOLD = 300;
export const FLAT_SHIPPING = 9.99;

// Flat rate for our single Windsor, CA storefront/shipping origin. Revisit
// (per-address calculation) if we ever ship from or tax other jurisdictions.
export const TAX_RATE = 0.0925;

export function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
