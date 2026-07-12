-- 0003_image_representative.sql
--
-- Adds a product-level flag marking that the stored image is only
-- *representative* of the item — a close-but-not-exact stand-in used when we
-- couldn't source the precise product shot (common for resold inventory where
-- box art / year / edition may vary slightly).
--
-- When true, the storefront shows a "Representative image" note so buyers know
-- the pictured item may differ in appearance from what ships. Defaults to false
-- so every existing product is treated as an exact image until flagged.
--
-- Idempotent: safe to re-run.

alter table public.products
  add column if not exists image_representative boolean not null default false;

comment on column public.products.image_representative is
  'true = stored image is a representative stand-in, not guaranteed to match the exact item shipped';
