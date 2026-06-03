import { redirect } from 'next/navigation';
import AdminNav from './AdminNav';
import styles from './page.module.css';
import { supabaseConfigured } from '@/lib/supabase/env';
import { getCurrentRole } from '@/lib/supabase/server';

/**
 * Shared admin shell. The sidebar lives here so the four admin routes
 * don't each ship their own copy.
 *
 * When Supabase is wired up this layout also gates access: anyone who
 * isn't logged in is bounced to /login (with ?redirect=/admin so they
 * return after sign-in), and non-admin profiles get bounced to /account.
 * Before SUPABASE_SETUP.md has been completed the gate is skipped so the
 * demo keeps working.
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
  }

  return (
    <div className={`container ${styles.adminContainer}`}>
      <AdminNav />
      <main className={styles.mainContent}>{children}</main>
    </div>
  );
}
