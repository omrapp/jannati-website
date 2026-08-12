import { getTranslations, setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';

import { Button } from '@/components/ui/button';
import { isLocale } from '@/i18n/config';
import { Link } from '@/i18n/navigation';

export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  setRequestLocale(locale);
  const t = await getTranslations('home');

  return (
    <section className="from-secondary/60 to-background bg-gradient-to-b">
      <div className="mx-auto flex max-w-7xl flex-col items-start gap-6 px-4 py-20 md:py-28">
        <h1 className="font-display max-w-2xl text-4xl font-semibold text-balance md:text-6xl">
          {t('heroTitle')}
        </h1>
        <p className="text-muted-foreground max-w-xl text-lg">{t('heroSubtitle')}</p>
        <div className="flex flex-wrap gap-3">
          <Button size="lg" asChild>
            <Link href="/products">{t('shopNow')}</Link>
          </Button>
          <Button size="lg" variant="outline" asChild>
            <Link href="/brands">{t('exploreBrands')}</Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
