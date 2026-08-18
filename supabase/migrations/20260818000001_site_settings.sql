-- Phase 5 (Task 5.1): site-wide contact info, social links, and map
-- coordinates — one row, editable in `/admin/settings`, read publicly by the
-- header/footer/home hero/contact page. Also adds the public-read policy
-- `banners` was deliberately missing (see 20260816000001_content.sql) — the
-- home hero (Task 5.7) is the first storefront consumer of that table.

-- `id boolean primary key default true check (id)` is the standard
-- singleton-row trick: only `true` ever satisfies the check, so a second
-- `insert` collides on the primary key instead of creating a second row.
create table public.site_settings (
  id boolean primary key default true check (id),

  phone text,
  whatsapp text,
  whatsapp_show boolean not null default true,
  email text,
  address_ar text,
  address_en text,
  map_lat numeric,
  map_lng numeric,

  instagram_url text,
  facebook_url text,
  tiktok_url text,
  x_url text,
  youtube_url text,

  updated_at timestamptz not null default now()
);

create trigger site_settings_set_updated_at before update on public.site_settings
  for each row execute function public.set_updated_at();

alter table public.site_settings enable row level security;

-- Public read: header, footer, contact page, and home hero all need this
-- unauthenticated, same posture as `content_pages`' published rows.
create policy "site settings are publicly readable"
  on public.site_settings for select
  using (true);

create policy "admins can manage site settings"
  on public.site_settings for all
  using (public.is_admin())
  with check (public.is_admin());

-- Seed the single row now so `getSiteSettings` never has to special-case
-- "no row yet" — every field starts null (mock data comes later via admin,
-- per the locked decision), except the two booleans, which need real
-- defaults to mean anything.
insert into public.site_settings (id) values (true)
on conflict (id) do nothing;

-- Banners public read ---------------------------------------------------
--
-- `banners` shipped with no select policy at all (Task 3.8) because nothing
-- storefront-side read it yet. Task 5.7 makes the home hero the first
-- consumer, so it needs the same "only the finished/active state is public"
-- shape every other storefront-readable table already has.
create policy "active banners are publicly readable"
  on public.banners for select
  using (active = true);
