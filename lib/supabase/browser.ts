'use client';

import { createBrowserClient } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';
import {
  SUPABASE_ANON_KEY,
  SUPABASE_URL,
  supabaseConfigured,
} from './env';

// Singleton browser client. We construct lazily on first use so that
// modules importing this file don't have to pay for it at module-init
// time (and so server-rendered components don't accidentally instantiate
// a browser client).
let cached: SupabaseClient | null | undefined;

/**
 * Get the Supabase client to use from Client Components.
 *
 * Returns `null` when Supabase env vars are missing — callers should
 * branch on that and degrade to the local mock/demo state.
 */
export function getSupabaseBrowser(): SupabaseClient | null {
  if (cached !== undefined) return cached;
  if (!supabaseConfigured()) {
    cached = null;
    return cached;
  }
  cached = createBrowserClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  return cached;
}
