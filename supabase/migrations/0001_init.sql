-- ============================================================================
-- Top Rated Cards & Collectibles — initial schema
-- Generated 2026-05-25
--
-- Run this once after creating your Supabase project. The Supabase CLI can
-- apply it (`supabase db push`) or you can paste it into the SQL editor in
-- the dashboard. See SUPABASE_SETUP.md for the full walkthrough.
--
-- This file is idempotent — it uses IF NOT EXISTS, IF EXISTS, and CREATE OR
-- REPLACE everywhere, so re-running won't blow up an existing project.
-- ============================================================================


-- ---------------------------------------------------------------------------
-- Categories (top-level + subcategory)
-- ---------------------------------------------------------------------------
create table if not exists public.categories (
  id            text primary key,             -- 'NFL', 'TCG', 'Accessories', etc.
  name          text not null,                -- display name
  top_level     text not null,                -- 'sports' | 'tcg' | 'accessories' | …
  created_at    timestamptz not null default now()
);


-- ---------------------------------------------------------------------------
-- Products (replaces data/db.json)
-- ---------------------------------------------------------------------------
create table if not exists public.products (
  id              text primary key,           -- Clover ID
  name            text not null,
  description     text not null default '',
  price           numeric(10,2) not null,
  cost            numeric(10,2),
  image           text not null default '',
  category_id     text references public.categories(id) on update cascade,
  sku             text,
  barcode         text,
  quantity        integer not null default 0,
  is_sealed       boolean not null default false,
  is_sale         boolean not null default false,
  is_featured     boolean not null default false,
  is_new_release  boolean not null default false,
  is_out_of_stock boolean not null default false,
  is_limited      boolean not null default false,
  is_pre_order    boolean not null default false,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists products_category_idx on public.products (category_id);
create index if not exists products_featured_idx on public.products (is_featured) where is_featured;
create index if not exists products_new_release_idx on public.products (is_new_release) where is_new_release;
create index if not exists products_pre_order_idx on public.products (is_pre_order) where is_pre_order;


-- ---------------------------------------------------------------------------
-- Profiles — extends auth.users with shop-specific fields
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id                 uuid primary key references auth.users(id) on delete cascade,
  email              text unique not null,
  name               text not null default '',
  loyalty_points     integer not null default 0,
  clover_customer_id text,
  role               text not null default 'customer'
                       check (role in ('customer', 'admin')),
  addresses          jsonb not null default '[]'::jsonb,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

create index if not exists profiles_role_idx on public.profiles (role);


-- ---------------------------------------------------------------------------
-- Orders
-- ---------------------------------------------------------------------------
create table if not exists public.orders (
  id                uuid primary key default gen_random_uuid(),
  order_number      text unique not null,                  -- 'TR-12345'
  customer_id       uuid references public.profiles(id) on delete set null,
  status            text not null default 'pending'
                      check (status in ('pending','processing','shipped','delivered','canceled','refunded')),
  subtotal          numeric(10,2) not null,
  tax               numeric(10,2) not null default 0,
  shipping          numeric(10,2) not null default 0,
  total             numeric(10,2) not null,
  shipping_address  jsonb,                                  -- snapshot of address at checkout
  clover_order_id   text,
  tracking_number   text,
  notes             text,
  placed_at         timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index if not exists orders_customer_idx on public.orders (customer_id);
create index if not exists orders_status_idx on public.orders (status);
create index if not exists orders_placed_idx on public.orders (placed_at desc);


-- ---------------------------------------------------------------------------
-- Order items
-- ---------------------------------------------------------------------------
create table if not exists public.order_items (
  id            uuid primary key default gen_random_uuid(),
  order_id      uuid not null references public.orders(id) on delete cascade,
  product_id    text references public.products(id) on delete set null,
  product_name  text not null,         -- snapshot at order time (survives product rename)
  unit_price    numeric(10,2) not null,
  quantity      integer not null check (quantity > 0),
  created_at    timestamptz not null default now()
);

create index if not exists order_items_order_idx on public.order_items (order_id);


-- ---------------------------------------------------------------------------
-- Want lists (server-side persistence of the favorites feature)
-- ---------------------------------------------------------------------------
create table if not exists public.want_lists (
  customer_id  uuid references public.profiles(id) on delete cascade,
  product_id   text references public.products(id) on delete cascade,
  created_at   timestamptz not null default now(),
  primary key (customer_id, product_id)
);


-- ---------------------------------------------------------------------------
-- Carts (server-side cart for logged-in users — guests stay in localStorage)
-- ---------------------------------------------------------------------------
create table if not exists public.carts (
  customer_id  uuid primary key references public.profiles(id) on delete cascade,
  items        jsonb not null default '[]'::jsonb,         -- [{product_id, quantity}]
  updated_at   timestamptz not null default now()
);


-- ---------------------------------------------------------------------------
-- Inventory transactions (audit log for every stock change)
-- ---------------------------------------------------------------------------
create table if not exists public.inventory_transactions (
  id            uuid primary key default gen_random_uuid(),
  product_id    text not null references public.products(id) on delete cascade,
  delta         integer not null,        -- positive = stock added, negative = sold/lost
  reason        text not null,           -- 'sale', 'restock', 'manual_adjust', 'return', 'damage'
  reference_id  text,                    -- order id, manual adjust note, etc.
  created_by    uuid references public.profiles(id) on delete set null,
  created_at    timestamptz not null default now()
);

create index if not exists invtx_product_idx on public.inventory_transactions (product_id);


-- ============================================================================
-- Triggers: keep updated_at fresh; auto-create profile on signup
-- ============================================================================

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists products_touch_updated_at on public.products;
create trigger products_touch_updated_at
  before update on public.products
  for each row execute function public.touch_updated_at();

drop trigger if exists orders_touch_updated_at on public.orders;
create trigger orders_touch_updated_at
  before update on public.orders
  for each row execute function public.touch_updated_at();

drop trigger if exists profiles_touch_updated_at on public.profiles;
create trigger profiles_touch_updated_at
  before update on public.profiles
  for each row execute function public.touch_updated_at();

drop trigger if exists carts_touch_updated_at on public.carts;
create trigger carts_touch_updated_at
  before update on public.carts
  for each row execute function public.touch_updated_at();


-- When a row is created in auth.users (signup), mirror a minimal row into
-- public.profiles so the rest of the app has a profile to query.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, name)
  values (
    new.id,
    new.email,
    coalesce(
      new.raw_user_meta_data->>'name',
      split_part(new.email, '@', 1)
    )
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();


-- ============================================================================
-- Row Level Security
-- ============================================================================

alter table public.categories               enable row level security;
alter table public.products                 enable row level security;
alter table public.profiles                 enable row level security;
alter table public.orders                   enable row level security;
alter table public.order_items              enable row level security;
alter table public.want_lists               enable row level security;
alter table public.carts                    enable row level security;
alter table public.inventory_transactions   enable row level security;

-- Helper: am I an admin? Used in nearly every policy below.
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select role = 'admin' from public.profiles where id = auth.uid()),
    false
  );
