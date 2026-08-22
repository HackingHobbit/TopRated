-- 0005_profile_phone_and_saved_cards.sql
--
-- Supports the Amazon-style account experience: a phone number on the
-- profile (addresses already exist as a jsonb column from 0001), a link to
-- the customer's Clover "Customer" object (for saved/vaulted cards), and a
-- table of the vaulted cards themselves.
--
-- Security note: clover_customer_id is NOT something a signed-in user should
-- ever be able to set directly (if they could, they could point their own
-- profile at *someone else's* real Clover customer id and charge that
-- person's saved card through our checkout). It's guarded the same way
-- role/loyalty_points already are (0002's trigger) -- only admins or the
-- service-role server client may change it. payment_methods rows work the
-- same way: a user may read/delete their own saved cards, but rows are only
-- ever inserted by the service-role client, after Clover has actually
-- vaulted the card server-side.
--
-- Idempotent; safe to re-run.

alter table public.profiles
  add column if not exists phone text not null default '';

alter table public.profiles
  add column if not exists clover_customer_id text;

-- Extend the existing privileged-column guard (0002) to also cover
-- clover_customer_id.
create or replace function public.guard_profile_privileged_cols()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (new.role <> old.role
      or new.loyalty_points <> old.loyalty_points
      or new.clover_customer_id is distinct from old.clover_customer_id)
     and not public.is_admin()
     and coalesce(auth.role(), '') <> 'service_role'
  then
    raise exception 'Not authorized to change role, loyalty_points, or clover_customer_id';
  end if;
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Saved (vaulted) cards. We NEVER store a card number -- only what Clover
-- gives back after tokenizing+vaulting: an opaque source id, plus brand/
-- last4/expiry for display. Charging later goes through Clover using this
-- source id (see lib/clover), never through raw card data.
-- ---------------------------------------------------------------------------
create table if not exists public.payment_methods (
  id                uuid primary key default gen_random_uuid(),
  customer_id       uuid not null references public.profiles(id) on delete cascade,
  clover_source_id  text not null,          -- the vaulted card's id within the Clover customer
  brand             text not null default '',
  last4             text not null default '',
  exp_month         integer,
  exp_year          integer,
  is_default        boolean not null default false,
  created_at        timestamptz not null default now()
);

create index if not exists payment_methods_customer_idx on public.payment_methods (customer_id);

alter table public.payment_methods enable row level security;

drop policy if exists "payment_methods self select" on public.payment_methods;
create policy "payment_methods self select" on public.payment_methods
  for select using (customer_id = auth.uid());

drop policy if exists "payment_methods self delete" on public.payment_methods;
create policy "payment_methods self delete" on public.payment_methods
  for delete using (customer_id = auth.uid());

-- No insert/update policy: rows are only ever written by the service-role
-- client (lib/paymentMethodActions.ts), after Clover confirms the card was
-- vaulted. RLS defaults to deny, so a signed-in user cannot insert/edit a
-- fake "saved card" row pointing at an arbitrary Clover source id.
