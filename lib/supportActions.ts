'use server';

// Customer support messaging. There is no support@ mailbox and no outbound
// email integration in this app (Supabase Auth's own mailer only handles
// password-reset/signup — see lib/supportActions.ts's sibling actions files
// for the same constraint on saved cards). So this is entirely in-app:
//
//  - Anyone (guest or signed in) can open a thread from /contact.
//  - Signed-in customers see replies — and can reply back — under
//    Account > Messages, because their thread is tied to their profile.
//  - Guest threads have no account to log back into. Admin still reads and
//    can type a reply for the internal record, but actually reaching the
//    guest is a manual follow-up using the email they typed in the form —
//    the admin UI says so plainly rather than implying an email goes out.
//
// Writes from the customer side (guest or signed-in) go through the
// service-role client after this file validates them, the same pattern
// placeOrder() uses so guest checkout works regardless of RLS. Admin reads/
// writes use the normal session client — support_threads/support_messages
// already grant admins full access via RLS (is_admin()), same as
// updateOrderStatus() does for orders.

import { revalidatePath } from 'next/cache';
import { getSupabaseAdmin } from './supabase/admin';
import { getCurrentUser, getSupabaseServer } from './supabase/server';
import { assertAdmin } from './auth-guard';
import type { SupportThread } from './types';

export interface ContactInput {
  name: string;
  email: string;
  subject: string;
  message: string;
}

export interface ContactResult {
  ok: boolean;
  error?: string;
  isGuest?: boolean;
}

/** Public: submit the /contact form. Works for guests and signed-in users. */
export async function submitContactMessage(input: ContactInput): Promise<ContactResult> {
  const name = input.name.trim();
  const email = input.email.trim();
  const subject = input.subject.trim();
  const message = input.message.trim();
  if (!name || !email || !subject || !message) {
    return { ok: false, error: 'Please fill in every field.' };
  }
  if (!email.includes('@')) {
    return { ok: false, error: 'Please enter a valid email address.' };
  }

  const supabase = getSupabaseAdmin();
  // No service-role key (e.g. local demo without it) — behave like the old
  // mock so the form still completes, but don't persist anything. Mirrors
  // the same fallback in placeOrder().
  if (!supabase) return { ok: true, isGuest: true };

  const user = await getCurrentUser();

  const { data: thread, error: tErr } = await supabase
    .from('support_threads')
    .insert({
      customer_id: user?.id ?? null,
      guest_name: name,
      guest_email: email,
      subject,
      status: 'open',
    })
    .select('id')
    .single();
  if (tErr) return { ok: false, error: tErr.message };

  const { error: mErr } = await supabase.from('support_messages').insert({
    thread_id: thread.id,
    sender: 'customer',
    body: message,
  });
  if (mErr) return { ok: false, error: mErr.message };

  revalidatePath('/admin/messages');
  revalidatePath('/admin', 'layout');
  revalidatePath('/account');
  return { ok: true, isGuest: !user };
}

/** The signed-in customer's own threads (newest activity first), with messages. */
export async function getMyThreads(): Promise<SupportThread[]> {
  const user = await getCurrentUser();
  if (!user) return [];
  const supabase = await getSupabaseServer();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from('support_threads')
    .select('id, customer_id, subject, status, created_at, updated_at, support_messages(id, sender, body, created_at)')
    .eq('customer_id', user.id)
    .order('updated_at', { ascending: false });
  if (error || !data) return [];

  return (data as unknown as Array<{
    id: string;
    customer_id: string;
    subject: string;
    status: 'open' | 'closed';
    created_at: string;
    updated_at: string;
    support_messages: Array<{ id: string; sender: 'customer' | 'admin'; body: string; created_at: string }> | null;
  }>).map((t) => ({
    id: t.id,
    customerId: t.customer_id,
    customerName: '',
    customerEmail: '',
    isGuest: false,
    subject: t.subject,
    status: t.status,
    createdAt: t.created_at,
    updatedAt: t.updated_at,
    messages: (t.support_messages ?? [])
      .slice()
      .sort((a, b) => a.created_at.localeCompare(b.created_at))
      .map((m) => ({ id: m.id, sender: m.sender, body: m.body, createdAt: m.created_at })),
  }));
}

