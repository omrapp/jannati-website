import { notFound } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';

import { isLocale } from '@/i18n/config';
import { ResetRequestForm } from './reset-request-form';

export default async function ResetPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  setRequestLocale(locale);
  const t = await getTranslations('auth.reset');

  return (
    <div className="mx-auto flex max-w-sm flex-col gap-8 px-4 py-16">
      <header className="flex flex-col gap-1 text-center">
        <h1 className="font-display text-2xl font-semibold">{t('requestHeading')}</h1>
        <p className="text-muted-foreground text-sm">{t('requestSubheading')}</p>
      </header>

      <ResetRequestForm locale={locale} />
    </div>
  );
}
