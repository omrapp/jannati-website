-- The catalog: brands, categories, products, variants and imagery.
--
-- Prices live once, in OMR minor units (baisa), on the variant. Every other
-- currency is derived at read time from public.countries — no per-country price
-- rows, so a price change is a single update.
--
-- Full-text search columns are deliberately absent; they arrive with the search
-- task so the tsvector configuration can be chosen alongside the queries.

create type public.product_status as enum ('draft', 'active', 'archived');

-- Tracks where a product's English copy came from, so a machine translation can
-- be found and replaced by staff later.
create type public.translation_status as enum ('missing', 'machine', 'human');

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Brands ---------------------------------------------------------------------

create table public.brands (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9-]+$'),
  name_en text not null,
  name_ar text,
  description_ar text,
  description_en text,
  -- Path within the Storage bucket, not a URL: the bucket may become private.
  logo_path text,
  sort_order smallint not null default 0,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Categories -----------------------------------------------------------------

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9-]+$'),
  parent_id uuid references public.categories (id) on delete set null,
  name_ar text not null,
  name_en text,
  description_ar text,
  description_en text,
  image_path text,
  sort_order smallint not null default 0,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index categories_parent_id_idx on public.categories (parent_id);

-- Products -------------------------------------------------------------------

create table public.products (
  id uuid primary key default gen_random_uuid(),
  -- Kept from the source catalog: it is the storefront URL and the seed key.
  handle text not null unique check (handle ~ '^[a-z0-9-]+$'),
  brand_id uuid references public.brands (id) on delete set null,

  name_ar text not null,
  name_en text,
  description_ar text,
  description_en text,
  en_translation_status public.translation_status not null default 'missing',

  status public.product_status not null default 'draft',
  is_new boolean not null default false,
  -- Source publication date; drives the new-arrivals ordering.
  published_at timestamptz,
  sort_order integer not null default 0,
  tags text[] not null default '{}',

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index products_brand_id_idx on public.products (brand_id);
create index products_status_idx on public.products (status);
create index products_published_at_idx on public.products (published_at desc nulls last);

-- Product <-> category membership (many to many) ------------------------------

create table public.product_categories (
  product_id uuid not null references public.products (id) on delete cascade,
  category_id uuid not null references public.categories (id) on delete cascade,
  position smallint not null default 0,

  primary key (product_id, category_id)
);

-- Category pages read by category first; the primary key covers the reverse.
create index product_categories_category_id_product_id_idx
  on public.product_categories (category_id, product_id);

-- Variants -------------------------------------------------------------------

create table public.product_variants (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete cascade,
  -- Null where the source has no sku; unique treats nulls as distinct, so
  -- several unidentified variants can coexist.
  sku text unique,
  barcode text,
  title_ar text,
  title_en text,

  -- OMR minor units (baisa). Never a float, never another currency.
  base_price_minor integer not null check (base_price_minor >= 0),
  compare_at_minor integer check (compare_at_minor > base_price_minor),

  stock_qty integer not null default 0 check (stock_qty >= 0),
  position smallint not null default 1,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique (product_id, position)
);

create index product_variants_product_id_idx on public.product_variants (product_id);

comment on column public.product_variants.base_price_minor is
  'Price in OMR minor units (baisa). Other currencies are derived at read time.';

-- Images ---------------------------------------------------------------------

create table public.product_images (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete cascade,
  -- Set when the photo belongs to one variant rather than the whole product.
  variant_id uuid references public.product_variants (id) on delete set null,
  storage_path text not null,
  alt_ar text,
  alt_en text,
  position smallint not null default 1,

  created_at timestamptz not null default now(),

  unique (product_id, storage_path)
);

create index product_images_product_id_position_idx
  on public.product_images (product_id, position);

-- Timestamps -----------------------------------------------------------------

create trigger brands_set_updated_at before update on public.brands
  for each row execute function public.set_updated_at();
create trigger categories_set_updated_at before update on public.categories
  for each row execute function public.set_updated_at();
create trigger products_set_updated_at before update on public.products
  for each row execute function public.set_updated_at();
create trigger product_variants_set_updated_at before update on public.product_variants
  for each row execute function public.set_updated_at();
create trigger countries_set_updated_at before update on public.countries
  for each row execute function public.set_updated_at();

-- Row level security ----------------------------------------------------------
--
-- Catalog reads are public. There is no public write policy anywhere: the seed
-- loader uses the service role, and staff writes arrive with admin_users in
-- Phase 3. Draft and archived products stay invisible to the storefront, and
-- their variants and imagery are hidden with them.

alter table public.brands enable row level security;
alter table public.categories enable row level security;
alter table public.products enable row level security;
alter table public.product_categories enable row level security;
alter table public.product_variants enable row level security;
alter table public.product_images enable row level security;

create policy "brands are publicly readable"
  on public.brands for select using (true);

create policy "categories are publicly readable"
  on public.categories for select using (true);

create policy "active products are publicly readable"
  on public.products for select using (status = 'active');

create policy "memberships of active products are publicly readable"
  on public.product_categories for select using (
    exists (
      select 1 from public.products p
      where p.id = product_categories.product_id and p.status = 'active'
    )
  );

create policy "variants of active products are publicly readable"
  on public.product_variants for select using (
    exists (
      select 1 from public.products p
      where p.id = product_variants.product_id and p.status = 'active'
    )
  );

create policy "images of active products are publicly readable"
  on public.product_images for select using (
    exists (
      select 1 from public.products p
      where p.id = product_images.product_id and p.status = 'active'
    )
  );
