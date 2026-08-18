import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';

import { Pagination } from '@/components/commerce/pagination';
import { ProductGrid } from '@/components/commerce/product-grid';
import { isLocale } from '@/i18n/config';
import { searchProducts } from '@/lib/catalog/search';

type Search = Promise<{ q?: string; page?: string }>;

// No canonical/hreflang here: every `?q=` value is functionally a different
// page but not one worth indexing on its own — `noindex, follow` keeps
// crawlers off search-result pages while still following links out of them.
export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};

  const [t, tSeo] = await Promise.all([getTranslations('search'), getTranslations('seo')]);

  return {
    title: t('heading'),
    description: tSeo('searchDescription'),
    robots: { index: false, follow: true },
  };
}

export default async function SearchPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Search;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  setRequestLocale(locale);

  const { q, page: pageParam } = await searchParams;
  const query = q ?? '';
  const page = Number.parseInt(pageParam ?? '1', 10) || 1;

  const [t, results] = await Promise.all([
    getTranslations('search'),
    searchProducts({ query, locale, page }),
  ]);

  const hrefFor = (next: number) => {
    const nextParams = new URLSearchParams({ q: query });
    if (next > 1) nextParams.set('page', String(next));
    return `/search?${nextParams.toString()}`;
  };

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-8 px-4 py-10">
      <header className="flex flex-col gap-1">
        <h1 className="font-display text-3xl font-semibold">{t('heading')}</h1>
        {query.trim() ? (
          <p className="text-muted-foreground text-sm">
            {results.total > 0
              ? t('resultsFor', { count: results.total, query })
              : t('noResults', { query })}
          </p>
        ) : (
          <p className="text-muted-foreground text-sm">{t('prompt')}</p>
        )}
      </header>

      <ProductGrid products={results.items} />

      <Pagination page={results.page} pageCount={results.pageCount} hrefFor={hrefFor} />
    </div>
  );
}
