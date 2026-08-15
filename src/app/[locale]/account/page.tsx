import { notFound } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';

import { Link, redirect } from '@/i18n/navigation';
import { isLocale } from '@/i18n/config';
import { Button } from '@/components/ui/button';
import { getAuthUser } from '@/lib/supabase/server';
import { logout } from './actions';

export default async function AccountPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  setRequestLocale(locale);

  const user = await getAuthUser();
  if (!user) {
    return redirect({ href: { pathname: '/auth/login', query: { next: '/account' } }, locale });
  }

  const t = await getTranslations('auth.account');
  const tAddresses = await getTranslations('addresses');

  return (
    <div className="mx-auto flex max-w-7xl flex-col items-center gap-4 px-4 py-24 text-center">
      <p className="text-muted-foreground">{t('signedInAs', { email: user.email ?? '' })}</p>
      <Button variant="outline" asChild>
        <Link href="/account/addresses">{tAddresses('title')}</Link>
      </Button>
      <form action={logout.bind(null, locale)}>
        <Button type="submit" variant="outline">
          {t('signOut')}
        </Button>
      </form>
    </div>
  );
}
