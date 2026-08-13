-- Cart, checkout and order schema: customers, addresses, carts, coupons,
-- orders and their line items/event timeline.
--
-- Trust boundary: every price, discount and total in this schema is written
-- by server-side application code using the service-role client — never by a
-- client-supplied value. RLS below grants authenticated customers read
-- access to their own rows (and read/write on their own cart and addresses,
-- which are not money-bearing), but no authenticated client can insert or
-- update an order, order_items row, or order_events row: order creation
-- recomputes every total from the database at write time (product_variants,
-- countries, coupons), so it always goes through a server action using the
-- service-role client, never a direct client insert. This is a deliberate
-- narrowing of the spec's "per-user write on orders" RLS note in favour of
-- the project's stronger "server recomputes every total, always" rule.
--
-- Guest carts and guest orders have no Supabase Auth session at all, so they
-- cannot be scoped by `auth.uid()`. They are handled entirely by server
-- actions using the service-role client: a signed `session_token` cookie
-- identifies a guest cart, and a guest order is looked up by order number +
-- email, both verified in application code before the service-role client is
-- used. Coupons are never directly readable by any client, authenticated or
-- not, to keep codes from being enumerated and usage-limit checks race-safe
-- behind one server-side code path.

create type public.payment_provider as enum ('thawani', 'tap', 'cod');
create type public.payment_status as enum ('pending', 'paid', 'failed', 'refunded');
create type public.fulfilment_status as
  enum ('pending', 'processing', 'shipped', 'delivered', 'cancelled');
create type public.coupon_type as enum ('percent', 'fixed');

-- Customers -------------------------------------------------------------------
--
-- One row per Supabase Auth user, created automatically on signup so the
-- storefront always has somewhere to hang addresses, carts and orders.

create table public.customers (
  id uuid primary key references auth.users (id) on delete cascade,
  phone text,
  default_locale text not null default 'ar' check (default_locale in ('ar', 'en')),
  marketing_opt_in boolean not null default false,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.customers (id) values (new.id);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Addresses ---------------------------------------------------------------------

create table public.addresses (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers (id) on delete cascade,
  country_code text not null references public.countries (code),
  -- Not in the spec's original field list, but no shipping address is usable
  -- without a recipient name to put on the package.
  full_name text not null,
  phone text not null,
  city text not null,
  area text,
  line1 text not null,
  is_default boolean not null default false,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index addresses_customer_id_idx on public.addresses (customer_id);

-- At most one default address per customer.
create unique index addresses_one_default_per_customer_idx
  on public.addresses (customer_id) where is_default;

-- Carts -------------------------------------------------------------------------

create table public.carts (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid references public.customers (id) on delete cascade,
  -- Set for a guest cart; cleared once merged into an account cart on login.
  session_token text unique,
  country_code text not null references public.countries (code),
  currency text not null check (currency ~ '^[A-Z]{3}$'),
  -- Set when this cart becomes an order, so a stale guest cart is never
  -- resurrected or re-merged after checkout completes.
  converted_at timestamptz,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint carts_owner_check check (
    (customer_id is not null) or (session_token is not null)
  )
);

create index carts_customer_id_idx on public.carts (customer_id) where customer_id is not null;

-- At most one active (unconverted) cart per customer — without this, a
-- double-click or a retried request in the get-or-create-cart action (2.3)
-- could race and insert two carts, silently splitting the customer's items.
create unique index carts_one_active_per_customer_idx
  on public.carts (customer_id)
  where customer_id is not null and converted_at is null;

create table public.cart_items (
  cart_id uuid not null references public.carts (id) on delete cascade,
  variant_id uuid not null references public.product_variants (id) on delete cascade,
  qty integer not null check (qty > 0),

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  primary key (cart_id, variant_id)
);

-- Coupons -------------------------------------------------------------------------
--
-- Usage counts are derived from `orders.coupon_code` at validation time
-- rather than tracked in a separate counter column, so a count can never
-- drift out of sync with the orders it is meant to describe. That derivation
-- keeps the count *correct*; making it *race-safe* under a concurrent
-- checkout is task 2.9's job (locking the coupon row inside the order-insert
-- transaction), not something this schema enforces on its own.

create table public.coupons (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (code = upper(code)),
  type public.coupon_type not null,
  -- Percent: whole percent, 1-100. Fixed: OMR minor units (baisa), same base
  -- currency as product prices, converted at checkout like everything else.
  value integer not null check (value > 0),
  -- Same OMR-minor-units scale as `value` above — compared against the
  -- cart's OMR-equivalent subtotal, not the checkout-currency subtotal.
  min_order_minor integer check (min_order_minor >= 0),
  starts_at timestamptz,
  ends_at timestamptz,
  usage_limit integer check (usage_limit > 0),
  per_user_limit integer check (per_user_limit > 0),
  active boolean not null default true,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint coupons_percent_range check (type <> 'percent' or value <= 100)
);

-- Orders -------------------------------------------------------------------------

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  -- Generated by application code (task 2.9), not the database, so the
  -- generator is unit-testable without a live connection.
  order_number text not null unique,
  customer_id uuid references public.customers (id) on delete set null,
  guest_email text,
  guest_phone text,

  country_code text not null references public.countries (code),
  currency text not null check (currency ~ '^[A-Z]{3}$'),
  fx_rate_used numeric(14, 6) not null check (fx_rate_used > 0),

  -- Snapshotted at order time — never re-read from `addresses`, so a later
  -- address edit never changes what shipped on a past order.
  shipping_address jsonb not null,

  -- All in the order's own currency and minor-unit scale (`currency_exponent`
  -- above), not OMR — this is what the customer was actually charged.
  subtotal_minor integer not null check (subtotal_minor >= 0),
  discount_minor integer not null default 0 check (discount_minor >= 0),
  shipping_minor integer not null default 0 check (shipping_minor >= 0),
  vat_minor integer not null default 0 check (vat_minor >= 0),
  total_minor integer not null check (total_minor >= 0),
  -- Soft reference, not a foreign key: a coupon may be edited or deactivated
  -- later without rewriting the orders that already used it.
  coupon_code text,

  payment_provider public.payment_provider not null,
  payment_status public.payment_status not null default 'pending',
  fulfilment_status public.fulfilment_status not null default 'pending',
  tracking_number text,
  tracking_url text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint orders_guest_or_customer_check check (
    (customer_id is not null) or (guest_email is not null)
  )
);

