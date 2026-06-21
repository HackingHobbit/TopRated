import 'server-only';

import { getCurrentRole } from './supabase/server';
import { supabaseConfigured } from './supabase/env';

/**
 * Refuse an admin action unless the caller is an admin. In Supabase mode this
 * means a logged-in user whose `profiles.role = 'admin'`. In fallback mode
 * (no Supabase configured) it throws in production and warns-through in dev so
 * the local demo keeps working. Shared by every `'use server'` action file.
 */
export async function assertAdmin(): Promise<void> {
  if (!supabaseConfigured()) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error(
        'Refusing to run admin action: Supabase is not configured.'
      );
    }
    console.warn(
      '[auth-guard] assertAdmin: Supabase not configured — allowing in dev.'
    );
    return;
  }
  const role = await getCurrentRole();
  if (role !== 'admin') {
    throw new Error('Not authorized — admin role required.');
  }
}
