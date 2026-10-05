-- 0009 - Clover inventory sync credentials
-- The store's REAL Clover account is read for products, prices and stock
-- independently of the payment settings above (which may stay on the Clover
-- sandbox while checkout is being tested). Always production.
-- Same admin-only RLS as the rest of clover_settings. Idempotent.

alter table public.clover_settings
  add column if not exists inventory_merchant_id text not null default '',
  add column if not exists inventory_api_token   text not null default '',  -- SECRET (Platform API token)
  add column if not exists inventory_synced_at   timestamptz;
