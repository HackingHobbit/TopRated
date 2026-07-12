'use server';

// Admin-only actions for the Clover Integrations page: read masked status,
// save settings, and run a Test Connection. Secrets are only overwritten when
// a non-empty value is supplied, so re-saving from the (masked) form never
// wipes stored tokens.

import { assertAdmin } from './auth-guard';
import { getSupabaseAdmin } from './supabase/admin';
import { getCloverClient, getCloverSettingsMasked } from './clover';
import { LiveCloverClient } from './clover/live';
import { MockCloverClient } from './clover/mock';
import type {
  CloverConnResult,
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
