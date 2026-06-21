import 'server-only';

import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE_URL } from './env';

/**
 * Service-role Supabase client for TRUSTED server-side admin operations that
 * the normal cookie session can't do — creating, deleting, or banning
 * auth.users via the Admin API.
 *
 * SECURITY:
 *  - Reads SUPABASE_SERVICE_ROLE_KEY, a SERVER-ONLY env var. It must NOT be
 *    prefixed NEXT_PUBLIC and must never reach the browser bundle. This file
 *    is `server-only`, so importing it from a Client Component is a build
 *    error by design.
 *  - The key bypasses RLS, so every caller MUST gate on assertAdmin() first.
 *
 * Returns null when the key isn't configured (e.g. local dev without it set),
 * so callers can degrade gracefully instead of crashing.
 */
export function getSupabaseAdmin(): SupabaseClient | null {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!SUPABASE_URL || !serviceKey) return null;
  return createClient(SUPABASE_URL, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

/** True when the service-role key is available for Admin API calls. */
export function adminApiConfigured(): boolean {
  return Boolean(SUPABASE_URL) && Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY);
}
