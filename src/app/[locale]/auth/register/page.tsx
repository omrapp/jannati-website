import { notFound } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';

import { isLocale } from '@/i18n/config';
import { RegisterForm } from './register-form';

export default async function RegisterPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ next?: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  setRequestLocale(locale);
  const { next } = await searchParams;

  const t = await getTranslations('auth.register');

  return (
    <div className="mx-auto flex max-w-sm flex-col gap-8 px-4 py-16">
      <header className="flex flex-col gap-1 text-center">
        <h1 className="font-display text-2xl font-semibold">{t('heading')}</h1>
        <p className="text-muted-foreground text-sm">{t('subheading')}</p>
      </header>

      <RegisterForm locale={locale} next={next ?? '/'} />
    </div>
  );
}