-- Covers the "my orders" list (task 2.9), sorted newest first, without an
-- extra sort step.
create index orders_customer_id_created_at_idx
  on public.orders (customer_id, created_at desc) where customer_id is not null;
create index orders_guest_email_idx on public.orders (guest_email) where guest_email is not null;
create index orders_coupon_code_idx on public.orders (coupon_code) where coupon_code is not null;

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  -- Kept nullable and ON DELETE SET NULL: the name/sku/price snapshots below
  -- are what an order actually needs, so a deleted variant never breaks
  -- order history — it only loses a now-pointless live link.
  variant_id uuid references public.product_variants (id) on delete set null,
  name_snapshot text not null,
  sku text,
  qty integer not null check (qty > 0),
  unit_price_minor integer not null check (unit_price_minor >= 0),
  line_total_minor integer not null check (line_total_minor >= 0),

  created_at timestamptz not null default now()
);

create index order_items_order_id_idx on public.order_items (order_id);

create table public.order_events (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  -- Free text, not an enum, deliberately: unlike `orders.payment_status` /
  -- `orders.fulfilment_status`, this timeline also carries payment-provider
  -- and staff-note events an enum can't anticipate up front.
  status text not null,
  note text,
  -- Null for system/webhook-generated events (payment confirmation, etc.);
  -- set for a staff-driven status change once Phase 3 admin_users exists.
  created_by uuid references auth.users (id) on delete set null,

  created_at timestamptz not null default now()
);

create index order_events_order_id_created_at_idx
  on public.order_events (order_id, created_at);

-- Timestamps ----------------------------------------------------------------

create trigger customers_set_updated_at before update on public.customers
  for each row execute function public.set_updated_at();
create trigger addresses_set_updated_at before update on public.addresses
  for each row execute function public.set_updated_at();
create trigger carts_set_updated_at before update on public.carts
  for each row execute function public.set_updated_at();
create trigger cart_items_set_updated_at before update on public.cart_items
  for each row execute function public.set_updated_at();
create trigger coupons_set_updated_at before update on public.coupons
  for each row execute function public.set_updated_at();
create trigger orders_set_updated_at before update on public.orders
  for each row execute function public.set_updated_at();

-- Row level security ----------------------------------------------------------

alter table public.customers enable row level security;
alter table public.addresses enable row level security;
alter table public.carts enable row level security;
alter table public.cart_items enable row level security;
alter table public.coupons enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.order_events enable row level security;

create policy "a customer can read their own row"
  on public.customers for select using (id = auth.uid());
create policy "a customer can update their own row"
  on public.customers for update using (id = auth.uid()) with check (id = auth.uid());

create policy "a customer can manage their own addresses"
  on public.addresses for all
  using (customer_id = auth.uid())
  with check (customer_id = auth.uid());

-- Guest carts (customer_id is null) match no policy here on purpose — they
-- have no auth.uid() to check against, and are only ever touched by server
-- actions using the service-role client, which bypasses RLS entirely.
create policy "a customer can manage their own cart"
  on public.carts for all
  using (customer_id = auth.uid())
  with check (customer_id = auth.uid());

create policy "a customer can manage items in their own cart"
  on public.cart_items for all
  using (exists (
    select 1 from public.carts c
    where c.id = cart_items.cart_id and c.customer_id = auth.uid()
  ))
  with check (exists (
    select 1 from public.carts c
    where c.id = cart_items.cart_id and c.customer_id = auth.uid()
  ));

-- No policy at all for coupons: never readable by anon or authenticated
-- clients. Validation happens exclusively via the service-role client in a
-- server action, so codes cannot be listed or enumerated by a client.

create policy "a customer can read their own orders"
  on public.orders for select using (customer_id = auth.uid());
create policy "a customer can read their own order items"
  on public.order_items for select using (exists (
    select 1 from public.orders o
    where o.id = order_items.order_id and o.customer_id = auth.uid()
  ));
create policy "a customer can read their own order timeline"
  on public.order_events for select using (exists (
    select 1 from public.orders o
    where o.id = order_events.order_id and o.customer_id = auth.uid()
  ));

-- No insert/update/delete policy on orders, order_items or order_events for
-- any authenticated role: order creation and every status change goes
-- through a server action using the service-role client, per the trust-
-- boundary note at the top of this file.
