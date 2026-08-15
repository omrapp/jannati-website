import { notFound } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';

import { isLocale, type Locale } from '@/i18n/config';

import { OrderLookupForm } from './order-lookup-form';

type Params = Promise<{ locale: string }>;

export default async function OrderLookupPage({ params }: { params: Params }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  setRequestLocale(locale);
  const t = await getTranslations('orderLookup');

  return (
    <div className="mx-auto flex max-w-sm flex-col gap-8 px-4 py-16">
      <h1 className="font-display text-center text-2xl font-semibold">{t('heading')}</h1>
      <OrderLookupForm locale={locale as Locale} />
    </div>
  );
}
