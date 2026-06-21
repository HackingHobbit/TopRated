-- ============================================================================
-- 0002 — Singles inventory, product images, storage bucket, role-escalation fix
--
-- Apply after 0001_init.sql. Idempotent (IF NOT EXISTS / on conflict / CREATE
-- OR REPLACE). Paste into the Supabase SQL Editor and Run, or `supabase db push`.
-- See SUPABASE_SETUP.md.
-- ============================================================================


-- ---------------------------------------------------------------------------
-- 1. single_details — per-card attributes for individual cards (is_sealed=false)
--    Companion to products; sealed product rows simply have no row here.
-- ---------------------------------------------------------------------------
create table if not exists public.single_details (
  product_id   text primary key references public.products(id) on delete cascade,
  subject      text,                       -- player / character / subject
  card_set     text,                       -- e.g. '2023 Topps Chrome'
  year         integer,
  card_number  text,
  condition    text,                       -- raw condition, e.g. 'Near Mint'
  is_graded    boolean not null default false,
  grader       text,                       -- 'PSA' | 'BGS' | 'SGC' | 'CGC'
  grade        text,                       -- '10' | '9.5' | ...
  cert_number  text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

drop trigger if exists single_details_touch_updated_at on public.single_details;
create trigger single_details_touch_updated_at
  before update on public.single_details
  for each row execute function public.touch_updated_at();


-- ---------------------------------------------------------------------------
-- 2. product_images — multiple ordered photos per product (front/back/etc.)
--    The products.image column stays as the "primary" thumbnail mirror.
-- ---------------------------------------------------------------------------
create table if not exists public.product_images (
  id          uuid primary key default gen_random_uuid(),
  product_id  text not null references public.products(id) on delete cascade,
  url         text not null,
  position    integer not null default 0,
  is_primary  boolean not null default false,
  created_at  timestamptz not null default now()
);
create index if not exists product_images_product_idx
  on public.product_images (product_id, position);


-- ---------------------------------------------------------------------------
-- 3. RLS — both tables: public read, admin write
-- ---------------------------------------------------------------------------
alter table public.single_details enable row level security;
alter table public.product_images enable row level security;

drop policy if exists "single_details readable by anyone" on public.single_details;
drop policy if exists "single_details admin write"        on public.single_details;
create policy "single_details readable by anyone" on public.single_details for select using (true);
create policy "single_details admin write" on public.single_details for all
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists "product_images readable by anyone" on public.product_images;
drop policy if exists "product_images admin write"        on public.product_images;
create policy "product_images readable by anyone" on public.product_images for select using (true);
create policy "product_images admin write" on public.product_images for all
  using (public.is_admin()) with check (public.is_admin());


-- ---------------------------------------------------------------------------
-- 4. Storage bucket for product photos — public read, admin write
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('product-images', 'product-images', true)
on conflict (id) do nothing;

drop policy if exists "product-images public read"   on storage.objects;
drop policy if exists "product-images admin insert"  on storage.objects;
drop policy if exists "product-images admin update"  on storage.objects;
drop policy if exists "product-images admin delete"  on storage.objects;

create policy "product-images public read" on storage.objects for select
  using (bucket_id = 'product-images');
create policy "product-images admin insert" on storage.objects for insert
  with check (bucket_id = 'product-images' and public.is_admin());
create policy "product-images admin update" on storage.objects for update
  using (bucket_id = 'product-images' and public.is_admin());
create policy "product-images admin delete" on storage.objects for delete
  using (bucket_id = 'product-images' and public.is_admin());


-- ---------------------------------------------------------------------------
-- 5. Phase 0 — close the role-escalation hole
--    "profiles self update" (0001) let any user update their own row,
--    including role/loyalty_points. This trigger rejects privileged-column
--    changes unless the caller is an admin OR the trusted service_role
--    (server-side admin actions). Browser self-promotion is blocked.
-- ---------------------------------------------------------------------------
create or replace function public.guard_profile_privileged_cols()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (new.role <> old.role or new.loyalty_points <> old.loyalty_points)
     and not public.is_admin()
     and coalesce(auth.role(), '') <> 'service_role'
  then
    raise exception 'Not authorized to change role or loyalty_points';
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_guard_privileged on public.profiles;
create trigger profiles_guard_privileged
  before update on public.profiles
  for each row execute function public.guard_profile_privileged_cols();
