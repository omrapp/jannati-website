import type { Metadata } from 'next';
import Image from 'next/image';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';

import { Pagination } from '@/components/commerce/pagination';
import { ProductGrid } from '@/components/commerce/product-grid';
import { isLocale, type Locale } from '@/i18n/config';
import { listBrands, listProducts } from '@/lib/catalog/queries';
import { localeAlternates } from '@/lib/seo/alternates';

type Params = Promise<{ locale: string; slug: string }>;
type Search = Promise<{ page?: string }>;

async function brand(slug: string, locale: Locale) {
  const brands = await listBrands(locale);

  return brands.find((item) => item.slug === slug) ?? null;
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { locale, slug } = await params;
  if (!isLocale(locale)) return {};

  const found = await brand(slug, locale);
  if (!found) return {};

  return { title: found.name, alternates: localeAlternates(locale, `/brands/${slug}`) };
}

export default async function BrandPage({
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
    brand(slug, locale),
    listProducts({ locale, page, brandSlug: slug }),
  ]);

  if (!found) notFound();

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-8 px-4 py-10">
      <header className="flex flex-col items-start gap-3">
        {found.logoUrl && (
          <div className="relative h-16 w-40">
            <Image src={found.logoUrl} alt="" fill sizes="160px" className="object-contain" />
          </div>
        )}
        <h1 className="font-display text-3xl font-semibold">{found.name}</h1>
        <p className="text-muted-foreground text-sm">{t('count', { count: products.total })}</p>
      </header>

      <ProductGrid products={products.items} />

      <Pagination
        page={products.page}
        pageCount={products.pageCount}
        hrefFor={(next) => (next === 1 ? `/brands/${slug}` : `/brands/${slug}?page=${next}`)}
      />
    </div>
  );
}
