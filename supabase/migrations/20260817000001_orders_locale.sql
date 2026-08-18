-- Task 4.3: order notifications need to know which language to template in.
-- Neither `country_code` (drives currency/shipping, not language) nor a
-- customer's *current* `default_locale` (can change after the order shipped,
-- and doesn't exist at all for a guest) is the right source — the order
-- snapshots the language the shopper actually checked out in, same
-- reasoning `order_items` snapshots name/price instead of joining back to
-- live product data. Column name/constraint mirror `customers.default_locale`:
-- language only ('ar'/'en'), not the full `{language}-{country}` locale —
-- country is already `orders.country_code`.
alter table public.orders
  add column locale text not null default 'ar' check (locale in ('ar', 'en'));

-- `create_order`'s parameter list is changing (one new arg), which Postgres
-- treats as a distinct overload rather than a replacement of the existing
-- one — `create or replace` alone would leave both the old and new
-- signatures registered instead of swapping one for the other. Drop the old
-- signature explicitly first.
drop function public.create_order(
  text, uuid, text, text, text, text, numeric, jsonb, integer, integer, integer, integer,
  integer, text, public.payment_provider, uuid, jsonb
);

create function public.create_order(
  p_order_number text,
  p_customer_id uuid,
  p_guest_email text,
  p_guest_phone text,
  p_country_code text,
  p_currency text,
  p_fx_rate_used numeric,
  p_shipping_address jsonb,
  p_subtotal_minor integer,
  p_discount_minor integer,
  p_shipping_minor integer,
  p_vat_minor integer,
  p_total_minor integer,
  p_coupon_code text,
  p_payment_provider public.payment_provider,
  p_cart_id uuid,
  -- Each element: {variant_id, name_snapshot, sku, qty, unit_price_minor, line_total_minor}.
  p_items jsonb,
  p_locale text default 'ar'
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order_id uuid;
  v_item jsonb;
  v_variant_id uuid;
  v_qty integer;
  v_stock_qty integer;
  v_usage_limit integer;
  v_per_user_limit integer;
  v_usage_count integer;
  v_user_usage_count integer;
begin
  if p_coupon_code is not null then
    select usage_limit, per_user_limit into v_usage_limit, v_per_user_limit
    from public.coupons
    where code = p_coupon_code
    for update;

    if v_usage_limit is not null then
      select count(*) into v_usage_count
      from public.orders
      where coupon_code = p_coupon_code and payment_status <> 'failed';

      if v_usage_count >= v_usage_limit then
        raise exception 'coupon_limit_reached';
      end if;
    end if;

    if v_per_user_limit is not null then
      if p_customer_id is not null then
        select count(*) into v_user_usage_count
        from public.orders
        where coupon_code = p_coupon_code and payment_status <> 'failed'
          and customer_id = p_customer_id;
      elsif p_guest_email is not null then
        select count(*) into v_user_usage_count
        from public.orders
        where coupon_code = p_coupon_code and payment_status <> 'failed'
          and guest_email = p_guest_email;
      end if;

      if v_user_usage_count is not null and v_user_usage_count >= v_per_user_limit then
        raise exception 'coupon_per_user_limit_reached';
      end if;
    end if;
  end if;

  -- Fixed lock order (by variant_id) so two orders sharing two of the same
  -- variants can never deadlock by locking them in opposite order.
  for v_item in select value from jsonb_array_elements(p_items) as t(value) order by value ->> 'variant_id'
  loop
    v_variant_id := (v_item ->> 'variant_id')::uuid;
    v_qty := (v_item ->> 'qty')::integer;

    select stock_qty into v_stock_qty
    from public.product_variants
    where id = v_variant_id
    for update;

    if v_stock_qty is null or v_stock_qty < v_qty then
      raise exception 'out_of_stock:%', v_variant_id;
    end if;

    update public.product_variants set stock_qty = stock_qty - v_qty where id = v_variant_id;
  end loop;

  insert into public.orders (
    order_number, customer_id, guest_email, guest_phone, country_code, currency,
    fx_rate_used, shipping_address, subtotal_minor, discount_minor, shipping_minor,
    vat_minor, total_minor, coupon_code, payment_provider, locale
  ) values (
    p_order_number, p_customer_id, p_guest_email, p_guest_phone, p_country_code, p_currency,
    p_fx_rate_used, p_shipping_address, p_subtotal_minor, p_discount_minor, p_shipping_minor,
    p_vat_minor, p_total_minor, p_coupon_code, p_payment_provider, p_locale
  )
  returning id into v_order_id;

  insert into public.order_items (
    order_id, variant_id, name_snapshot, sku, qty, unit_price_minor, line_total_minor
  )
  select
    v_order_id,
    (item ->> 'variant_id')::uuid,
    item ->> 'name_snapshot',
    item ->> 'sku',
    (item ->> 'qty')::integer,
    (item ->> 'unit_price_minor')::integer,
    (item ->> 'line_total_minor')::integer
  from jsonb_array_elements(p_items) as item;

  insert into public.order_events (order_id, status, note)
  values (v_order_id, 'pending', 'Order placed');

  -- Guest carts have no RLS policy either, same as everything else this
  -- function touches — fine, since only the service-role client may call it.
  if p_cart_id is not null then
    update public.carts set converted_at = now() where id = p_cart_id;
  end if;

  return v_order_id;
end;
$$;

revoke all on function public.create_order(
  text, uuid, text, text, text, text, numeric, jsonb, integer, integer, integer, integer,
  integer, text, public.payment_provider, uuid, jsonb, text
) from public;
revoke execute on function public.create_order(
  text, uuid, text, text, text, text, numeric, jsonb, integer, integer, integer, integer,
  integer, text, public.payment_provider, uuid, jsonb, text
) from anon;
revoke execute on function public.create_order(
  text, uuid, text, text, text, text, numeric, jsonb, integer, integer, integer, integer,
  integer, text, public.payment_provider, uuid, jsonb, text
) from authenticated;
grant execute on function public.create_order(
  text, uuid, text, text, text, text, numeric, jsonb, integer, integer, integer, integer,
  integer, text, public.payment_provider, uuid, jsonb, text
) to service_role;
