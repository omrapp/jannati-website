import { getTranslations, setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';

import { Pagination } from '@/components/commerce/pagination';
import { ProductGrid } from '@/components/commerce/product-grid';
import { isLocale } from '@/i18n/config';
import { listProducts } from '@/lib/catalog/queries';

type Search = Promise<{ page?: string }>;

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

  const { page: pageParam } = await searchParams;
  const page = Number.parseInt(pageParam ?? '1', 10) || 1;

  const [t, products] = await Promise.all([
    getTranslations('catalog'),
    listProducts({ locale, page }),
  ]);

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-8 px-4 py-10">
      <header className="flex flex-col gap-1">
        <h1 className="font-display text-3xl font-semibold">{t('allProducts')}</h1>
        <p className="text-muted-foreground text-sm">{t('count', { count: products.total })}</p>
      </header>

      <ProductGrid products={products.items} />

      <Pagination
        page={products.page}
        pageCount={products.pageCount}
        hrefFor={(next) => (next === 1 ? '/products' : `/products?page=${next}`)}
      />
    </div>
  );
}
