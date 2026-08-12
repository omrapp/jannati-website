-- Countries drive currency, tax and shipping for every storefront.
--
-- Money is stored in integer minor units everywhere in this schema. The number
-- of minor units per major unit differs by currency: OMR, KWD and BHD are
-- 1000-based (3 decimals), AED, SAR and QAR are 100-based (2 decimals).
-- Product prices are stored once in OMR minor units (baisa) and converted at
-- read time using fx_rate_from_omr, then rounded up to rounding_step_minor.

create table public.countries (
  code text primary key check (code ~ '^[a-z]{2}$'),
  name_ar text not null,
  name_en text not null,

  currency text not null check (currency ~ '^[A-Z]{3}$'),
  -- Decimal places for the currency: 3 for OMR/KWD/BHD, 2 for AED/SAR/QAR.
  currency_exponent smallint not null check (currency_exponent between 0 and 3),
  -- Major units of this currency per 1 OMR, e.g. 9.55 AED. Staff-maintained.
  fx_rate_from_omr numeric(14, 6) not null check (fx_rate_from_omr > 0),
  -- Converted prices are rounded up to a multiple of this many minor units.
  rounding_step_minor integer not null default 1 check (rounding_step_minor > 0),

  -- VAT is added as a separate line at checkout, not baked into shelf prices.
  vat_rate numeric(5, 4) not null default 0 check (vat_rate >= 0 and vat_rate < 1),

  shipping_flat_minor integer not null default 0 check (shipping_flat_minor >= 0),
  free_shipping_threshold_minor integer check (free_shipping_threshold_minor >= 0),

  -- Countries can be switched off without deleting their pricing history.
  enabled boolean not null default true,
  sort_order smallint not null default 0,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on column public.countries.fx_rate_from_omr is
  'Minor units of this currency per 1 OMR (major unit). Staff-maintained, not live FX.';

alter table public.countries enable row level security;

-- Storefront needs to read country settings; writes are staff-only and are
-- added with the admin role in Phase 3. Until then only the service role writes.
create policy "countries are publicly readable"
  on public.countries for select
  using (true);

-- Seed values below are placeholders. FX rates, shipping rates and thresholds
-- must be confirmed by the shop before launch; all are editable in the admin.
insert into public.countries (
  code, name_ar, name_en, currency, currency_exponent, fx_rate_from_omr,
  rounding_step_minor, vat_rate, shipping_flat_minor, free_shipping_threshold_minor, sort_order
) values
  ('om', 'سلطنة عُمان', 'Oman',                 'OMR', 3, 1.000000,  5,  0.0500,  2000,  20000, 1),
  ('ae', 'الإمارات',    'United Arab Emirates', 'AED', 2, 9.550000, 25,  0.0500,  2000,  20000, 2),
  ('sa', 'السعودية',    'Saudi Arabia',         'SAR', 2, 9.750000, 25,  0.1500,  2500,  25000, 3),
  ('kw', 'الكويت',      'Kuwait',               'KWD', 3, 0.798000,  5,  0.0000,  2000,  20000, 4),
  ('qa', 'قطر',         'Qatar',                'QAR', 2, 9.470000, 25,  0.0000,  2500,  25000, 5),
  ('bh', 'البحرين',     'Bahrain',              'BHD', 3, 0.980000,  5,  0.1000,  2000,  20000, 6);
