/**
 * Full-text search over the catalog, backed by the `search_products` RPC
 * (`supabase/migrations/20260813000001_search.sql`).
 *
 * The RPC returns ranked handles only, not full rows: the same joined columns
 * every other listing uses are re-fetched here so `toProductSummary` stays
 * the one place that decides what a product card shows.
 */

import { cache } from 'react';

import { parseLocale, type Locale } from '@/i18n/config';
import { createClient } from '@/lib/supabase/server';

import { toProductSummary, type ProductJoin, type ProductSummary } from './mappers';
import { DEFAULT_PAGE_SIZE, getCountry, summaryColumns, type Page } from './queries';

type RankedRow = { handle: string; rank: number };

/**
 * `search_products` is not in the generated types yet — it lands with a
 * migration the user applies by hand, and `db:types` runs after. Narrowly
 * typed here so the rest of the file stays fully checked.
 */
type SearchRpcClient = {
  rpc(
    fn: 'search_products',
    args: { search_query: string; search_language: string },
  ): Promise<{ data: RankedRow[] | null; error: { message: string } | null }>;
};

/**
 * Puts `rows` back into `order`, dropping any handle the follow-up fetch did
 * not return (RLS or a status flip between the RPC call and the re-fetch).
 * Pure so the ranking-to-render seam is tested without a database.
 */
export function orderByHandle<Row extends { handle: string }>(
  rows: Row[],
  order: string[],
): Row[] {
  const byHandle = new Map(rows.map((row) => [row.handle, row]));

  return order.reduce<Row[]>((ordered, handle) => {
    const row = byHandle.get(handle);
    if (row) ordered.push(row);
    return ordered;
  }, []);
}

/**
 * Slices an already-ranked list of handles into one page. Pure and
 * database-free: the RPC does the ranking, this does the paging, and the two
 * stay decoupled so a page past the end reports the real total instead of
 * losing it along with the (correctly empty) row set.
 */
export function paginateHandles(
  handles: string[],
  page: number,
  pageSize: number,
): { pageHandles: string[]; total: number; pageCount: number } {
  const total = handles.length;
  const from = (page - 1) * pageSize;

  return {
    pageHandles: handles.slice(from, from + pageSize),
    total,
    pageCount: Math.max(1, Math.ceil(total / pageSize)),
  };
}

export type SearchOptions = {
  query: string;
  locale: Locale;
  page?: number;
  pageSize?: number;
};

/**
 * Cached for the render: a search page reads the count for its heading and
 * the items for its grid.
 */
export const searchProducts = cache(async function searchProducts(
  options: SearchOptions,
): Promise<Page<ProductSummary> & { query: string }> {
  const query = options.query.trim();
  const page = Math.max(1, options.page ?? 1);
  const pageSize = Math.min(60, Math.max(1, options.pageSize ?? DEFAULT_PAGE_SIZE));

  const empty = { items: [], total: 0, page, pageSize, pageCount: 1, query };
  if (!query) return empty;

  const { language } = parseLocale(options.locale);
  const [country, supabase] = await Promise.all([getCountry(options.locale), createClient()]);

  const { data: ranked, error: rankError } = await (supabase as unknown as SearchRpcClient).rpc(
    'search_products',
    { search_query: query, search_language: language },
  );

  if (rankError) throw new Error(`searching products: ${rankError.message}`);

  const allHandles = (ranked ?? []).map((row) => row.handle);
  if (allHandles.length === 0) return empty;

  const { pageHandles, total, pageCount } = paginateHandles(allHandles, page, pageSize);
  if (pageHandles.length === 0) return { items: [], total, page, pageSize, pageCount, query };

  const { data: summaries, error: fetchError } = await supabase
    .from('products')
    .select(summaryColumns({}))
    .in('handle', pageHandles);

  if (fetchError) throw new Error(`fetching search results: ${fetchError.message}`);

  const items = orderByHandle(summaries as unknown as ProductJoin[], pageHandles).map((row) =>
    toProductSummary(row, country, options.locale),
  );

  return { items, total, page, pageSize, pageCount, query };
});
