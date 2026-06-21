import { getAllUsers } from '@/lib/db';
import { getCurrentUser } from '@/lib/supabase/server';
import { adminApiConfigured } from '@/lib/supabase/admin';
import UsersClient from './UsersClient';
import adminStyles from '../page.module.css';

export default async function AdminUsersPage() {
  const [users, me] = await Promise.all([getAllUsers(), getCurrentUser()]);

  return (
    <>
      <div className={adminStyles.header}>
        <h1>User &amp; Staff Management</h1>
      </div>
      <UsersClient
        initialUsers={users}
        currentUserId={me?.id ?? null}
        canCreateDelete={adminApiConfigured()}
      />
    </>
  );
}
