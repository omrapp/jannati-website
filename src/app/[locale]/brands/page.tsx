import Image from 'next/image';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';

import { isLocale } from '@/i18n/config';
import { Link } from '@/i18n/navigation';
import { groupBrandsByInitial } from '@/lib/catalog/brand-groups';
import { listBrands } from '@/lib/catalog/queries';

export default async function BrandsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  setRequestLocale(locale);

  const [t, brands] = await Promise.all([getTranslations('catalog'), listBrands(locale)]);
  const groups = groupBrandsByInitial(brands, locale);

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-10 px-4 py-10">
      <header className="flex flex-col gap-1">
        <h1 className="font-display text-3xl font-semibold">{t('allBrands')}</h1>
        <p className="text-muted-foreground text-sm">{t('brandCount', { count: brands.length })}</p>
      </header>

      {groups.length === 0 ? (
        <p className="text-muted-foreground py-16 text-center">{t('empty')}</p>
      ) : (
        groups.map((group) => (
          <section key={group.letter} className="flex flex-col gap-4">
            <h2 className="text-muted-foreground border-b pb-2 text-xl font-semibold">
              {group.letter}
            </h2>
            <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
              {group.brands.map((brand) => (
                <li key={brand.slug}>
                  <Link
                    href={`/brands/${brand.slug}`}
                    className="hover:border-primary focus-visible:ring-ring/50 flex h-full flex-col items-center gap-3 rounded-lg border p-4 text-center focus-visible:ring-2 focus-visible:outline-none"
                  >
                    {brand.logoUrl && (
                      <div className="relative h-12 w-full">
                        <Image
                          src={brand.logoUrl}
                          alt=""
                          fill
                          sizes="200px"
                          className="object-contain"
                        />
                      </div>
                    )}
                    <span className="text-sm font-medium">{brand.name}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))
      )}
    </div>
  );
}
