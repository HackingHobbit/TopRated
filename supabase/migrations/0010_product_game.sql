-- 0010 - Product game / franchise
-- Which game a trading-card product belongs to (pokemon, magic, one-piece, ...),
-- so the shop's game links filter on a real field instead of searching names.
-- Filled in by the app (see lib/games.ts); staff can correct it in the admin
-- product editor. Idempotent.

alter table public.products
  add column if not exists game text;

create index if not exists products_game_idx on public.products (game) where game is not null;
