'use server';

// Admin user-management actions. Every export is a browser-callable POST RPC,
// so each one calls assertAdmin() first.
//
//  - Role/profile edits go through the cookie SESSION client (the admin's JWT),
//    so the profiles privileged-column trigger (0002) sees is_admin() = true.
//  - Creating / deleting login accounts uses the Admin API, which needs the
//    SERVICE-ROLE client (server-only secret key). Those degrade with a clear
//    error if the key isn't configured.

import { revalidatePath } from 'next/cache';
import { getSupabaseServer, getCurrentUser } from './supabase/server';
import { getSupabaseAdmin } from './supabase/admin';
import { assertAdmin } from './auth-guard';

export interface ActionResult {
  ok: boolean;
  error?: string;
}

type Role = 'admin' | 'customer';

async function adminCount(): Promise<number> {
  const supabase = await getSupabaseServer();
  if (!supabase) return 0;
  const { count } = await supabase
    .from('profiles')
    .select('id', { count: 'exact', head: true })
    .eq('role', 'admin');
  return count ?? 0;
}

export async function setUserRole(
  userId: string,
  role: Role
): Promise<ActionResult> {
  await assertAdmin();
  try {
    const me = await getCurrentUser();
    if (me?.id === userId && role !== 'admin') {
      return { ok: false, error: "You can't remove your own admin role." };
    }
    if (role !== 'admin' && (await adminCount()) <= 1) {
      return { ok: false, error: 'Cannot demote the last remaining admin.' };
    }
    const supabase = await getSupabaseServer();
    if (!supabase) return { ok: false, error: 'Supabase unavailable.' };
    const { error } = await supabase
      .from('profiles')
      .update({ role })
      .eq('id', userId);
    if (error) return { ok: false, error: error.message };
    revalidatePath('/admin/users');
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Failed.' };
  }
}

export async function updateUserProfile(
  userId: string,
  updates: { name?: string; loyaltyPoints?: number }
): Promise<ActionResult> {
  await assertAdmin();
  try {
    const supabase = await getSupabaseServer();
    if (!supabase) return { ok: false, error: 'Supabase unavailable.' };
    const row: Record<string, unknown> = {};
    if (updates.name !== undefined) row.name = updates.name;
    if (updates.loyaltyPoints !== undefined)
      row.loyalty_points = updates.loyaltyPoints;
    const { error } = await supabase
      .from('profiles')
      .update(row)
      .eq('id', userId);
    if (error) return { ok: false, error: error.message };
    revalidatePath('/admin/users');
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Failed.' };
  }
}

export async function createUser(input: {
  email: string;
  password: string;
  name: string;
  role: Role;
}): Promise<ActionResult> {
  await assertAdmin();
  try {
    const admin = getSupabaseAdmin();
    if (!admin) {
      return {
        ok: false,
        error:
          'Creating accounts needs SUPABASE_SERVICE_ROLE_KEY configured on the server.',
      };
    }
    const { data, error } = await admin.auth.admin.createUser({
      email: input.email,
      password: input.password,
      email_confirm: true, // admin-created accounts are pre-confirmed
      user_metadata: { name: input.name },
    });
    if (error) return { ok: false, error: error.message };

    // The on_auth_user_created trigger makes the profile; promote if needed.
    if (input.role === 'admin' && data.user) {
      const { error: rErr } = await admin
        .from('profiles')
        .update({ role: 'admin' })
        .eq('id', data.user.id);
      if (rErr) return { ok: false, error: rErr.message };
    }
    revalidatePath('/admin/users');
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Failed.' };
  }
}

export async function deleteUser(userId: string): Promise<ActionResult> {
  await assertAdmin();
  try {
    const me = await getCurrentUser();
    if (me?.id === userId) {
      return { ok: false, error: "You can't delete your own account here." };
    }
    const admin = getSupabaseAdmin();
    if (!admin) {
      return {
        ok: false,
        error:
          'Deleting accounts needs SUPABASE_SERVICE_ROLE_KEY configured on the server.',
      };
    }
    // Don't allow removing the last admin.
    const supabase = await getSupabaseServer();
    const { data: target } = await supabase!
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .maybeSingle();
    if (target?.role === 'admin' && (await adminCount()) <= 1) {
      return { ok: false, error: 'Cannot delete the last remaining admin.' };
    }
    const { error } = await admin.auth.admin.deleteUser(userId);
    if (error) return { ok: false, error: error.message };
    revalidatePath('/admin/users');
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Failed.' };
  }
}

export async function sendPasswordReset(email: string): Promise<ActionResult> {
  await assertAdmin();
  try {
    const supabase = await getSupabaseServer();
    if (!supabase) return { ok: false, error: 'Supabase unavailable.' };
    const { error } = await supabase.auth.resetPasswordForEmail(email);
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Failed.' };
  }
}
