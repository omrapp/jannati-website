/**
 * Server-side catalog reads. Every storefront page goes through here.
 *
 * Each query names its columns rather than selecting `*`: a product row with
 * two long descriptions in two languages is heavy, and a listing renders none
 * of it. Rows come back already language-resolved and priced for the active
 * country, so pages never touch money or fallback logic themselves.
 *
 * Reads go through the anon client, so RLS decides what is visible: only
 * `status = 'active'` products, and only their variants and imagery.
 */

import { cache } from 'react';

import { parseLocale, type Locale } from '@/i18n/config';
import { convertToOmrBound, majorDecimalToMinor } from '@/lib/commerce/money';
import type { CountryPricing } from '@/lib/commerce/types';
import { createClient } from '@/lib/supabase/server';

import {
  text,
  toBrandSummary,
  toCategorySummary,
  toCountryPricing,
  toProductDetail,
  toProductSummary,
  type BrandSummary,
  type CategorySummary,
  type CountryRow,
  type ProductDetail,
  type ProductJoin,
  type ProductSummary,
} from './mappers';
import type { ProductSort } from './query-params';

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

const PRODUCT_COLUMNS = `
  handle, name_ar, name_en, description_ar, description_en,
  brands ( slug, name_en, name_ar, logo_path ),
  product_variants ( id, sku, title_ar, title_en, base_price_minor, compare_at_minor, stock_qty, position ),
  product_images ( storage_path, alt_ar, alt_en, position )
`;

/**
 * Listings never need the descriptions, which are the bulk of a product row.
 *
 * A filter on an embedded table only narrows the parent rows when that embed is
 * an inner join, so the brand and category embeds turn inner exactly when they
 * are being filtered on. `variantFilter` does the same for `product_variants`,
 * pinned to its lead variant (position 1) — set only when `listProducts` is
 * about to filter on that variant's price or stock at the Postgres level.
 */
export function summaryColumns(filters: {
  brandSlug?: string;
  categorySlug?: string;
  variantFilter?: boolean;
}): string {
  const brands = `brands${filters.brandSlug ? '!inner' : ''} ( slug, name_en, name_ar, logo_path )`;
  const categories = filters.categorySlug
    ? ', product_categories!inner ( categories!inner ( slug ) )'
    : '';
  const variants = `product_variants${filters.variantFilter ? '!inner' : ''} ( id, sku, title_ar, title_en, base_price_minor, compare_at_minor, stock_qty, position )`;

  return `
    handle, name_ar, name_en,
    ${brands},
    ${variants},
    product_images ( storage_path, alt_ar, alt_en, position )${categories}
  `;
}

/**
 * Columns for the price-sort path, rooted on `product_variants` instead of
 * `products` — see the comment on the `sort` branch in `listProducts` for why.
 */
function leadVariantColumns(filters: { brandSlug?: string; categorySlug?: string }): string {
  const brands = `brands${filters.brandSlug ? '!inner' : ''} ( slug, name_en, name_ar, logo_path )`;
  const categories = filters.categorySlug
    ? ', product_categories!inner ( categories!inner ( slug ) )'
    : '';

  return `
    id, sku, title_ar, title_en, base_price_minor, compare_at_minor, stock_qty, position,
    products!inner (
      handle, name_ar, name_en,
      ${brands},
      product_images ( storage_path, alt_ar, alt_en, position )${categories}
    )
  `;
}

type LeadVariantRow = {
  id: string;
  sku: string | null;
  title_ar: string | null;
  title_en: string | null;
  base_price_minor: number;
  compare_at_minor: number | null;
  stock_qty: number;
  position: number;
  products: Omit<ProductJoin, 'description_ar' | 'description_en' | 'product_variants'>;
};

/**
 * Reshapes one variant-rooted row back into the product-rooted shape
 * `toProductSummary` expects. Holds only the single lead variant this query
 * already filtered to — the same one `toProductSummary` would have picked
 * first out of a full list, so the card renders identically either way.
 * Descriptions come back `null`: listings never render them, and the mapper
 * never reads them outside `toProductDetail`.
 */
