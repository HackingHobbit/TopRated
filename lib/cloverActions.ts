'use server';

// Admin-only actions for the Clover Integrations page: read masked status,
// save settings, and run a Test Connection. Secrets are only overwritten when
// a non-empty value is supplied, so re-saving from the (masked) form never
// wipes stored tokens.

import { revalidatePath } from 'next/cache';
import { assertAdmin } from './auth-guard';
import { getSupabaseAdmin } from './supabase/admin';
import { getCloverClient, getCloverSettingsMasked, isLiveReady, loadCloverSettings } from './clover';
import { LiveCloverClient } from './clover/live';
import { MockCloverClient } from './clover/mock';
import { runInventorySync, type InventorySyncReport } from './clover/inventorySync';
import type {
  CloverConnResult,
  CloverEnv,
  CloverMode,
  CloverSettings,
  CloverStatus,
  SaveCloverInput,
} from './clover/types';

export async function getCloverStatus(): Promise<CloverStatus> {
  await assertAdmin();
  return getCloverSettingsMasked();
}

export async function saveCloverSettings(
  input: SaveCloverInput
): Promise<{ ok: boolean; error?: string }> {
  await assertAdmin();
  const admin = getSupabaseAdmin();
  if (!admin) return { ok: false, error: 'Supabase service key not configured.' };

  const row: Record<string, unknown> = {
    id: 'default',
    mode: input.mode === 'live' ? 'live' : 'mock',
    environment: input.environment === 'production' ? 'production' : 'sandbox',
    merchant_id: input.merchantId || '',
    ecomm_public_key: input.ecommPublicKey || '',
  };
  if (input.apiToken) row.api_token = input.apiToken;
  if (input.ecommPrivateKey) row.ecomm_private_key = input.ecommPrivateKey;

  const { error } = await admin.from('clover_settings').upsert(row, { onConflict: 'id' });
  if (error) {
    const hint = /relation .*clover_settings.* does not exist/i.test(error.message)
      ? ' — apply migration 0004_integration_settings.sql first.'
      : '';
    return { ok: false, error: error.message + hint };
  }
  return { ok: true };
}

/** Test either the just-entered form values (if creds provided) or saved settings. */
export async function testCloverConnection(input?: SaveCloverInput): Promise<CloverConnResult> {
  await assertAdmin();
  if (input) {
    if (input.mode === 'mock') return new MockCloverClient().testConnection();
    if (input.mode === 'live' && input.merchantId && input.apiToken) {
      const s: CloverSettings = {
        mode: 'live',
        environment: input.environment,
        merchantId: input.merchantId,
        apiToken: input.apiToken,
        ecommPublicKey: input.ecommPublicKey || '',
        ecommPrivateKey: input.ecommPrivateKey || '',
      };
      return new LiveCloverClient(s).testConnection();
    }
  }
  // Fall back to whatever is saved/active.
  return (await getCloverClient()).testConnection();
}

export interface CloverCheckoutConfig {
  /** 'live' only when fully configured for client-side tokenization too. */
  mode: CloverMode;
  environment: CloverEnv;
  merchantId: string;
  ecommPublicKey: string;
}

/**
 * PUBLIC (no admin gate) — the checkout page needs this before the customer
 * logs in. Only ever returns non-secret fields: a merchant ID and an
 * Ecommerce PUBLIC key are meant to be used in the browser (that's what the
 * Clover hosted-iframe SDK tokenizes with). No API token or private key here.
 */
export async function getCloverCheckoutConfig(): Promise<CloverCheckoutConfig> {
  const s = await loadCloverSettings();
  const live = isLiveReady(s) && Boolean(s.ecommPublicKey);
  return {
    mode: live ? 'live' : 'mock',
    environment: s.environment,
    merchantId: s.merchantId,
    ecommPublicKey: s.ecommPublicKey,
  };
}

// ---- Inventory sync from the store's real Clover account ----

export interface InventorySyncStatus {
  tableReady: boolean;
  merchantId: string;
  hasToken: boolean;
  tokenMasked: string;
  syncedAt: string | null;
}

async function loadInventorySyncSettings() {
  const admin = getSupabaseAdmin();
  if (!admin) throw new Error('Supabase service key not configured.');
  const { data, error } = await admin
    .from('clover_settings')
    .select('inventory_merchant_id, inventory_api_token, inventory_synced_at')
    .eq('id', 'default')
    .maybeSingle();
  if (error) throw new Error(error.message);
  return {
    admin,
    merchantId: (data?.inventory_merchant_id as string) || '',
    token: (data?.inventory_api_token as string) || '',
    syncedAt: (data?.inventory_synced_at as string | null) ?? null,
  };
}

export async function getInventorySyncStatus(): Promise<InventorySyncStatus> {
  await assertAdmin();
  try {
    const s = await loadInventorySyncSettings();
    return {
      tableReady: true,
      merchantId: s.merchantId,
      hasToken: Boolean(s.token),
      tokenMasked: s.token ? `••••••••${s.token.slice(-4)}` : '',
      syncedAt: s.syncedAt,
    };
  } catch {
    return { tableReady: false, merchantId: '', hasToken: false, tokenMasked: '', syncedAt: null };
  }
}

export async function saveInventorySyncSettings(input: {
  merchantId: string;
  apiToken?: string;
}): Promise<{ ok: boolean; error?: string }> {
  await assertAdmin();
  const admin = getSupabaseAdmin();
  if (!admin) return { ok: false, error: 'Supabase service key not configured.' };
  const row: Record<string, unknown> = { inventory_merchant_id: input.merchantId.trim() };
  if (input.apiToken?.trim()) row.inventory_api_token = input.apiToken.trim();
  const { error } = await admin.from('clover_settings').update(row).eq('id', 'default');
  if (error) {
    const hint = /inventory_/.test(error.message) ? ' — apply migration 0009_clover_inventory_sync.sql first.' : '';
    return { ok: false, error: error.message + hint };
  }
  return { ok: true };
}

/** Dry run (apply = false) reports what would change; apply = true writes it. */
export async function syncInventoryFromClover(
  apply: boolean
): Promise<{ ok: boolean; report?: InventorySyncReport; error?: string }> {
  await assertAdmin();
  try {
    const s = await loadInventorySyncSettings();
    if (!s.merchantId || !s.token) {
      return { ok: false, error: 'Save the merchant ID and API token first.' };
    }
    const report = await runInventorySync(s.admin, s.merchantId, s.token, apply);
    if (apply) {
      await s.admin
        .from('clover_settings')
        .update({ inventory_synced_at: new Date().toISOString() })
        .eq('id', 'default');
      revalidatePath('/', 'layout');
    }
    return { ok: true, report };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Sync failed.' };
  }
}
