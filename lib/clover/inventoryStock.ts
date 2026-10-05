import 'server-only';

// Keeps the store's REAL Clover stock counts in step with online sales.
// Clover does not lower stock for ecommerce orders (verified on the test
// account and stated in Clover's docs), so after an online order is paid we
// lower each item's count ourselves, and put it back when staff cancel or
// refund the order.
//
// Uses the inventory-sync credentials (Admin → Integrations → Inventory sync),
// which always point at the real account. Callers only use this when payments
// are on the real account too, so test orders never touch real stock.
//
// Each adjustment is logged in inventory_transactions with reason
// 'clover_sale' / 'clover_restock' (delta = the change made in Clover), so a
// restock only ever reverses what an order actually took.

import type { SupabaseClient } from '@supabase/supabase-js';

const CLOVER_API = 'https://api.clover.com';

export interface StockChange {
  productId: string;
  /** Negative = sold, positive = returned to stock. */
  delta: number;
}

export async function adjustCloverStock(
  admin: SupabaseClient,
  changes: StockChange[],
  reason: 'clover_sale' | 'clover_restock',
  referenceId: string,
  createdBy: string | null
): Promise<{ adjusted: number; errors: string[] }> {
  const errors: string[] = [];
  const { data: cs } = await admin
    .from('clover_settings')
    .select('inventory_merchant_id, inventory_api_token')
    .eq('id', 'default')
    .maybeSingle();
  const merchantId = (cs?.inventory_merchant_id as string) || '';
  const token = (cs?.inventory_api_token as string) || '';
  if (!merchantId || !token) return { adjusted: 0, errors: ['Inventory sync credentials not set.'] };

  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
  const base = `${CLOVER_API}/v3/merchants/${encodeURIComponent(merchantId)}/item_stocks`;
  let adjusted = 0;

  for (const c of changes) {
    if (!c.delta) continue;
    try {
      const url = `${base}/${encodeURIComponent(c.productId)}`;
      const res = await fetch(url, { headers, signal: AbortSignal.timeout(10_000), cache: 'no-store' });
      // 404 = not a Clover item (e.g. a website-only single) or stock isn't
      // tracked for it in Clover — nothing to adjust.
      if (res.status === 404) continue;
      if (!res.ok) {
        errors.push(`${c.productId}: Clover returned ${res.status}`);
        continue;
      }
      const current = await res.json();
      if (typeof current.quantity !== 'number') continue;
      const next = Math.max(0, Math.floor(current.quantity) + c.delta);
      const applied = next - Math.floor(current.quantity);
      const put = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify({ quantity: next }),
        signal: AbortSignal.timeout(10_000),
      });
      if (!put.ok) {
        errors.push(`${c.productId}: Clover update returned ${put.status}`);
        continue;
      }
      adjusted++;
      await admin.from('inventory_transactions').insert({
        product_id: c.productId,
        delta: applied,
        reason,
        reference_id: referenceId,
        created_by: createdBy,
      });
    } catch (e) {
      errors.push(`${c.productId}: ${e instanceof Error ? e.message : 'error'}`);
    }
  }
  return { adjusted, errors };
}
