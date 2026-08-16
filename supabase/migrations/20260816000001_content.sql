-- Admin content (Task 3.8): homepage banners and DB-driven content pages —
-- the last two pieces of decision #15 ("Static content: seeded from
-- darbeauty copy, stored in DB, editable in admin") not yet in the schema.

-- Content pages -----------------------------------------------------------
--
-- `/[locale]/p/[slug]` has been routing on this slug since Phase 0, waiting
-- on this table (see that page's own comment). Slug is fixed at creation —
-- editable in the admin form, not the schema, but the admin UI won't offer
-- it, so existing links (`/en-om/p/about`, footer nav, ...) don't break out
-- from under themselves.

create table public.content_pages (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9-]+$'),
  title_ar text not null,
  title_en text,
  body_ar text not null,
  body_en text,
  published boolean not null default false,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger content_pages_set_updated_at before update on public.content_pages
  for each row execute function public.set_updated_at();

alter table public.content_pages enable row level security;

-- Published pages are storefront content; a draft page mid-edit isn't ready
-- for a shopper to hit directly, same "only the finished state is public"
-- shape as `products.status = 'active'`.
create policy "published content pages are publicly readable"
  on public.content_pages for select
  using (published = true);

create policy "admins can manage content pages"
  on public.content_pages for all
  using (public.is_admin())
  with check (public.is_admin());

-- Banners -------------------------------------------------------------------
--
-- Homepage carousel. No storefront consumer wired yet (no task has asked for
-- one) — this is the admin-editable source those slots will read from once
-- one does. `image_path` is Storage-bucket-relative, not a URL, same as
-- `brands.logo_path`.
--
-- No RLS policy at all, same deliberate posture as `coupons` (see that
-- table's comment): the image itself lives in the `banners` Storage bucket
-- below, which has no client-writable policy either, so every banner write
-- already has to go through the service-role client
-- (`src/lib/admin/content.ts`) regardless of what a table policy would say.
-- `checkAdminAccess()` in the calling server action is the actual gate.

create table public.banners (
  id uuid primary key default gen_random_uuid(),
  image_path text not null,
  link text,
  title_ar text,
  title_en text,
  sort_order smallint not null default 0,
  active boolean not null default true,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger banners_set_updated_at before update on public.banners
  for each row execute function public.set_updated_at();

alter table public.banners enable row level security;

insert into storage.buckets (id, name, public)
values ('banners', 'banners', true)
on conflict (id) do nothing;

create policy "banner images are publicly readable"
  on storage.objects for select
  using (bucket_id = 'banners');
