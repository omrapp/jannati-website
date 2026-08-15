-- Task 2.5's guest-cart-into-customer merge (src/lib/commerce/cart.ts) was
-- originally four separate PostgREST round trips: read guest items, read/
-- create the customer cart, upsert the merge result, delete the guest cart.
-- That's not atomic — a guest add-to-cart landing in the gap between the
-- read and the delete gets silently destroyed by the cascade, and two
-- concurrent merges into the same customer cart lost-update each other's
-- write. Doing the whole thing in one PL/pgSQL function, in one transaction,
-- with `for update` locks, closes both races:
--
--  * Locking the guest cart row blocks a concurrent `addCartItem`'s insert
--    for that cart — inserting a `cart_items` row that references it takes
--    an implicit `for key share` lock on the parent via the foreign key,
--    which conflicts with `for update`. That insert waits until this
--    transaction commits (then sees its item was captured) or rolls back
--    (then, if we'd already deleted the guest cart, fails loudly on the FK
--    instead of the item silently vanishing).
--  * Locking the customer cart row the same way serializes two concurrent
--    merges into it instead of letting the second overwrite the first.
--
-- Mirrors `resolveAddQty`/`resolveCartMerge` in src/lib/commerce/cart.ts —
-- same sum-and-clamp-to-stock rule, same "drop a line with no stock left"
-- rule. Keep the two in sync if either changes; the JS functions stay the
-- unit-tested spec for this logic, this function is the atomic write path.
create or replace function public.merge_guest_cart_into_customer(
  p_customer_id uuid,
  p_guest_session_token text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_guest_cart_id uuid;
  v_guest_country text;
  v_guest_currency text;
  v_customer_cart_id uuid;
begin
  select id, country_code, currency
    into v_guest_cart_id, v_guest_country, v_guest_currency
  from public.carts
  where session_token = p_guest_session_token
    and converted_at is null
  for update;

  -- No guest cart (never had one, or a previous call already merged and
  -- deleted it) — nothing to do. This is what makes a repeat call idempotent.
  if v_guest_cart_id is null then
    return;
  end if;

  select id into v_customer_cart_id
  from public.carts
  where customer_id = p_customer_id
    and converted_at is null
  for update;

  if v_customer_cart_id is null then
    -- Mirrors getOrCreateActiveCart's race handling: a concurrent first-cart
    -- insert for this customer (e.g. a doubled login submit) can lose the
    -- unique-index race here; fall back to the winner's row instead of
    -- surfacing that race as an error.
    begin
      insert into public.carts (customer_id, country_code, currency)
      values (p_customer_id, v_guest_country, v_guest_currency)
      returning id into v_customer_cart_id;
    exception when unique_violation then
      select id into v_customer_cart_id
      from public.carts
      where customer_id = p_customer_id and converted_at is null;
    end;
  end if;

  insert into public.cart_items (cart_id, variant_id, qty)
  select
    v_customer_cart_id,
    g.variant_id,
    least(coalesce(c.qty, 0) + g.qty, pv.stock_qty)
  from public.cart_items g
  join public.product_variants pv on pv.id = g.variant_id
  left join public.cart_items c
    on c.cart_id = v_customer_cart_id and c.variant_id = g.variant_id
  where g.cart_id = v_guest_cart_id
    and pv.stock_qty > 0 -- out of stock — drop the line, same as resolveAddQty's hard rejection
  on conflict (cart_id, variant_id)
  do update set qty = excluded.qty, updated_at = now();

  -- Guest cart fully consumed — delete it (cascades cart_items). This row
  -- disappearing, not a nulled-out session_token, is the idempotency
  -- mechanism: see the null check above.
  delete from public.carts where id = v_guest_cart_id;
end;
$$;

-- This takes an arbitrary p_customer_id with no ownership check of its own —
-- it relies entirely on the caller having already verified who's logging in.
-- Same trust boundary as the rest of guest-cart access (see the file header
-- in src/lib/commerce/cart.ts): only the service-role client may call it.
revoke all on function public.merge_guest_cart_into_customer(uuid, text) from public;
grant execute on function public.merge_guest_cart_into_customer(uuid, text) to service_role;