function leadVariantRowToProductJoin(row: LeadVariantRow): ProductJoin {
  const { products, ...variant } = row;

  return {
    ...products,
    description_ar: null,
    description_en: null,
    product_variants: [variant],
  };
}

export const DEFAULT_PAGE_SIZE = 24;

export type Page<Item> = {
  items: Item[];
  total: number;
  page: number;
  pageSize: number;
  pageCount: number;
};

export type ListProductsOptions = {
  locale: Locale;
  page?: number;
  pageSize?: number;
  brandSlug?: string;
  categorySlug?: string;
  /**
   * Validated non-negative decimal string (e.g. `"25.5"`) in the shopper's
   * active currency — never OMR. A value with more fractional digits than
   * the currency supports is dropped rather than rejected — see
   * `majorDecimalToMinor`.
   */
  minPriceMajor?: string;
  maxPriceMajor?: string;
  inStockOnly?: boolean;
  sort?: ProductSort;
};

/**
 * Turns a shopper-typed price range (major units, active currency) into an
 * OMR minor-unit range to filter `base_price_minor` against. A price with too
 * many fractional digits for the currency, or otherwise malformed, degrades
 * to "no filter" for that bound — same as a dropped URL param, never a query
 * error over a shopper-typed price. Shared by `listProducts` and the facet
 * counters below so the two never drift apart on how a bound is computed.
 */
function resolvePriceOmrBounds(
  pricing: CountryPricing,
  minPriceMajor: string | undefined,
  maxPriceMajor: string | undefined,
): { minPriceOmr?: number; maxPriceOmr?: number } {
  const minPriceMinor =
    minPriceMajor !== undefined ? majorDecimalToMinor(minPriceMajor, pricing.currencyExponent) : null;
  const maxPriceMinor =
    maxPriceMajor !== undefined ? majorDecimalToMinor(maxPriceMajor, pricing.currencyExponent) : null;

  return {
    minPriceOmr: minPriceMinor !== null ? convertToOmrBound(minPriceMinor, pricing, 'floor') : undefined,
    maxPriceOmr: maxPriceMinor !== null ? convertToOmrBound(maxPriceMinor, pricing, 'ceil') : undefined,
  };
}

/**
 * The active country's pricing row. Cached for the render, so a page with a
 * dozen priced components still asks once.
 */
export const getCountry = cache(async (locale: Locale): Promise<CountryRow> => {
  const { country } = parseLocale(locale);
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('countries')
    .select('code, currency, currency_exponent, fx_rate_from_omr, rounding_step_minor')
    .eq('code', country)
    .eq('enabled', true)
    .single();

  if (error || !data) {
    throw new Error(`no pricing row for country ${country}: ${error?.message ?? 'not found'}`);
  }

  return data;
});

