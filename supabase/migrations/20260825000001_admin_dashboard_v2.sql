-- Admin dashboard v2: bulk-archive for brands/categories, customer
-- moderation (login/checkout blocks), a per-admin notification cursor, and
-- the indexes the new dashboard/analytics/notification queries need.

-- Brands / categories: soft-delete (archive), recoverable ------------------
--
-- Products already have this via product_status='archived'. Brands and
-- categories never got an equivalent column, so bulk "delete" for them adds
-- one. RLS is the storefront's only enforcement point (queries.ts filters
-- nothing client-side), so hiding archived rows from the public is a policy
-- rewrite, not a query change anywhere else.

alter table public.brands add column is_archived boolean not null default false;
alter table public.categories add column is_archived boolean not null default false;

create index brands_is_archived_idx on public.brands (is_archived);
create index categories_is_archived_idx on public.categories (is_archived);

drop policy "brands are publicly readable" on public.brands;
create policy "brands are publicly readable"
  on public.brands for select using (is_archived = false);

drop policy "categories are publicly readable" on public.categories;
create policy "categories are publicly readable"
  on public.categories for select using (is_archived = false);

-- The existing "admins can manage brands/categories" for-all policies
-- already grant staff full visibility regardless of is_archived — nothing
-- to change there.

-- Customers: two independently configurable moderation flags ---------------
--
-- Login-block and checkout-block are separate: a customer can be barred
-- from signing in at all, or allowed to browse/sign in but not check out.

alter table public.customers add column is_login_blocked boolean not null default false;
alter table public.customers add column is_checkout_blocked boolean not null default false;
alter table public.customers add column blocked_reason text;
alter table public.customers add column blocked_at timestamptz;

-- Security fix, required before the columns above are safe to use: the
-- existing "a customer can update their own row" policy has no column
-- restriction, so a signed-in customer could PATCH is_login_blocked /
-- is_checkout_blocked back to false themselves via a raw PostgREST call.
-- A column-level GRANT closes this independent of the RLS row check.
-- Service-role (every admin write in this app) bypasses RLS and GRANTs
-- entirely, so admin moderation is unaffected.
revoke update on public.customers from authenticated;
grant update (phone, default_locale, marketing_opt_in) on public.customers to authenticated;

-- Notifications: a per-admin "last seen" cursor, not a notifications table -
--
-- The underlying signals (contact_messages.is_read, reviews.status,
-- orders.fulfilment_status) already carry their own actionable state; this
-- column just drives "new since I last opened the panel" grouping in the UI
-- without a second, duplicate source of truth to keep in sync.

alter table public.admin_users add column notifications_seen_at timestamptz not null default now();

-- Indexes for the new dashboard/analytics/notification query paths ---------

-- Dashboard revenue/order date-range scans: the only existing index
-- touching created_at is the composite (customer_id, created_at), which a
-- plain date-range scan across all orders won't use.
create index orders_created_at_idx on public.orders (created_at);

-- Notification badge counts stay cheap regardless of table growth — the
-- "unread"/"needs fulfilment" set is always a small fraction of the table,
-- so partial indexes on the exact predicates used.
create index contact_messages_is_read_idx
  on public.contact_messages (is_read) where is_read = false;

create index orders_needs_fulfilment_idx
  on public.orders (fulfilment_status)
  where payment_status = 'paid' and fulfilment_status = 'pending';

-- reviews_status_created_at_idx (20260816000002_reviews.sql) already covers
-- the pending-reviews-count query — no new index needed there.
