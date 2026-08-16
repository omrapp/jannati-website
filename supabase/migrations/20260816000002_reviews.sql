-- Reviews (Task 3.9 admin moderation + decision #13's v1 review feature).
-- Submission is a Phase 4 storefront form, not built yet — this migration
-- and the admin moderation queue exist first on purpose, so Phase 4 has a
-- table and a `pending` state to land rows into instead of building both
-- ends at once.

create type public.review_status as enum ('pending', 'approved', 'rejected');

create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete cascade,
  customer_id uuid not null references public.customers (id) on delete cascade,
  rating smallint not null check (rating between 1 and 5),
  body text not null,
  status public.review_status not null default 'pending',

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index reviews_product_id_idx on public.reviews (product_id);
-- Moderation queue reads pending-oldest-first; this is that query's index.
create index reviews_status_created_at_idx on public.reviews (status, created_at);

create trigger reviews_set_updated_at before update on public.reviews
  for each row execute function public.set_updated_at();

alter table public.reviews enable row level security;

-- Approved reviews are storefront content, same "only the finished state is
-- public" shape as `products.status = 'active'` and `content_pages.published`.
create policy "approved reviews are publicly readable"
  on public.reviews for select
  using (status = 'approved');

-- A customer can always see their own review regardless of moderation state
-- (so "your review is pending" is renderable), and can submit one — always
-- landing as `pending`, never self-approved.
create policy "customers can read their own reviews"
  on public.reviews for select
  using (customer_id = auth.uid());

create policy "customers can submit their own reviews"
  on public.reviews for insert
  with check (customer_id = auth.uid() and status = 'pending');

create policy "admins can manage reviews"
  on public.reviews for all
  using (public.is_admin())
  with check (public.is_admin());
