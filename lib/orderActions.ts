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
}

function orderNumber(): string {
  return `TR-${randomUUID().replace(/-/g, '').slice(0, 6).toUpperCase()}`;
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
    const number = orderNumber();

    const { data: order, error: oErr } = await supabase
      .from('orders')
      .insert({
        order_number: number,
        customer_id: user?.id ?? null,
        status: 'pending', // becomes 'processing' once real payment lands (A2)
        subtotal,
        tax,
        shipping: shippingCost,
        total,
        shipping_address: shipping,
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
    return { ok: true, orderNumber: number, total };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Order failed.' };
  }
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
