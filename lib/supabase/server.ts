import 'server-only';

import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';
import type { SupabaseClient } from '@supabase/supabase-js';
import {
  SUPABASE_ANON_KEY,
  SUPABASE_URL,
  supabaseConfigured,
} from './env';

/**
 * Build a cookie-aware Supabase client for use in Server Components,
 * Server Actions, and Route Handlers. The session lives in HttpOnly
 * cookies — the SSR helper handles read/write through the Next.js
 * `cookies()` API.
 *
 * Returns `null` when Supabase env vars are missing.
 */
export async function getSupabaseServer(): Promise<SupabaseClient | null> {
  if (!supabaseConfigured()) return null;
  const cookieStore = await cookies();

  return createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(items) {
        // Server Components can't write cookies. We swallow the error
        // here because proxy.ts is responsible for refreshing the session
        // before a Server Component ever sees the request. If the cookie
        // really needs to change (e.g. inside a Server Action), the
        // Action will run setAll inside a context that allows writes.
        try {
          for (const { name, value, options } of items) {
            cookieStore.set(name, value, options as CookieOptions);
          }
        } catch {
          /* readonly cookie context — proxy.ts will refresh on the next nav */
        }
      },
    },
  });
}

/**
 * Return the current Supabase user from the cookie session, or `null`
 * when not logged in / not configured.
 */
export async function getCurrentUser() {
  const supabase = await getSupabaseServer();
  if (!supabase) return null;
  const { data } = await supabase.auth.getUser();
  return data.user;
}

/**
 * Look up the role attached to the currently-logged-in user in
 * `public.profiles`. Returns `null` when nobody is logged in.
 */
export async function getCurrentRole(): Promise<'admin' | 'customer' | null> {
  const supabase = await getSupabaseServer();
  if (!supabase) return null;
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return null;
  const { data, error } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', userData.user.id)
    .single();
  if (error || !data) return 'customer';
  return data.role === 'admin' ? 'admin' : 'customer';
}
