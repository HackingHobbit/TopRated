-- 0008 - Checkout integrity
-- 1. Stock changes happen inside the database in one statement, so two
--    concurrent orders can no longer read the same quantity and overwrite
--    each other's decrement.
-- 2. The order (with its items and stock reservation) is written BEFORE the
--    card is charged, as status 'pending'. A charge can therefore never land
--    without an order row to show for it. place_order flips it to
--    'processing' once payment succeeds; a declined card discards it.
-- 3. orders.idempotency_key lets a double-submitted checkout resolve to the
--    same order instead of charging twice.

alter table public.orders
  add column if not exists idempotency_key text;

create unique index if not exists orders_idempotency_key_idx
  on public.orders (idempotency_key)
  where idempotency_key is not null;

-- Atomic stock adjustment (floored at 0). Used for sales and restocks.
-- Quantities are not yet reliable enough to refuse a sale on, so this never
-- rejects; it only guarantees concurrent writes can't clobber each other.
-- The ledger row records the change actually applied (a sale against a
-- count already at 0 logs 0), so reversing an order's ledger rows restores
-- exactly what it took.
drop function if exists public.adjust_stock(text, integer, text, text, uuid);
create function public.adjust_stock(
  p_product_id text,
  p_delta integer,
  p_reason text,
  p_reference_id text,
  p_created_by uuid
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_old integer;
  v_new integer;
begin
  select quantity into v_old from public.products where id = p_product_id for update;
  if not found then
    return 0;
  end if;

  v_new := greatest(0, v_old + p_delta);
  update public.products set quantity = v_new where id = p_product_id;

  insert into public.inventory_transactions (product_id, delta, reason, reference_id, created_by)
  values (p_product_id, v_new - v_old, p_reason, p_reference_id, p_created_by);

  return v_new - v_old;
end;
$$;

-- Create a 'pending' order with its items and reserve stock, all in one
-- transaction. p_items: [{product_id, product_name, unit_price, quantity}].
create or replace function public.create_pending_order(
  p_order_number text,
  p_idempotency_key text,
  p_customer_id uuid,
  p_subtotal numeric,
  p_tax numeric,
  p_shipping numeric,
  p_total numeric,
  p_shipping_address jsonb,
  p_items jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order_id uuid;
  v_item jsonb;
begin
  insert into public.orders (
    order_number, idempotency_key, customer_id, status,
    subtotal, tax, shipping, total, shipping_address
  )
  values (
    p_order_number, p_idempotency_key, p_customer_id, 'pending',
    p_subtotal, p_tax, p_shipping, p_total, p_shipping_address
  )
  returning id into v_order_id;

  for v_item in select * from jsonb_array_elements(p_items) loop
    insert into public.order_items (order_id, product_id, product_name, unit_price, quantity)
    values (
      v_order_id,
      v_item->>'product_id',
      v_item->>'product_name',
      (v_item->>'unit_price')::numeric,
      (v_item->>'quantity')::integer
    );

    perform public.adjust_stock(
      v_item->>'product_id',
      -((v_item->>'quantity')::integer),
      'sale',
      p_order_number,
      p_customer_id
    );
  end loop;

  return v_order_id;
end;
$$;

-- Undo a pending order whose payment was declined: put the reserved stock
-- back and remove the order (items cascade) and its ledger rows. Only touches 'pending' orders,
-- so it can never discard a paid one.
create or replace function public.discard_pending_order(p_order_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order public.orders%rowtype;
  v_item record;
begin
  select * into v_order from public.orders
   where id = p_order_id and status = 'pending'
   for update;
  if not found then
    return;
  end if;

  -- Reverse exactly what create_pending_order took (see adjust_stock).
  for v_item in
    select product_id, sum(delta) as taken from public.inventory_transactions
     where reference_id = v_order.order_number and reason = 'sale'
     group by product_id
  loop
    update public.products
       set quantity = quantity - v_item.taken
     where id = v_item.product_id;
  end loop;

  delete from public.inventory_transactions
   where reference_id = v_order.order_number and reason = 'sale';
  delete from public.orders where id = p_order_id;
end;
$$;

-- These run with elevated rights, so only the server (service role) may call them.
revoke all on function public.adjust_stock(text, integer, text, text, uuid) from public, anon, authenticated;
revoke all on function public.create_pending_order(text, text, uuid, numeric, numeric, numeric, numeric, jsonb, jsonb) from public, anon, authenticated;
revoke all on function public.discard_pending_order(uuid) from public, anon, authenticated;
grant execute on function public.adjust_stock(text, integer, text, text, uuid) to service_role;
grant execute on function public.create_pending_order(text, text, uuid, numeric, numeric, numeric, numeric, jsonb, jsonb) to service_role;
grant execute on function public.discard_pending_order(uuid) to service_role;
