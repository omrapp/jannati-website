-- Task 4.2: wishlist. Account-only, no guest wishlist — unlike the cart,
-- there's no cookie-token identity for a wishlist to hang off of, and the
-- plan doesn't ask for one.

create table public.wishlist_items (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers (id) on delete cascade,
  product_id uuid not null references public.products (id) on delete cascade,

  created_at timestamptz not null default now(),

  unique (customer_id, product_id)
);

create index wishlist_items_customer_id_idx on public.wishlist_items (customer_id);

alter table public.wishlist_items enable row level security;

-- Same shape as `addresses`: a customer reads/writes only their own rows,
-- checked both by the `using` (existing rows) and `with check` (new/changed
-- rows) clauses so a client can't smuggle a different `customer_id` through.
create policy "a customer can manage their own wishlist"
  on public.wishlist_items for all
  using (customer_id = auth.uid())
  with check (customer_id = auth.uid());