export async function listProducts(options: ListProductsOptions): Promise<Page<ProductSummary>> {
  const { locale, brandSlug, categorySlug, inStockOnly } = options;
  const page = Math.max(1, options.page ?? 1);
  const pageSize = Math.min(60, Math.max(1, options.pageSize ?? DEFAULT_PAGE_SIZE));
  const from = (page - 1) * pageSize;

  const [country, supabase] = await Promise.all([getCountry(locale), createClient()]);
  const pricing = toCountryPricing(country);
  const { minPriceOmr, maxPriceOmr } = resolvePriceOmrBounds(
    pricing,
    options.minPriceMajor,
    options.maxPriceMajor,
  );

  const hasVariantFilter = minPriceOmr !== undefined || maxPriceOmr !== undefined || Boolean(inStockOnly);

  // Ordering by an embedded table's column only sorts rows *within* each
  // parent — PostgREST has no "order the parents by a child column" — so a
  // price sort roots the query on `product_variants` instead, where
  // `base_price_minor` is a top-level, sortable column.
  if (options.sort === 'price-asc' || options.sort === 'price-desc') {
    let query = supabase
      .from('product_variants')
      .select(leadVariantColumns({ brandSlug, categorySlug }), { count: 'exact' })
      .eq('position', 1)
      .order('base_price_minor', { ascending: options.sort === 'price-asc' })
      .range(from, from + pageSize - 1);

    if (brandSlug) query = query.eq('products.brands.slug', brandSlug);
    if (categorySlug) query = query.eq('products.product_categories.categories.slug', categorySlug);
    if (minPriceOmr !== undefined) query = query.gte('base_price_minor', minPriceOmr);
    if (maxPriceOmr !== undefined) query = query.lte('base_price_minor', maxPriceOmr);
    if (inStockOnly) query = query.gt('stock_qty', 0);

    const { data, error, count } = await query;

    if (error) throw new Error(`listing products: ${error.message}`);

    const total = count ?? 0;

    return {
      items: (data as unknown as LeadVariantRow[]).map((row) =>
        toProductSummary(leadVariantRowToProductJoin(row), country, locale),
      ),
      total,
      page,
      pageSize,
      pageCount: Math.max(1, Math.ceil(total / pageSize)),
    };
  }

  // The count is exact and the range is bounded: the catalog is never fetched
  // whole, whatever a caller passes.
  let query = supabase
    .from('products')
    .select(
      summaryColumns({ brandSlug, categorySlug, variantFilter: hasVariantFilter }),
      { count: 'exact' },
    )
    .order('published_at', { ascending: false, nullsFirst: false })
    .order('handle', { ascending: true })
    .range(from, from + pageSize - 1);

  if (brandSlug) query = query.eq('brands.slug', brandSlug);
  if (categorySlug) query = query.eq('product_categories.categories.slug', categorySlug);
  // `variantFilter` pins the embed to the lead variant (position 1); without
  // that pin, a price/stock filter on `product_variants` would match a
  // product whose *some* variant qualifies, not necessarily the one priced.
  if (hasVariantFilter) query = query.eq('product_variants.position', 1);
  if (minPriceOmr !== undefined) query = query.gte('product_variants.base_price_minor', minPriceOmr);
  if (maxPriceOmr !== undefined) query = query.lte('product_variants.base_price_minor', maxPriceOmr);
  if (inStockOnly) query = query.gt('product_variants.stock_qty', 0);

  const { data, error, count } = await query;

  if (error) throw new Error(`listing products: ${error.message}`);

  const total = count ?? 0;

  return {
    items: (data as unknown as ProductJoin[]).map((row) => toProductSummary(row, country, locale)),
    total,
    page,
    pageSize,
    pageCount: Math.max(1, Math.ceil(total / pageSize)),
  };
}

/**
 * Cached for the render: a product page asks once for its metadata and again
 * for its body, and this is the heaviest join in the catalog.
 */
export const getProductByHandle = cache(async function getProductByHandle(
  handle: string,
  locale: Locale,
): Promise<ProductDetail | null> {
  const [country, supabase] = await Promise.all([getCountry(locale), createClient()]);

  const { data, error } = await supabase
    .from('products')
    .select(PRODUCT_COLUMNS)
    .eq('handle', handle)
    .maybeSingle();

  if (error) throw new Error(`reading product ${handle}: ${error.message}`);
  if (!data) return null;

  return toProductDetail(data as unknown as ProductJoin, country, locale);
});

export async function listBrands(locale: Locale): Promise<BrandSummary[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('brands')
    .select('slug, name_en, name_ar, logo_path')
    .order('sort_order', { ascending: true })
    .order('name_en', { ascending: true });

  if (error) throw new Error(`listing brands: ${error.message}`);

  return data.map((row) => toBrandSummary(row, locale));
}

export async function listCategories(locale: Locale): Promise<CategorySummary[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('categories')
    .select('slug, name_ar, name_en')
    .order('sort_order', { ascending: true })
    .order('name_ar', { ascending: true });

  if (error) throw new Error(`listing categories: ${error.message}`);

  return data.map((row) => toCategorySummary(row, locale));
}

export type FacetCount = { slug: string; name: string; count: number };

type FacetFilters = {
  brandSlug?: string;
  categorySlug?: string;
  minPriceMajor?: string;
  maxPriceMajor?: string;
  inStockOnly?: boolean;
};

