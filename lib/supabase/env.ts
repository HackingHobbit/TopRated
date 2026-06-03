// Shared helpers for Supabase env vars. Both the server and browser clients
// rely on these — they return null when the project hasn't been configured,
// which lets the rest of the app fall back to the JSON / mock-auth demo
// behaviour while you're still setting Supabase up (see SUPABASE_SETUP.md).

export const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
export const SUPABASE_ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';

/** True when both public Supabase env vars look populated. */
export function supabaseConfigured(): boolean {
  return Boolean(SUPABASE_URL) && Boolean(SUPABASE_ANON_KEY);
}
