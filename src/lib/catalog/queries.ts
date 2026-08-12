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
import { createClient } from '@/lib/supabase/server';

import {
  toBrandSummary,
  toCategorySummary,
  toProductDetail,
  toProductSummary,
  type BrandSummary,
  type CategorySummary,
  type CountryRow,
  type ProductDetail,
  type ProductJoin,
  type ProductSummary,
} from './mappers';

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
 * are being filtered on.
 */
function summaryColumns(filters: { brandSlug?: string; categorySlug?: string }): string {
  const brands = `brands${filters.brandSlug ? '!inner' : ''} ( slug, name_en, name_ar, logo_path )`;
  const categories = filters.categorySlug
    ? ', product_categories!inner ( categories!inner ( slug ) )'
    : '';

  return `
    handle, name_ar, name_en,
    ${brands},
    product_variants ( id, sku, title_ar, title_en, base_price_minor, compare_at_minor, stock_qty, position ),
    product_images ( storage_path, alt_ar, alt_en, position )${categories}
  `;
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
};

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
  const { locale, brandSlug, categorySlug } = options;
  const page = Math.max(1, options.page ?? 1);
  const pageSize = Math.min(60, Math.max(1, options.pageSize ?? DEFAULT_PAGE_SIZE));
  const from = (page - 1) * pageSize;

  const [country, supabase] = await Promise.all([getCountry(locale), createClient()]);

  // The count is exact and the range is bounded: the catalog is never fetched
  // whole, whatever a caller passes.
  let query = supabase
    .from('products')
    .select(summaryColumns({ brandSlug, categorySlug }), { count: 'exact' })
    .order('published_at', { ascending: false, nullsFirst: false })
    .order('handle', { ascending: true })
    .range(from, from + pageSize - 1);

  if (brandSlug) query = query.eq('brands.slug', brandSlug);
  if (categorySlug) query = query.eq('product_categories.categories.slug', categorySlug);

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
