import { notFound } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';

import { Link } from '@/i18n/navigation';
import { isLocale } from '@/i18n/config';
import { getAuthUser } from '@/lib/supabase/server';
import { ResetConfirmForm } from './reset-confirm-form';

export default async function ResetConfirmPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  setRequestLocale(locale);
  const t = await getTranslations('auth.reset');
  // The recovery link's `code` is exchanged for a session by the callback
  // route before this page ever renders — a session here means the link
  // was valid; no session means it was missing, already used, or expired.
  const user = await getAuthUser();

  return (
    <div className="mx-auto flex max-w-sm flex-col gap-8 px-4 py-16">
      <header className="flex flex-col gap-1 text-center">
        <h1 className="font-display text-2xl font-semibold">{t('confirmHeading')}</h1>
      </header>

      {user ? (
        <ResetConfirmForm locale={locale} />
      ) : (
        <div className="flex flex-col items-center gap-3 text-center">
          <p className="text-muted-foreground text-sm">{t('invalidLink')}</p>
          <Link href="/auth/reset" className="text-foreground text-sm underline underline-offset-4">
            {t('requestNewLink')}
          </Link>
        </div>
      )}
    </div>
  );
}
