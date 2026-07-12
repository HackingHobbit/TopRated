'use server';

// Checkout / order persistence. This is a PUBLIC action (guests can order),
// so it must never trust client-supplied prices — it re-reads authoritative
// prices from the DB and computes every total server-side. Writes go through
// the service-role client (after server-side validation) so guest orders work
// regardless of RLS; the customer is linked when logged in.

import { randomUUID } from 'crypto';
import { revalidatePath } from 'next/cache';
import { getSupabaseAdmin } from './supabase/admin';
import { getCurrentUser } from './supabase/server';
import { getCloverClient } from './clover';
import { assertAdmin } from './auth-guard';

const PER_ITEM_LIMIT = 3;
const FREE_SHIPPING_THRESHOLD = 300;
const FLAT_SHIPPING = 9.99;

export interface CheckoutItem {
  productId: string;
  quantity: number;
}

export interface ShippingDetails {
  fullName: string;
  address: string;
  city: string;
  state: string;
  zip: string;
}

export interface PlaceOrderResult {
  ok: boolean;
  orderNumber?: string;
  total?: number;
  error?: string;
  /** Clover charge id (mock_ch_… in phantom mode). */
  chargeId?: string;
  paymentMode?: 'mock' | 'live';
}

function orderNumber(prefix = 'TR'): string {
  return `${prefix}-${randomUUID().replace(/-/g, '').slice(0, 6).toUpperCase()}`;
}

export async function placeOrder(
  items: CheckoutItem[],
  shipping: ShippingDetails
): Promise<PlaceOrderResult> {
  if (!items || items.length === 0) {
    return { ok: false, error: 'Your cart is empty.' };
  }

  const supabase = getSupabaseAdmin();

  // Fallback: no service-role key (e.g. local demo without it) — behave like
  // the old mock so checkout still completes, but don't persist anything.
  if (!supabase) {
    return { ok: true, orderNumber: orderNumber() };
  }

  try {
    // Clamp quantities to the per-item limit and de-dupe ids.
    const wanted = new Map<string, number>();
    for (const it of items) {
      const q = Math.min(PER_ITEM_LIMIT, Math.max(1, Math.floor(it.quantity)));
      wanted.set(it.productId, Math.min(PER_ITEM_LIMIT, (wanted.get(it.productId) ?? 0) + q));
    }
    const ids = [...wanted.keys()];

    // Authoritative product data (price/name/quantity) straight from the DB.
    const { data: products, error: pErr } = await supabase
      .from('products')
      .select('id, name, price, quantity')
      .in('id', ids);
    if (pErr) return { ok: false, error: pErr.message };
    if (!products || products.length === 0) {
      return { ok: false, error: 'None of the items could be found.' };
    }

    const lineItems = products.map((p: {
      id: string;
      name: string;
      price: number | string;
      quantity: number;
    }) => {
      const qty = wanted.get(p.id) ?? 1;
      const unit = Number(p.price);
      return {
        product_id: p.id,
        product_name: p.name,
        unit_price: unit,
        quantity: qty,
        currentQty: p.quantity ?? 0,
        lineTotal: unit * qty,
      };
    });

    const subtotal = round2(lineItems.reduce((s, l) => s + l.lineTotal, 0));
    const shippingCost = subtotal >= FREE_SHIPPING_THRESHOLD ? 0 : FLAT_SHIPPING;
    const tax = 0; // Real tax calc lands in Phase A3.
    const total = round2(subtotal + shippingCost + tax);

    const user = await getCurrentUser();

    // Payment through the Clover abstraction: phantom (simulated) in mock mode,
    // a real Ecommerce charge in live mode. Order creation is gated on success.
    // Mock orders get a DEMO- number so they can be bulk-cleaned from the
    // admin dashboard (real orders use TR-).
    const clover = await getCloverClient();
    const number = orderNumber(clover.mode === 'mock' ? 'DEMO' : 'TR');
    const charge = await clover.createCharge({
      amountCents: Math.round(total * 100),
      orderNumber: number,
    });
    if (!charge.ok) {
      return { ok: false, error: charge.error || 'Payment could not be processed.' };
    }

    const { data: order, error: oErr } = await supabase
      .from('orders')
      .insert({
        order_number: number,
        customer_id: user?.id ?? null,
        // Payment succeeded (mock or live) by the time we reach here, so the
        // order is paid and moves into fulfillment.
        status: 'processing',
        subtotal,
        tax,
        shipping: shippingCost,
        total,
        shipping_address: shipping,
        clover_order_id: charge.chargeId ?? null,
      })
      .select('id')
      .single();
    if (oErr) return { ok: false, error: oErr.message };

    const orderId = order.id as string;

    const { error: iErr } = await supabase.from('order_items').insert(
      lineItems.map((l) => ({
        order_id: orderId,
        product_id: l.product_id,
        product_name: l.product_name,
        unit_price: l.unit_price,
        quantity: l.quantity,
      }))
    );
    if (iErr) return { ok: false, error: iErr.message };

    // Audit + best-effort stock decrement (floored at 0). We intentionally do
    // NOT auto-flip is_out_of_stock, because seeded quantities aren't reliable
    // yet — stock status stays admin-managed until real quantities are set.
    await supabase.from('inventory_transactions').insert(
      lineItems.map((l) => ({
        product_id: l.product_id,
        delta: -l.quantity,
        reason: 'sale',
        reference_id: number,
        created_by: user?.id ?? null,
      }))
    );
    await Promise.all(
      lineItems.map((l) =>
        supabase
          .from('products')
          .update({ quantity: Math.max(0, l.currentQty - l.quantity) })
          .eq('id', l.product_id)
      )
    );

    revalidatePath('/account');
    revalidatePath('/admin');
    revalidatePath('/admin/orders');
    return {
      ok: true,
      orderNumber: number,
      total,
      chargeId: charge.chargeId,
      paymentMode: clover.mode,
    };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Order failed.' };
  }
}

/**
 * Bulk-delete demo orders (those with a DEMO- number, created by the phantom
 * Clover in mock mode). Admin-only. Never touches real (TR-) orders.
 * order_items cascade on delete; inventory_transactions are matched by the
 * order number (reference_id) and removed too.
 */
export async function deleteDemoOrders(): Promise<{
  ok: boolean;
  deleted?: number;
  error?: string;
}> {
  await assertAdmin();
  const supabase = getSupabaseAdmin();
  if (!supabase) return { ok: false, error: 'Supabase service key not configured.' };
  try {
    const { data: demo, error: qErr } = await supabase
      .from('orders')
      .select('id, order_number')
      .like('order_number', 'DEMO-%');
    if (qErr) return { ok: false, error: qErr.message };
    if (!demo || demo.length === 0) return { ok: true, deleted: 0 };

    const ids = demo.map((o: { id: string }) => o.id);
    const numbers = demo.map((o: { order_number: string }) => o.order_number);

    await supabase.from('inventory_transactions').delete().in('reference_id', numbers);
    const { error: dErr } = await supabase.from('orders').delete().in('id', ids);
    if (dErr) return { ok: false, error: dErr.message };

    revalidatePath('/admin');
    revalidatePath('/admin/orders');
    return { ok: true, deleted: ids.length };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Failed.' };
  }
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
