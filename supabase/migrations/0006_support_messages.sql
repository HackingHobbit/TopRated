-- 0006_support_messages.sql
--
-- In-app customer support messaging: replaces the dead
-- support@topratedcards.com mailto link (no mailbox actually exists for it)
-- with a contact form that creates a thread, and an admin inbox to read and
-- reply. Logged-in customers see admin replies (and can reply back) under
-- Account > Messages. Guest submissions have no account to log back into, so
-- admin replies to a guest thread are an internal record — the guest's email
-- is shown so staff can follow up directly; there is no outbound-email
-- integration in this app yet (see lib/supportActions.ts for details).
--
-- Idempotent; safe to re-run.

create table if not exists public.support_threads (
  id            uuid primary key default gen_random_uuid(),
  customer_id   uuid references public.profiles(id) on delete set null,
  guest_name    text not null default '',
  guest_email   text not null default '',
  subject       text not null,
  status        text not null default 'open' check (status in ('open', 'closed')),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists support_threads_customer_idx on public.support_threads (customer_id);
create index if not exists support_threads_status_idx   on public.support_threads (status);
create index if not exists support_threads_updated_idx  on public.support_threads (updated_at desc);

create table if not exists public.support_messages (
  id          uuid primary key default gen_random_uuid(),
  thread_id   uuid not null references public.support_threads(id) on delete cascade,
  sender      text not null check (sender in ('customer', 'admin')),
  body        text not null,
  created_at  timestamptz not null default now()
);

create index if not exists support_messages_thread_idx on public.support_messages (thread_id);

drop trigger if exists support_threads_touch_updated_at on public.support_threads;
create trigger support_threads_touch_updated_at
  before update on public.support_threads
  for each row execute function public.touch_updated_at();

alter table public.support_threads  enable row level security;
alter table public.support_messages enable row level security;

-- Reads: a customer sees their own threads/messages; admins see everything.
-- No insert/update policies for either table — every write (guest or
-- customer) goes through the service-role client in lib/supportActions.ts
-- after server-side validation, the same pattern placeOrder() uses so guest
-- checkout works regardless of RLS.
drop policy if exists "support_threads self select" on public.support_threads;
drop policy if exists "support_threads admin all"   on public.support_threads;
create policy "support_threads self select" on public.support_threads for select using (customer_id = auth.uid());
create policy "support_threads admin all"   on public.support_threads for all
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists "support_messages self select" on public.support_messages;
drop policy if exists "support_messages admin all"   on public.support_messages;
create policy "support_messages self select" on public.support_messages for select using (
  exists (select 1 from public.support_threads t where t.id = thread_id and t.customer_id = auth.uid())
);
create policy "support_messages admin all" on public.support_messages for all
  using (public.is_admin()) with check (public.is_admin());
