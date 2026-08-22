'use server';

// Saved (vaulted) cards. Reading/deleting a customer's own saved cards goes
// through the normal session client — RLS covers it. But rows are only ever
// INSERTED by the service-role client, from inside placeOrder's own
// vaulting flow (lib/orderActions.ts), right after Clover confirms a card
// was actually saved. There's no path for a browser to insert a fake
// "saved card" row.

import { getCurrentUser, getSupabaseServer } from './supabase/server';
import { getCloverClient } from './clover';

export interface SavedCard {
  id: string;
  brand: string;
  last4: string;
  expMonth: number | null;
  expYear: number | null;
  isDefault: boolean;
}

export async function listMyPaymentMethods(): Promise<SavedCard[]> {
  const user = await getCurrentUser();
  if (!user) return [];
  const supabase = await getSupabaseServer();
  if (!supabase) return [];
  const { data } = await supabase
    .from('payment_methods')
    .select('id, brand, last4, exp_month, exp_year, is_default')
    .eq('customer_id', user.id)
    .order('created_at', { ascending: false });

  return ((data ?? []) as Array<{
    id: string;
    brand: string;
    last4: string;
    exp_month: number | null;
    exp_year: number | null;
    is_default: boolean;
  }>).map((r) => ({
    id: r.id,
    brand: r.brand,
    last4: r.last4,
    expMonth: r.exp_month,
    expYear: r.exp_year,
    isDefault: r.is_default,
  }));
}

export async function deletePaymentMethod(id: string): Promise<{ ok: boolean; error?: string }> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: 'Not signed in.' };
  const supabase = await getSupabaseServer();
  if (!supabase) return { ok: false, error: 'Not available.' };

  const { data: row } = await supabase
    .from('payment_methods')
    .select('id, clover_source_id')
    .eq('id', id)
    .eq('customer_id', user.id)
    .maybeSingle();
  if (!row) return { ok: false, error: 'Card not found.' };

  const { data: profile } = await supabase
    .from('profiles')
    .select('clover_customer_id')
    .eq('id', user.id)
    .maybeSingle();

  if (profile?.clover_customer_id) {
    const clover = await getCloverClient();
    // Best-effort: if Clover's side fails, still let the customer remove
    // their own saved-card record rather than getting stuck.
    await clover.deleteStoredCard(profile.clover_customer_id, row.clover_source_id);
  }

  const { error } = await supabase
    .from('payment_methods')
    .delete()
    .eq('id', id)
    .eq('customer_id', user.id);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}
