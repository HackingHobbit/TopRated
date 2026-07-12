-- 0004_integration_settings.sql
--
-- Single-row settings for the Clover integration, powering the admin
-- Integrations page's mock/live toggle + credential fields. Contains secrets
-- (api_token, ecomm_private_key), so RLS is ADMIN-ONLY for all operations —
-- nothing here is publicly readable. The app reads it server-side via the
-- service-role client (which bypasses RLS); the anon client can never see it.
--
-- If this migration hasn't been applied, the app safely defaults to the
-- phantom (mock) Clover — see lib/clover/index.ts. Idempotent; safe to re-run.

create table if not exists public.clover_settings (
  id                text primary key default 'default',
  mode              text not null default 'mock'    check (mode in ('mock','live')),
  environment       text not null default 'sandbox' check (environment in ('sandbox','production')),
  merchant_id       text not null default '',
  api_token         text not null default '',   -- SECRET (Platform API bearer)
  ecomm_public_key  text not null default '',   -- public PAKMS key (browser-safe)
  ecomm_private_key text not null default '',   -- SECRET (server charges)
  updated_at        timestamptz not null default now()
);

alter table public.clover_settings enable row level security;

drop policy if exists "clover_settings admin all" on public.clover_settings;
create policy "clover_settings admin all" on public.clover_settings for all
  using (public.is_admin()) with check (public.is_admin());

-- Seed the single row so the app always has settings to read.
insert into public.clover_settings (id) values ('default') on conflict (id) do nothing;

-- Keep updated_at fresh (reuses the trigger fn from 0001).
drop trigger if exists clover_settings_touch on public.clover_settings;
create trigger clover_settings_touch before update on public.clover_settings
  for each row execute function public.touch_updated_at();
