import { notFound, redirect } from 'next/navigation';
import AdminNav from './AdminNav';
import styles from './page.module.css';
import { supabaseConfigured } from '@/lib/supabase/env';
import { getCurrentRole } from '@/lib/supabase/server';

/**
 * Shared admin shell. The sidebar lives here so the four admin routes
 * don't each ship their own copy.
 *
 * Access control, in priority order:
 *
 *  1. Supabase configured → real gate. Logged-out users are bounced to
 *     /login (with ?redirect=/admin so they return after sign-in);
 *     non-admin profiles are bounced to /account.
 *
 *  2. Supabase NOT configured, in production → fail safe. There is no way
 *     to verify an admin without an auth backend, so the portal must not
 *     be browsable at all. We 404 rather than render it open. This mirrors
 *     assertAdmin() in lib/actions.ts, which already throws on admin
 *     mutations in this state. (A redirect to /login can't be used here:
 *     login runs in mock mode when Supabase is absent, so it would just
 *     loop back to /admin.)
 *
 *  3. Supabase NOT configured, in development → the local mock demo. The
 *     gate is skipped so /admin stays reachable while you work through
 *     SUPABASE_SETUP.md.
 */
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  if (supabaseConfigured()) {
    const role = await getCurrentRole();
    if (role === null) {
      redirect('/login?redirect=/admin');
    }
    if (role !== 'admin') {
      redirect('/account');
    }
  } else if (process.env.NODE_ENV === 'production') {
    notFound();
  }

  return (
    <div className={`container ${styles.adminContainer}`}>
      <AdminNav />
      <main className={styles.mainContent}>{children}</main>
    </div>
  );
}
