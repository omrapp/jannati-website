import { getTranslations, setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';

import { Pagination } from '@/components/commerce/pagination';
import { ProductGrid } from '@/components/commerce/product-grid';
import { isLocale, type Locale } from '@/i18n/config';
import { listCategories, listProducts } from '@/lib/catalog/queries';

type Params = Promise<{ locale: string; slug: string }>;
type Search = Promise<{ page?: string }>;

async function category(slug: string, locale: Locale) {
  const categories = await listCategories(locale);

  return categories.find((item) => item.slug === slug) ?? null;
}

export default async function CollectionPage({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: Search;
}) {
  const { locale, slug } = await params;
  if (!isLocale(locale)) notFound();

  setRequestLocale(locale);

  const { page: pageParam } = await searchParams;
  const page = Number.parseInt(pageParam ?? '1', 10) || 1;

  const [t, found, products] = await Promise.all([
    getTranslations('catalog'),
    category(slug, locale),
    listProducts({ locale, page, categorySlug: slug }),
  ]);

  if (!found) notFound();

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-8 px-4 py-10">
      <header className="flex flex-col gap-1">
        <h1 className="font-display text-3xl font-semibold">{found.name}</h1>
        <p className="text-muted-foreground text-sm">{t('count', { count: products.total })}</p>
      </header>

      <ProductGrid products={products.items} />

      <Pagination
        page={products.page}
        pageCount={products.pageCount}
        hrefFor={(next) =>
          next === 1 ? `/collections/${slug}` : `/collections/${slug}?page=${next}`
        }
      />
    </div>
  );
}
