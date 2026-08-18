import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';

import { FilterPanel } from '@/components/commerce/filter-panel';
import { Pagination } from '@/components/commerce/pagination';
import { ProductGrid } from '@/components/commerce/product-grid';
import { SortSelect } from '@/components/commerce/sort-select';
import { isLocale } from '@/i18n/config';
import { parseProductFilters, serializeProductFilters } from '@/lib/catalog/query-params';
import { listBrandFacets, listCategoryFacets, listProducts } from '@/lib/catalog/queries';
import { localeAlternates } from '@/lib/seo/alternates';

type Search = Promise<Record<string, string | string[] | undefined>>;

// hreflang/canonical ignore filter/sort query params on purpose — those are
// the same catalog document under a facet, not a distinct page to index.
export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};

  const [t, tSeo] = await Promise.all([getTranslations('catalog'), getTranslations('seo')]);

  return {
    title: t('allProducts'),
    description: tSeo('productsDescription'),
    alternates: localeAlternates(locale, '/products'),
  };
}

export default async function ProductsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Search;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  setRequestLocale(locale);

  const rawQuery = await searchParams;
  const filters = parseProductFilters(rawQuery);
  const page = Number.parseInt(String(rawQuery.page ?? '1'), 10) || 1;

  const [t, tNav, products, brandFacets, categoryFacets] = await Promise.all([
    getTranslations('catalog'),
    getTranslations('nav'),
    listProducts({
      locale,
      page,
      brandSlug: filters.brandSlug,
      categorySlug: filters.categorySlug,
      minPriceMajor: filters.minPrice,
      maxPriceMajor: filters.maxPrice,
      inStockOnly: filters.inStockOnly,
      sort: filters.sort,
    }),
    listBrandFacets(locale, {
      categorySlug: filters.categorySlug,
      minPriceMajor: filters.minPrice,
      maxPriceMajor: filters.maxPrice,
      inStockOnly: filters.inStockOnly,
    }),
    listCategoryFacets(locale, {
      brandSlug: filters.brandSlug,
      minPriceMajor: filters.minPrice,
      maxPriceMajor: filters.maxPrice,
      inStockOnly: filters.inStockOnly,
    }),
  ]);

  const heading =
    filters.sort === 'new'
      ? tNav('newArrivals')
      : filters.sort === 'best-selling'
        ? tNav('bestSellers')
        : t('allProducts');

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-8 px-4 py-10">
      <header className="flex flex-col gap-1">
        <h1 className="font-display text-3xl font-semibold">{heading}</h1>
        <p className="text-muted-foreground text-sm">{t('count', { count: products.total })}</p>
      </header>

      <div className="flex items-center gap-3">
        <FilterPanel filters={filters} brands={brandFacets} categories={categoryFacets} />
        <SortSelect filters={filters} />
      </div>

      <ProductGrid products={products.items} />

      <Pagination
        page={products.page}
        pageCount={products.pageCount}
        hrefFor={(next) => {
          const query = serializeProductFilters(filters, next);
          const qs = new URLSearchParams(query).toString();
          return qs ? `/products?${qs}` : '/products';
        }}
      />
    </div>
  );
}
