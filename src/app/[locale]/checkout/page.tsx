import { notFound } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';

import { CheckoutForm } from '@/components/commerce/checkout-form';
import { isLocale, type Locale } from '@/i18n/config';
import { redirect } from '@/i18n/navigation';
import { toCountryPricing } from '@/lib/catalog/mappers';
import { getCountry } from '@/lib/catalog/queries';
import { listAddresses } from '@/lib/commerce/addresses';
import { getCartWithTotals } from '@/lib/commerce/cart';
import { getCartContext } from '@/lib/commerce/cart-identity';
import { createClient, getAuthUser } from '@/lib/supabase/server';

type Params = Promise<{ locale: string }>;

/**
 * A single review-and-submit page rather than a client-side multi-step
 * wizard — the spec's "address → shipping → payment → review" steps map to
 * form sections, not separate screens, because shipping has nothing to
 * choose (it's a flat per-country fee, `2.2`) and there is exactly one
 * payment method today (`cod.ts`). A wizard would be state to keep in sync
 * for choices that don't exist yet; the sections above still read as the
 * same four steps.
 */
export default async function CheckoutPage({ params }: { params: Params }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  setRequestLocale(locale);

  const context = await getCartContext();
  const cart = context ? await getCartWithTotals(context.client, context.identity, locale) : null;

  if (!cart || cart.lines.length === 0) {
    redirect({ href: '/cart', locale });
    return null;
  }

  const [user, country, t] = await Promise.all([
    getAuthUser(),
    getCountry(locale),
    getTranslations('checkout'),
  ]);
  const pricing = toCountryPricing(country);

  let addresses: Awaited<ReturnType<typeof listAddresses>> = [];
  if (user) {
    const supabase = await createClient();
    const all = await listAddresses(supabase, user.id);
    // A saved address from another country can't be shipped this order — the
    // cart's totals (VAT, shipping) were already computed for this country.
    addresses = all.filter((address) => address.country_code === country.code);
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="font-display mb-6 text-2xl font-semibold">{t('heading')}</h1>
      <CheckoutForm
        locale={locale as Locale}
        cart={cart}
        pricing={pricing}
        isGuest={!user}
        addresses={addresses}
      />
    </div>
  );
}
