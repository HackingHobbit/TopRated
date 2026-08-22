import 'server-only';

import { getSupabaseAdmin } from '../supabase/admin';
import { MockCloverClient } from './mock';
import { LiveCloverClient } from './live';
import { DEFAULT_CLOVER_SETTINGS, type CloverSettings, type CloverClient } from './types';

// Reads the single-row clover_settings table (see migration 0004). If the table
// doesn't exist yet, or no service key is configured, we fall back to the
// phantom (mock) — so the app works out of the box and the migration is purely
// an enhancement that unlocks the persistent admin toggle.
export async function loadCloverSettings(): Promise<CloverSettings> {
  const s: CloverSettings = { ...DEFAULT_CLOVER_SETTINGS };
  const admin = getSupabaseAdmin();
  if (admin) {
    try {
      const { data } = await admin
        .from('clover_settings')
        .select('mode, environment, merchant_id, api_token, ecomm_public_key, ecomm_private_key')
        .eq('id', 'default')
        .maybeSingle();
      if (data) {
        s.mode = data.mode === 'live' ? 'live' : 'mock';
        s.environment = data.environment === 'production' ? 'production' : 'sandbox';
        s.merchantId = data.merchant_id || '';
        s.apiToken = data.api_token || '';
        s.ecommPublicKey = data.ecomm_public_key || '';
        s.ecommPrivateKey = data.ecomm_private_key || '';
      }
    } catch {
      /* table absent → keep mock defaults */
    }
  }
  // Optional: keep secrets in env instead of the DB (used if the DB field is blank).
  s.apiToken = s.apiToken || process.env.CLOVER_API_TOKEN || '';
  s.ecommPrivateKey = s.ecommPrivateKey || process.env.CLOVER_ECOMM_PRIVATE_KEY || '';
  return s;
}

export function isLiveReady(s: CloverSettings): boolean {
  return s.mode === 'live' && Boolean(s.merchantId) && Boolean(s.apiToken);
}

/** The client the app should use right now (mock unless fully configured + live). */
export async function getCloverClient(): Promise<CloverClient> {
  const s = await loadCloverSettings();
  return isLiveReady(s) ? new LiveCloverClient(s) : new MockCloverClient();
}

async function cloverTableReady(): Promise<boolean> {
  const admin = getSupabaseAdmin();
  if (!admin) return false;
  try {
    const { error } = await admin.from('clover_settings').select('id').limit(1);
    return !error;
  } catch {
    return false;
  }
}

/** Non-secret snapshot for the admin Integrations UI (tokens masked). */
export async function getCloverSettingsMasked() {
  const s = await loadCloverSettings();
  const mask = (v: string) => (v ? `••••••••${v.slice(-4)}` : '');
  return {
    mode: s.mode,
    environment: s.environment,
    merchantId: s.merchantId,
    ecommPublicKey: s.ecommPublicKey,
    apiTokenMasked: mask(s.apiToken),
    ecommPrivateKeyMasked: mask(s.ecommPrivateKey),
    hasApiToken: Boolean(s.apiToken),
    hasEcommPrivateKey: Boolean(s.ecommPrivateKey),
    effectiveMode: isLiveReady(s) ? 'live' : 'mock',
    tableReady: await cloverTableReady(),
  };
}
