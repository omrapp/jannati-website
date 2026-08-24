import { notFound } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';

import { AddressList } from '@/components/commerce/address-list';
import { isLocale, type Locale } from '@/i18n/config';
import { redirect } from '@/i18n/navigation';
import { listAddresses } from '@/lib/commerce/addresses';
import { createClient, getAuthUser } from '@/lib/supabase/server';

/**
 * Address book: list, add, edit, delete, set-default. Same auth gate as
 * `/account` (redirect to login with a `next` back here) since every read
 * and write goes through `listAddresses`/`addresses.ts`, which trust RLS
 * scoping the row to `customer_id = auth.uid()` — there is no guest address
 * book, unlike the guest cart.
 */
export default async function AddressesPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  setRequestLocale(locale);

  const user = await getAuthUser();
  if (!user) {
    return redirect({
      href: { pathname: '/auth/login', query: { next: '/account/addresses' } },
      locale,
    });
  }

  const t = await getTranslations('addresses');
  const client = await createClient();
  const addresses = await listAddresses(client, user.id);

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6 px-4 py-12">
      <h1 className="text-xl font-semibold">{t('title')}</h1>
      <AddressList addresses={addresses} locale={locale as Locale} />
    </div>
  );
}
