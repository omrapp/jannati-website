'use server';

import { getTranslations } from 'next-intl/server';
import { z } from 'zod';

import type { CountryCode, Locale } from '@/i18n/config';
import { parseLocale } from '@/i18n/config';
import { redirect } from '@/i18n/navigation';
import { listAddresses } from '@/lib/commerce/addresses';
import { getActiveCart } from '@/lib/commerce/cart';
import { getCartContext } from '@/lib/commerce/cart-identity';
import {
  createOrder,
  OrderCreationError,
  signOrderToken,
  type CreateOrderInput,
  type ShippingAddressInput,
} from '@/lib/commerce/orders';
import { getCountry } from '@/lib/catalog/queries';
import { dispatchOrderNotification } from '@/lib/notifications/dispatch';
import { getPaymentProvider } from '@/lib/payments/registry';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient, getAuthUser } from '@/lib/supabase/server';

export type CheckoutActionState = { status: 'idle' | 'error'; message?: string };

export const idleCheckoutState: CheckoutActionState = { status: 'idle' };

const guestAddressSchema = z.object({
  email: z.email(),
  fullName: z.string().trim().min(1),
  phone: z.string().trim().min(1),
  city: z.string().trim().min(1),
  area: z.string().trim().optional(),
  line1: z.string().trim().min(1),
});

/** Maps an `OrderCreationError` reason to a translated checkout message. */
function errorKey(reason: OrderCreationError['reason']): string {
  switch (reason) {
    case 'empty_cart':
      return 'errors.emptyCart';
    case 'out_of_stock':
      return 'errors.outOfStock';
    case 'coupon_rejected':
      return 'errors.couponRejected';
    case 'country_mismatch':
      return 'errors.countryMismatch';
  }
}

/**
 * Places an order from the shopper's current cart. Every field this trusts
 * from `formData` is re-verified before it reaches `createOrder`: a
 * customer's `addressId` is only accepted if it's actually one of their own
 * saved addresses (never a client-supplied address object), and its country
 * has to match the cart's — the same "recompute, never trust" rule
 * `createOrder` itself enforces one level down for prices and stock.
 */
export async function placeOrder(
  locale: Locale,
  _prevState: CheckoutActionState,
  formData: FormData,
): Promise<CheckoutActionState> {
  const t = await getTranslations({ locale, namespace: 'checkout' });
  const { country } = parseLocale(locale);

  const context = await getCartContext();
  if (!context) return { status: 'error', message: t('errors.emptyCart') };

  const cart = await getActiveCart(context.client, context.identity);
  if (!cart) return { status: 'error', message: t('errors.emptyCart') };

  const user = await getAuthUser();
  const couponCode = String(formData.get('couponCode') ?? '').trim() || null;

  let identity: CreateOrderInput['identity'];
  let shippingAddress: ShippingAddressInput;

  if (user) {
    const addressId = formData.get('addressId');
    if (typeof addressId !== 'string' || !addressId) {
      return { status: 'error', message: t('errors.selectAddress') };
    }

    const supabase = await createClient();
    const addresses = await listAddresses(supabase, user.id);
    const address = addresses.find((candidate) => candidate.id === addressId);
    if (!address || address.country_code !== country) {
      return { status: 'error', message: t('errors.selectAddress') };
    }

    identity = { customerId: user.id };
    shippingAddress = {
      fullName: address.full_name,
      phone: address.phone,
      countryCode: address.country_code as CountryCode,
      city: address.city,
      area: address.area,
      line1: address.line1,
    };
  } else {
    const parsed = guestAddressSchema.safeParse({
      email: formData.get('email'),
      fullName: formData.get('fullName'),
      phone: formData.get('phone'),
      city: formData.get('city'),
      area: formData.get('area') || undefined,
      line1: formData.get('line1'),
    });
    if (!parsed.success) return { status: 'error', message: t('errors.invalidAddress') };

    identity = {
      guestEmail: parsed.data.email.trim().toLowerCase(),
      guestPhone: parsed.data.phone,
    };
    shippingAddress = {
      fullName: parsed.data.fullName,
      phone: parsed.data.phone,
      countryCode: country,
      city: parsed.data.city,
      area: parsed.data.area ?? null,
      line1: parsed.data.line1,
    };
  }

  // Order creation always writes through the service-role client — there is
  // no RLS insert policy on `orders` for any role, customer or guest alike
  // (see the migration's trust-boundary note), so the customer-scoped
  // client from `createClient()` above was only ever needed to read their
  // own addresses.
  const admin = createAdminClient();

  let result;
  try {
    result = await createOrder(admin, {
      cartId: cart.id,
      identity,
      shippingAddress,
      couponCode,
      paymentProvider: 'cod',
      locale,
    });
  } catch (err) {
    if (err instanceof OrderCreationError) {
      return { status: 'error', message: t(errorKey(err.reason)) };
    }
    throw err;
  }

  // COD's `createPayment` is a no-op today (see cod.ts) — called anyway so
  // every provider, including future ones, goes through the same step
  // rather than checkout special-casing COD as "skip payment entirely."
  await getPaymentProvider('cod').createPayment({
    orderId: result.orderId,
    orderNumber: result.orderNumber,
    totalMinor: result.totals.totalMinor,
    currency: cart.currency,
    customerName: shippingAddress.fullName,
    // Email/password auth always sets `user.email`; falls back to guest
    // email so this stays correct once 2.10's OAuth providers land too.
    customerEmail: ('guestEmail' in identity ? identity.guestEmail : user?.email) ?? '',
    locale,
  });

  const pricing = await getCountry(locale);
  await dispatchOrderNotification({
    event: 'order_created',
    orderNumber: result.orderNumber,
    locale,
    customerName: shippingAddress.fullName,
    customerEmail: ('guestEmail' in identity ? identity.guestEmail : user?.email) ?? null,
    customerPhone: shippingAddress.phone,
    totalMinor: result.totals.totalMinor,
    currency: pricing.currency,
    currencyExponent: pricing.currency_exponent,
    trackingUrl: null,
  });

  const confirmationPath =
    'guestEmail' in identity
      ? `/checkout/confirmation/${result.orderNumber}?token=${signOrderToken(result.orderNumber)}`
      : `/checkout/confirmation/${result.orderNumber}`;

  redirect({ href: confirmationPath, locale });
  return idleCheckoutState;
}
