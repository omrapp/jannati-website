/**
 * URL <-> filter-state translation for the product listing pages.
 *
 * Pure and dependency-free on purpose: `queries.ts` (server-only, pulls in
 * the Supabase client) must never end up in a client bundle, and this module
 * is imported directly by client components (`filter-panel.tsx`,
 * `sort-select.tsx`), so it defines `ProductSort` itself rather than
 * importing it from `queries.ts`.
 */

export type ProductSort = 'newest' | 'price-asc' | 'price-desc';

export const SORT_OPTIONS: readonly ProductSort[] = ['newest', 'price-asc', 'price-desc'];

export type ProductFilters = {
  brandSlug?: string;
  categorySlug?: string;
  /**
   * A validated non-negative decimal string (e.g. `"25.5"`) in the shopper's
   * active currency — never OMR, and never parsed to a `number` here. How
   * many fractional digits the currency actually supports depends on the
   * active country, which this module does not know; `queries.ts` rejects a
   * value with too much precision once it does.
   */
  minPrice?: string;
  maxPrice?: string;
  inStockOnly?: boolean;
  sort?: ProductSort;
};

type RawQuery = Record<string, string | string[] | undefined>;

const DECIMAL = /^\d+(\.\d+)?$/;

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

/**
 * Exported so `filter-panel.tsx` validates a typed price against the exact
 * same rule this module uses on a URL param — one regex, not two copies that
 * can drift.
 */
export function parseDecimal(value: string | undefined): string | undefined {
  return value !== undefined && DECIMAL.test(value) ? value : undefined;
}

function isSortOption(value: string | undefined): value is ProductSort {
  return value !== undefined && (SORT_OPTIONS as string[]).includes(value);
}

/**
 * Reads filter state out of a page's or router's search params. Unrecognised
 * or malformed values are dropped rather than thrown on — a hand-edited or
 * stale URL degrades to "no filter", not an error page.
 */
export function parseProductFilters(params: RawQuery): ProductFilters {
  const sort = first(params.sort);

  return {
    brandSlug: first(params.brand) || undefined,
    categorySlug: first(params.category) || undefined,
    minPrice: parseDecimal(first(params.minPrice)),
    maxPrice: parseDecimal(first(params.maxPrice)),
    inStockOnly: first(params.inStock) === '1',
    sort: isSortOption(sort) ? sort : undefined,
  };
}

/**
 * Serializes filters (and optionally a page number) back into a query
 * object, dropping empty and default values so the URL stays minimal —
 * `?sort=newest` would otherwise look like a different page than no `sort`
 * param at all, splitting the same listing across two shareable URLs.
 */
export function serializeProductFilters(
  filters: ProductFilters,
  page?: number,
): Record<string, string> {
  const query: Record<string, string> = {};

  if (filters.brandSlug) query.brand = filters.brandSlug;
  if (filters.categorySlug) query.category = filters.categorySlug;
  if (filters.minPrice !== undefined) query.minPrice = filters.minPrice;
  if (filters.maxPrice !== undefined) query.maxPrice = filters.maxPrice;
  if (filters.inStockOnly) query.inStock = '1';
  if (filters.sort && filters.sort !== 'newest') query.sort = filters.sort;
  if (page && page > 1) query.page = String(page);

  return query;
}
