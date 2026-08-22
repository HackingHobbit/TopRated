'use server';

// Address book: stored as the `addresses` jsonb array already on
// public.profiles (migration 0001). Ordinary self-serve data — RLS's
// existing "profiles self update" policy already covers this, so these
// actions use the normal session client, no service-role needed.

import { randomUUID } from 'crypto';
import { getCurrentUser, getSupabaseServer } from './supabase/server';

export interface SavedAddress {
  id: string;
  label: string;
  fullName: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  isDefault: boolean;
}

export type SavedAddressInput = Omit<SavedAddress, 'id' | 'isDefault'> & {
  id?: string;
  isDefault?: boolean;
};

async function loadAddresses(): Promise<{
  userId: string;
  addresses: SavedAddress[];
} | null> {
  const user = await getCurrentUser();
  if (!user) return null;
  const supabase = await getSupabaseServer();
  if (!supabase) return null;
  const { data } = await supabase
    .from('profiles')
    .select('addresses')
    .eq('id', user.id)
    .maybeSingle();
  return { userId: user.id, addresses: (data?.addresses as SavedAddress[]) ?? [] };
}

export async function listMyAddresses(): Promise<SavedAddress[]> {
  const loaded = await loadAddresses();
  return loaded?.addresses ?? [];
}

export async function saveAddress(
  input: SavedAddressInput
): Promise<{ ok: boolean; error?: string }> {
  const loaded = await loadAddresses();
  if (!loaded) return { ok: false, error: 'Not signed in.' };
  const supabase = await getSupabaseServer();
  if (!supabase) return { ok: false, error: 'Not available.' };

  const id = input.id ?? randomUUID();
  const nextEntry: SavedAddress = { ...input, id, isDefault: Boolean(input.isDefault) };

  let addresses = loaded.addresses.filter((a) => a.id !== id);
  if (nextEntry.isDefault) {
    addresses = addresses.map((a) => ({ ...a, isDefault: false }));
  }
  addresses = [...addresses, nextEntry];
  // If this is the customer's only address, make it the default regardless.
  if (addresses.length === 1) addresses[0] = { ...addresses[0], isDefault: true };

  const { error } = await supabase
    .from('profiles')
    .update({ addresses })
    .eq('id', loaded.userId);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function deleteAddress(id: string): Promise<{ ok: boolean; error?: string }> {
  const loaded = await loadAddresses();
  if (!loaded) return { ok: false, error: 'Not signed in.' };
  const supabase = await getSupabaseServer();
  if (!supabase) return { ok: false, error: 'Not available.' };

  const wasDefault = loaded.addresses.find((a) => a.id === id)?.isDefault;
  let addresses = loaded.addresses.filter((a) => a.id !== id);
  if (wasDefault && addresses.length > 0) {
    addresses = addresses.map((a, i) => ({ ...a, isDefault: i === 0 }));
  }

  const { error } = await supabase
    .from('profiles')
    .update({ addresses })
    .eq('id', loaded.userId);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function getMyProfile(): Promise<{ name: string; phone: string } | null> {
  const user = await getCurrentUser();
  if (!user) return null;
  const supabase = await getSupabaseServer();
  if (!supabase) return null;
  const { data } = await supabase
    .from('profiles')
    .select('name, phone')
    .eq('id', user.id)
    .maybeSingle();
  if (!data) return null;
  return { name: data.name ?? '', phone: data.phone ?? '' };
}

export async function updateMyProfile(
  input: { name: string; phone: string }
): Promise<{ ok: boolean; error?: string }> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: 'Not signed in.' };
  const supabase = await getSupabaseServer();
  if (!supabase) return { ok: false, error: 'Not available.' };
  const { error } = await supabase
    .from('profiles')
    .update({ name: input.name, phone: input.phone })
    .eq('id', user.id);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}