/** Signed-in customer replying to their own thread. Reopens a closed thread. */
export async function replyToThread(threadId: string, body: string): Promise<{ ok: boolean; error?: string }> {
  const text = body.trim();
  if (!text) return { ok: false, error: 'Message is empty.' };
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: 'Not signed in.' };

  const supabase = getSupabaseAdmin();
  if (!supabase) return { ok: true };

  const { data: thread } = await supabase
    .from('support_threads')
    .select('id, customer_id')
    .eq('id', threadId)
    .maybeSingle();
  if (!thread || thread.customer_id !== user.id) {
    return { ok: false, error: 'Thread not found.' };
  }

  const { error: mErr } = await supabase.from('support_messages').insert({
    thread_id: threadId,
    sender: 'customer',
    body: text,
  });
  if (mErr) return { ok: false, error: mErr.message };

  await supabase.from('support_threads').update({ status: 'open' }).eq('id', threadId);

  revalidatePath('/account');
  revalidatePath('/admin/messages');
  revalidatePath('/admin', 'layout');
  return { ok: true };
}

/** Admin-only: every thread, newest activity first, with customer contact info. */
export async function getAdminThreads(): Promise<SupportThread[]> {
  await assertAdmin();
  const supabase = await getSupabaseServer();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from('support_threads')
    .select(
      'id, customer_id, guest_name, guest_email, subject, status, created_at, updated_at, ' +
        'support_messages(id, sender, body, created_at), profiles(name, email)'
    )
    .order('updated_at', { ascending: false });
  if (error || !data) return [];

  return (data as unknown as Array<{
    id: string;
    customer_id: string | null;
    guest_name: string;
    guest_email: string;
    subject: string;
    status: 'open' | 'closed';
    created_at: string;
    updated_at: string;
    support_messages: Array<{ id: string; sender: 'customer' | 'admin'; body: string; created_at: string }> | null;
    profiles: { name: string; email: string } | null;
  }>).map((t) => ({
    id: t.id,
    customerId: t.customer_id,
    customerName: t.profiles?.name || t.guest_name,
    customerEmail: t.profiles?.email || t.guest_email,
    isGuest: !t.customer_id,
    subject: t.subject,
    status: t.status,
    createdAt: t.created_at,
    updatedAt: t.updated_at,
    messages: (t.support_messages ?? [])
      .slice()
      .sort((a, b) => a.created_at.localeCompare(b.created_at))
      .map((m) => ({ id: m.id, sender: m.sender, body: m.body, createdAt: m.created_at })),
  }));
}

/** Admin-only: reply to a thread. Reopens a closed thread. */
export async function replyAsAdmin(threadId: string, body: string): Promise<{ ok: boolean; error?: string }> {
  await assertAdmin();
  const text = body.trim();
  if (!text) return { ok: false, error: 'Message is empty.' };
  const supabase = await getSupabaseServer();
  if (!supabase) return { ok: false, error: 'Not available.' };

  const { error: mErr } = await supabase.from('support_messages').insert({
    thread_id: threadId,
    sender: 'admin',
    body: text,
  });
  if (mErr) return { ok: false, error: mErr.message };

  const { error: tErr } = await supabase
    .from('support_threads')
    .update({ status: 'open' })
    .eq('id', threadId);
  if (tErr) return { ok: false, error: tErr.message };

  revalidatePath('/admin/messages');
  revalidatePath('/admin', 'layout');
  revalidatePath('/account');
  return { ok: true };
}

/** Admin-only: open/close a thread without posting a message. */
export async function setThreadStatus(
  threadId: string,
  status: 'open' | 'closed'
): Promise<{ ok: boolean; error?: string }> {
  await assertAdmin();
  const supabase = await getSupabaseServer();
  if (!supabase) return { ok: false, error: 'Not available.' };

  const { error } = await supabase.from('support_threads').update({ status }).eq('id', threadId);
  if (error) return { ok: false, error: error.message };

  revalidatePath('/admin/messages');
  revalidatePath('/admin', 'layout');
  revalidatePath('/account');
  return { ok: true };
}

/** Admin-only: count of open threads, for the sidebar badge. */
export async function getOpenThreadCount(): Promise<number> {
  await assertAdmin();
  const supabase = await getSupabaseServer();
  if (!supabase) return 0;
  const { count, error } = await supabase
    .from('support_threads')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'open');
  if (error) return 0;
  return count ?? 0;
}
