import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';

import { isLocale, type Locale } from '@/i18n/config';
import { Link } from '@/i18n/navigation';
import { listCategories } from '@/lib/catalog/queries';
import { localeAlternates } from '@/lib/seo/alternates';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};

  const [t, tSeo] = await Promise.all([getTranslations('catalog'), getTranslations('seo')]);

  return {
    title: t('allCategories'),
    description: tSeo('categoriesDescription'),
    alternates: localeAlternates(locale, '/collections'),
  };
}

export default async function CollectionsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  setRequestLocale(locale);

  const [t, categories] = await Promise.all([
    getTranslations('catalog'),
    listCategories(locale as Locale),
  ]);

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-8 px-4 py-10">
      <header className="flex flex-col gap-1">
        <h1 className="font-display text-3xl font-semibold">{t('allCategories')}</h1>
        <p className="text-muted-foreground text-sm">
          {t('categoryCount', { count: categories.length })}
        </p>
      </header>

      {categories.length === 0 ? (
        <p className="text-muted-foreground py-16 text-center">{t('empty')}</p>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
          {categories.map((category) => (
            <Link
              key={category.slug}
              href={`/collections/${category.slug}`}
              className="bg-secondary/40 hover:bg-secondary/60 focus-visible:ring-ring/50 rounded-lg px-4 py-6 text-center text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:outline-none"
            >
              {category.name}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
