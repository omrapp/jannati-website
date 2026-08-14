import { notFound } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';

import { isLocale } from '@/i18n/config';
import { LoginForm } from './login-form';

export default async function LoginPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ next?: string; reset?: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  setRequestLocale(locale);
  const { next, reset } = await searchParams;

  const t = await getTranslations('auth.login');

  return (
    <div className="mx-auto flex max-w-sm flex-col gap-8 px-4 py-16">
      <header className="flex flex-col gap-1 text-center">
        <h1 className="font-display text-2xl font-semibold">{t('heading')}</h1>
        <p className="text-muted-foreground text-sm">{t('subheading')}</p>
      </header>

      {reset === 'success' && (
        <p role="status" className="text-center text-sm text-green-700 dark:text-green-500">
          {t('resetSuccess')}
        </p>
      )}

      <LoginForm locale={locale} next={next ?? '/'} />
    </div>
  );
}