$$;


-- Categories: public read, admin write
drop policy if exists "categories readable by anyone"  on public.categories;
drop policy if exists "categories mutated by admin"    on public.categories;
create policy "categories readable by anyone" on public.categories for select using (true);
create policy "categories mutated by admin"   on public.categories for all
  using (public.is_admin()) with check (public.is_admin());


-- Products: public read, admin write
drop policy if exists "products readable by anyone"  on public.products;
drop policy if exists "products mutated by admin"    on public.products;
create policy "products readable by anyone" on public.products for select using (true);
create policy "products mutated by admin"   on public.products for all
  using (public.is_admin()) with check (public.is_admin());


-- Profiles: each user reads/updates own. Admins can read all. Nobody can
-- insert directly — the auth trigger does that on signup.
drop policy if exists "profiles self select"   on public.profiles;
drop policy if exists "profiles self update"   on public.profiles;
drop policy if exists "profiles admin select"  on public.profiles;
drop policy if exists "profiles admin update"  on public.profiles;
create policy "profiles self select"  on public.profiles for select using (id = auth.uid());
create policy "profiles self update"  on public.profiles for update using (id = auth.uid());
create policy "profiles admin select" on public.profiles for select using (public.is_admin());
create policy "profiles admin update" on public.profiles for update using (public.is_admin());


-- Orders: customer reads own, customer creates own; admin reads & updates all
drop policy if exists "orders self select"    on public.orders;
drop policy if exists "orders self insert"    on public.orders;
drop policy if exists "orders admin select"   on public.orders;
drop policy if exists "orders admin update"   on public.orders;
create policy "orders self select"  on public.orders for select using (customer_id = auth.uid());
create policy "orders self insert"  on public.orders for insert with check (customer_id = auth.uid());
create policy "orders admin select" on public.orders for select using (public.is_admin());
create policy "orders admin update" on public.orders for update using (public.is_admin());


-- Order items: same access rules as the parent order
drop policy if exists "order_items self select" on public.order_items;
drop policy if exists "order_items self insert" on public.order_items;
drop policy if exists "order_items admin all"   on public.order_items;
create policy "order_items self select" on public.order_items for select using (
  exists (select 1 from public.orders o where o.id = order_id and o.customer_id = auth.uid())
);
create policy "order_items self insert" on public.order_items for insert with check (
  exists (select 1 from public.orders o where o.id = order_id and o.customer_id = auth.uid())
);
create policy "order_items admin all" on public.order_items for all
  using (public.is_admin()) with check (public.is_admin());


-- Want lists: customer reads/writes own; admin reads all
drop policy if exists "want_lists self all"   on public.want_lists;
drop policy if exists "want_lists admin read" on public.want_lists;
create policy "want_lists self all"   on public.want_lists for all
  using (customer_id = auth.uid()) with check (customer_id = auth.uid());
create policy "want_lists admin read" on public.want_lists for select using (public.is_admin());


-- Carts: customer reads/writes own
drop policy if exists "carts self all" on public.carts;
create policy "carts self all" on public.carts for all
  using (customer_id = auth.uid()) with check (customer_id = auth.uid());


-- Inventory transactions: admin only
drop policy if exists "invtx admin all" on public.inventory_transactions;
create policy "invtx admin all" on public.inventory_transactions for all
  using (public.is_admin()) with check (public.is_admin());


-- ============================================================================
-- Seed: top-level + subcategories used by the existing inventory.
-- ============================================================================
insert into public.categories (id, name, top_level) values
  ('NFL',           'NFL',            'sports'),
  ('NBA',           'NBA',            'sports'),
  ('MLB',           'MLB',            'sports'),
  ('NHL',           'NHL',            'sports'),
  ('Soccer',        'Soccer',         'sports'),
  ('Combat',        'Combat',         'sports'),
  ('Racing',        'Racing',         'sports'),
  ('Golf',          'Golf',           'sports'),
  ('Signed Jersey', 'Signed Jersey',  'memorabilia'),
  ('TCG',           'TCG',            'tcg'),
  ('Accessories',   'Accessories',    'accessories'),
  ('Beverages',     'Beverages',      'beverages'),
  ('Entertainment', 'Entertainment',  'entertainment')
on conflict (id) do nothing;
