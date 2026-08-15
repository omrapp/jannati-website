'use client';

import { useActionState, useState } from 'react';
import { useTranslations } from 'next-intl';

import { CartTotals } from '@/components/commerce/cart-totals';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { Locale } from '@/i18n/config';
import { Link } from '@/i18n/navigation';
import type { CartWithTotals } from '@/lib/commerce/cart';
import type { Address } from '@/lib/commerce/addresses';
import { formatMoney } from '@/lib/commerce/money';
import type { CountryPricing } from '@/lib/commerce/types';

import { idleCheckoutState, placeOrder } from '@/app/[locale]/checkout/actions';

/**
 * One form, two shapes of address fields (saved-address radios for a
 * signed-in customer, plain inputs for a guest) — everything else (coupon,
 * payment, review, submit) is shared, since totals and payment method don't
 * depend on who's checking out.
 */
export function CheckoutForm({
  locale,
  cart,
  pricing,
  isGuest,
  addresses,
}: {
  locale: Locale;
  cart: CartWithTotals;
  pricing: CountryPricing;
  isGuest: boolean;
  addresses: Address[];
}) {
  const t = useTranslations('checkout');
  const tAddresses = useTranslations('addresses');
  const [state, formAction, pending] = useActionState(placeOrder.bind(null, locale), idleCheckoutState);
  const [selectedAddressId, setSelectedAddressId] = useState(
    addresses.find((address) => address.is_default)?.id ?? addresses[0]?.id ?? '',
  );

  return (
    <form action={formAction} className="flex flex-col gap-8">
      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-medium">{t('selectAddressHeading')}</h2>

        {isGuest ? (
          <div className="flex flex-col gap-3">
            <Field label={t('guestEmailLabel')} htmlFor="email">
              <Input id="email" name="email" type="email" required />
              <p className="text-muted-foreground text-xs">{t('guestEmailHint')}</p>
            </Field>
            <Field label={tAddresses('fullNameLabel')} htmlFor="fullName">
              <Input id="fullName" name="fullName" required />
            </Field>
            <Field label={tAddresses('phoneLabel')} htmlFor="phone">
              <Input id="phone" name="phone" type="tel" required />
            </Field>
            <Field label={tAddresses('cityLabel')} htmlFor="city">
              <Input id="city" name="city" required />
            </Field>
            <Field label={tAddresses('areaLabel')} htmlFor="area">
              <Input id="area" name="area" />
            </Field>
            <Field label={tAddresses('line1Label')} htmlFor="line1">
              <Input id="line1" name="line1" required />
            </Field>
          </div>
        ) : addresses.length === 0 ? (
          <div className="flex flex-col gap-2">
            <p className="text-muted-foreground text-sm">{t('noAddresses')}</p>
            <Button asChild variant="outline" className="w-fit">
              <Link href="/account/addresses">{t('addAddress')}</Link>
            </Button>
          </div>
        ) : (
          <ul className="flex flex-col gap-2">
            {addresses.map((address) => (
              <li key={address.id}>
                <label className="flex cursor-pointer items-start gap-3 rounded-md border p-3 text-sm has-[:checked]:border-primary">
                  <input
                    type="radio"
                    name="addressId"
                    value={address.id}
                    checked={selectedAddressId === address.id}
                    onChange={() => setSelectedAddressId(address.id)}
                    required
                    className="mt-1"
                  />
                  <span className="flex flex-col">
                    <span className="font-medium">{address.full_name}</span>
                    <span className="text-muted-foreground">{address.phone}</span>
                    <span className="text-muted-foreground">
                      {address.line1}
                      {address.area ? `, ${address.area}` : ''}, {address.city}
                    </span>
                  </span>
                </label>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="flex flex-col gap-2">
        <Label htmlFor="couponCode">{t('couponLabel')}</Label>
        <Input id="couponCode" name="couponCode" placeholder={t('couponPlaceholder')} />
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-medium">{t('paymentHeading')}</h2>
        <label className="flex items-center gap-3 rounded-md border p-3 text-sm">
          <input type="radio" name="paymentProvider" value="cod" checked readOnly />
          {t('cod')}
        </label>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-medium">{t('orderSummaryHeading')}</h2>
        <ul className="divide-y">
          {cart.lines.map((line) => (
            <li key={line.variantId} className="flex items-center justify-between py-2 text-sm">
              <span>
                {line.name} × {line.qty}
              </span>
              {line.price && <span>{line.price}</span>}
            </li>
          ))}
        </ul>
        <CartTotals
          subtotal={formatMoney(cart.subtotalMinor, pricing, locale)}
          discount={cart.discountMinor > 0 ? formatMoney(cart.discountMinor, pricing, locale) : null}
          shipping={formatMoney(cart.shippingMinor, pricing, locale)}
          vat={formatMoney(cart.vatMinor, pricing, locale)}
          total={formatMoney(cart.totalMinor, pricing, locale)}
        />
      </section>

      {state.status === 'error' && (
        <p role="alert" className="text-destructive text-sm">
          {state.message}
        </p>
      )}

      <Button type="submit" disabled={pending} size="lg">
        {pending ? t('placingOrder') : t('placeOrder')}
      </Button>
    </form>
  );
}

function Field({
  label,
  htmlFor,
  children,
}: {
  label: string;
  htmlFor: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
    </div>
  );
}