/** Columns needed only to filter `products` down to an id list — see `resolveFilteredProductIds`. */
function idFilterColumns(filters: {
  brandSlug?: string;
  categorySlug?: string;
  variantFilter?: boolean;
}): string {
  const embeds = [
    filters.brandSlug ? 'brands!inner ( slug )' : '',
    filters.categorySlug ? 'product_categories!inner ( categories!inner ( slug ) )' : '',
    filters.variantFilter ? 'product_variants!inner ( stock_qty, base_price_minor, position )' : '',
  ].filter(Boolean);

  return embeds.length ? `id, ${embeds.join(', ')}` : 'id';
}

/**
 * PostgREST caps rows per request at 1000 regardless of the `.range()` asked
 * for — confirmed against the live project: a `.range(0, 1999)` request came
 * back with exactly 1000 rows, silently short. `resolveFilteredProductIds`
 * below pages past that cap instead of trusting a single wide range.
 */
const MAX_ROWS_PER_REQUEST = 1000;

/**
 * Every product id matching a filter set, across as many requests as it
 * takes — the building block for facet counts, which need the *whole*
 * matching set, not a page of it. Fine for a catalog in the low thousands;
 * not meant to scale past that without a rethink.
 */
async function resolveFilteredProductIds(
  supabase: SupabaseServerClient,
  options: {
    brandSlug?: string;
    categorySlug?: string;
    minPriceOmr?: number;
    maxPriceOmr?: number;
    inStockOnly?: boolean;
  },
): Promise<string[]> {
  const variantFilter =
    options.minPriceOmr !== undefined || options.maxPriceOmr !== undefined || Boolean(options.inStockOnly);

  function page(from: number, to: number) {
    let query = supabase
      .from('products')
      .select(idFilterColumns({ brandSlug: options.brandSlug, categorySlug: options.categorySlug, variantFilter }))
      .range(from, to);

    if (options.brandSlug) query = query.eq('brands.slug', options.brandSlug);
    if (options.categorySlug) query = query.eq('product_categories.categories.slug', options.categorySlug);
    if (variantFilter) query = query.eq('product_variants.position', 1);
    if (options.minPriceOmr !== undefined) {
      query = query.gte('product_variants.base_price_minor', options.minPriceOmr);
    }
    if (options.maxPriceOmr !== undefined) {
      query = query.lte('product_variants.base_price_minor', options.maxPriceOmr);
    }
    if (options.inStockOnly) query = query.gt('product_variants.stock_qty', 0);

    return query;
  }

  const ids: string[] = [];
  let from = 0;

  // Stops the moment a page comes back short of a full page — the signal
  // that it was the last one, without needing a separate count query.
  for (;;) {
    const { data, error } = await page(from, from + MAX_ROWS_PER_REQUEST - 1);
    if (error) throw new Error(`resolving filtered product ids: ${error.message}`);

    const rows = data as unknown as { id: string }[];
    ids.push(...rows.map((row) => row.id));

    if (rows.length < MAX_ROWS_PER_REQUEST) break;
    from += MAX_ROWS_PER_REQUEST;
  }

  return ids;
}

/**
 * Chunk size for the `.in()` batches below. Supabase JS sends filter values
 * as URL query params, and a single `.in()` call built from the *whole*
 * catalog's ids (~1000 UUIDs, ~40KB) is empirically rejected with a 400 —
 * confirmed against the live project before this was written, not assumed.
 * 200 ids keeps each request comfortably small; a 1049-product catalog needs
 * at most 6 batched requests for a fully unfiltered facet count.
 */
const FACET_BATCH_SIZE = 200;

function chunk<Item>(items: Item[], size: number): Item[][] {
  const batches: Item[][] = [];
  for (let i = 0; i < items.length; i += size) batches.push(items.slice(i, i + size));

  return batches;
}

/**
 * Per-brand counts for a set of product ids, batched to stay under the
 * `.in()` size limit above. `products!inner` still returns a zero row for a
 * brand with none of the given ids — confirmed empirically — so every brand
 * stays in the result rather than disappearing at zero.
 */
