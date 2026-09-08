-- 0007 - Admin-managed storefront events
-- Public visitors can read visible event records; only admins can mutate them.

create table if not exists public.events (
  id          uuid primary key default gen_random_uuid(),
  title       text not null,
  description text not null default '',
  image       text not null default '',
  start_date  date not null,
  end_date    date not null,
  is_visible  boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  constraint events_date_order check (end_date >= start_date)
);

create index if not exists events_dates_idx
  on public.events (start_date, end_date);

drop trigger if exists events_touch_updated_at on public.events;
create trigger events_touch_updated_at
  before update on public.events
  for each row execute function public.touch_updated_at();

alter table public.events enable row level security;

drop policy if exists "events readable by anyone" on public.events;
drop policy if exists "events mutated by admin" on public.events;
create policy "events readable by anyone" on public.events
  for select using (true);
create policy "events mutated by admin" on public.events
  for all using (public.is_admin()) with check (public.is_admin());