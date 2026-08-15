import { notFound } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';

import { OrderSummary } from '@/components/commerce/order-summary';
import { isLocale, type Locale } from '@/i18n/config';
import { toCountryPricing } from '@/lib/catalog/mappers';
import { getOrderByNumber, getOrderForCustomer, verifyOrderToken } from '@/lib/commerce/orders';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient, getAuthUser } from '@/lib/supabase/server';

type Params = Promise<{ locale: string; orderNumber: string }>;
type SearchParams = Promise<{ token?: string }>;

/**
 * A signed-in customer reaches this through their own session (RLS already
 * scopes `getOrderForCustomer` to `customer_id = auth.uid()`). A guest has
 * no session at all, so the checkout redirect hands them a signed token
 * (`signOrderToken`) in the URL instead — a capability link, not a
 * password, but enough to keep this page from being "guess an order number,
 * see a stranger's address."
 */
export default async function OrderConfirmationPage({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: SearchParams;
}) {
  const { locale, orderNumber } = await params;
  if (!isLocale(locale)) notFound();

  setRequestLocale(locale);

  const user = await getAuthUser();

  const detail = user
    ? await getOrderForCustomer(await createClient(), user.id, orderNumber)
    : await (async () => {
        const { token } = await searchParams;
        if (!verifyOrderToken(orderNumber, token)) return null;
        return getOrderByNumber(createAdminClient(), orderNumber);
      })();

  if (!detail) notFound();

  const [t, admin] = await Promise.all([
    getTranslations('orders'),
    Promise.resolve(createAdminClient()),
  ]);
  const { data: countryRow } = await admin
    .from('countries')
    .select('code, currency, currency_exponent, fx_rate_from_omr, rounding_step_minor')
    .eq('code', detail.order.country_code)
    .single();

  if (!countryRow) notFound();

  const pricing = toCountryPricing(countryRow);

  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      <h1 className="font-display mb-1 text-2xl font-semibold">{t('confirmedHeading')}</h1>
      <p className="text-muted-foreground mb-8">{t('confirmedMessage')}</p>
      <OrderSummary detail={detail} pricing={pricing} locale={locale as Locale} />
    </div>
  );
}