async function tallyByBrand(supabase: SupabaseServerClient, ids: string[]): Promise<Map<string, number>> {
  const counts = new Map<string, number>();

  const batches = await Promise.all(
    chunk(ids, FACET_BATCH_SIZE).map((batch) =>
      supabase.from('brands').select('slug, products!inner ( count )').in('products.id', batch),
    ),
  );

  for (const { data, error } of batches) {
    if (error) throw new Error(`brand facets: ${error.message}`);

    for (const row of data as unknown as { slug: string; products: { count: number }[] }[]) {
      counts.set(row.slug, (counts.get(row.slug) ?? 0) + (row.products[0]?.count ?? 0));
    }
  }

  return counts;
}

/**
 * Per-category counts for a set of product ids. Categories relate to
 * products through a join table (`product_categories`), and grouping a
 * `count()` aggregate through that many-to-many relationship errors in
 * Postgres ("must appear in the GROUP BY clause") — confirmed empirically
 * against the live project, not a theoretical concern. Counting the join
 * rows directly and tallying in JS sidesteps the aggregate entirely.
 */
async function tallyByCategory(supabase: SupabaseServerClient, ids: string[]): Promise<Map<string, number>> {
  const counts = new Map<string, number>();

  const batches = await Promise.all(
    chunk(ids, FACET_BATCH_SIZE).map((batch) =>
      supabase.from('product_categories').select('category_id').in('product_id', batch),
    ),
  );

  for (const { data, error } of batches) {
    if (error) throw new Error(`category facets: ${error.message}`);

    for (const row of data as unknown as { category_id: string }[]) {
      counts.set(row.category_id, (counts.get(row.category_id) ?? 0) + 1);
    }
  }

  return counts;
}

/**
 * Brand facet: every brand with how many products match the *other* active
 * filters (category, price, stock — never brand itself, or every brand but
 * the selected one would show a count of zero).
 */
export async function listBrandFacets(locale: Locale, filters: FacetFilters): Promise<FacetCount[]> {
  const [country, supabase] = await Promise.all([getCountry(locale), createClient()]);
  const pricing = toCountryPricing(country);
  const { minPriceOmr, maxPriceOmr } = resolvePriceOmrBounds(pricing, filters.minPriceMajor, filters.maxPriceMajor);

  const [ids, brands] = await Promise.all([
    resolveFilteredProductIds(supabase, {
      categorySlug: filters.categorySlug,
      minPriceOmr,
      maxPriceOmr,
      inStockOnly: filters.inStockOnly,
    }),
    supabase
      .from('brands')
      .select('slug, name_ar, name_en')
      .order('sort_order', { ascending: true })
      .order('name_en', { ascending: true }),
  ]);

  if (brands.error) throw new Error(`brand facets: ${brands.error.message}`);

  const counts = await tallyByBrand(supabase, ids);

  return (brands.data as { slug: string; name_ar: string; name_en: string | null }[]).map((row) => ({
    slug: row.slug,
    name: (text(row.name_ar, row.name_en, locale) ?? row.name_en) as string,
    count: counts.get(row.slug) ?? 0,
  }));
}

/**
 * Category facet: every category with how many products match the *other*
 * active filters (brand, price, stock — never category itself).
 */
export async function listCategoryFacets(locale: Locale, filters: FacetFilters): Promise<FacetCount[]> {
  const [country, supabase] = await Promise.all([getCountry(locale), createClient()]);
  const pricing = toCountryPricing(country);
  const { minPriceOmr, maxPriceOmr } = resolvePriceOmrBounds(pricing, filters.minPriceMajor, filters.maxPriceMajor);

  const [ids, categories] = await Promise.all([
    resolveFilteredProductIds(supabase, {
      brandSlug: filters.brandSlug,
      minPriceOmr,
      maxPriceOmr,
      inStockOnly: filters.inStockOnly,
    }),
    supabase
      .from('categories')
      .select('id, slug, name_ar, name_en')
      .order('sort_order', { ascending: true })
      .order('name_ar', { ascending: true }),
  ]);

  if (categories.error) throw new Error(`category facets: ${categories.error.message}`);

  const counts = await tallyByCategory(supabase, ids);

  return (categories.data as { id: string; slug: string; name_ar: string; name_en: string | null }[]).map(
    (row) => ({
      slug: row.slug,
      name: (text(row.name_ar, row.name_en, locale) ?? row.name_en) as string,
      count: counts.get(row.id) ?? 0,
    }),
  );
}
