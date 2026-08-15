import { getTranslations, setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';

import { CartLineItem } from '@/components/commerce/cart-line-item';
import { CartTotals } from '@/components/commerce/cart-totals';
import { Button } from '@/components/ui/button';
import { isLocale } from '@/i18n/config';
import { Link } from '@/i18n/navigation';
import { toCountryPricing } from '@/lib/catalog/mappers';
import { getCountry } from '@/lib/catalog/queries';
import { getCartWithTotals } from '@/lib/commerce/cart';
import { getCartContext } from '@/lib/commerce/cart-identity';
import { formatMoney } from '@/lib/commerce/money';

type Params = Promise<{ locale: string }>;

export default async function CartPage({ params }: { params: Params }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  setRequestLocale(locale);

  const [t, context] = await Promise.all([getTranslations('cart'), getCartContext()]);
  const cart = context ? await getCartWithTotals(context.client, context.identity, locale) : null;

  if (!cart || cart.lines.length === 0) {
    return (
      <div className="mx-auto max-w-md px-4 py-24 text-center">
        <h1 className="font-display text-3xl font-semibold">{t('title')}</h1>
        <p className="text-muted-foreground mt-3">{t('empty')}</p>
        <Button asChild className="mt-6">
          <Link href="/products">{t('continueShopping')}</Link>
        </Button>
      </div>
    );
  }

  // The catalog data layer already resolves pricing this way from the URL's
  // locale (see `getProductByHandle`/`ProductPage`) rather than from the
  // cart row's own `country_code` — one definition of "the shopper's current
  // country" for the whole storefront.
  const country = await getCountry(locale);
  const pricing = toCountryPricing(country);

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-8 px-4 py-10 lg:flex-row lg:items-start">
      <div className="flex-1 divide-y">
        <h1 className="font-display mb-2 text-2xl font-semibold">{t('title')}</h1>
        {cart.lines.map((line) => (
          <CartLineItem key={line.variantId} line={line} />
        ))}
      </div>

      <div className="bg-secondary/20 flex flex-col gap-4 rounded-lg border p-4 lg:w-80 lg:shrink-0">
        <CartTotals
          subtotal={formatMoney(cart.subtotalMinor, pricing, locale)}
          discount={cart.discountMinor > 0 ? formatMoney(cart.discountMinor, pricing, locale) : null}
          shipping={formatMoney(cart.shippingMinor, pricing, locale)}
          vat={formatMoney(cart.vatMinor, pricing, locale)}
          total={formatMoney(cart.totalMinor, pricing, locale)}
        />
      </div>
    </div>
  );
}
