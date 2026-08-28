'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';

import type { CountryCode, Locale } from '@/i18n/config';
import { getCountry } from '@/lib/catalog/queries';
import {
  addCartItem,
  CartOperationError,
  getActiveCart,
  getOrCreateActiveCart,
  removeCartItem,
  setCartItemQty,
} from '@/lib/commerce/cart';
import { getCartContext } from '@/lib/commerce/cart-identity';
import { createAdminClient } from '@/lib/supabase/admin';
import { createSessionToken, setGuestSessionCookie } from '@/lib/commerce/session';

const qtyChangeSchema = z.object({
  variantId: z.uuid(),
  qty: z.coerce.number().int().min(0),
});

const lineSchema = z.object({ variantId: z.uuid() });

const addLineSchema = z.object({
  variantId: z.uuid(),
  qty: z.coerce.number().int().min(1),
});

export type AddCartLineResult =
  | { status: 'ok' }
  | { status: 'clamped' }
  | { status: 'error'; reason: 'not_found' | 'out_of_stock' | 'invalid' };

/**
 * Sets a cart line to an exact quantity — the stepper on the cart page and
 * drawer — or removes it if the quantity lands at zero, mirroring
 * `setCartItemQty`'s own zero-means-remove rule. The cart icon and drawer
 * live in the header, on every page, so this revalidates the whole layout
 * rather than a single path.
 *
 * A stock clamp or a variant that's disappeared under the shopper isn't
 * surfaced as a separate error here: the re-render after revalidation shows
 * whatever quantity actually made it to the row, which is the only truth
 * that matters to the stepper.
 */
export async function updateCartItemQty(formData: FormData): Promise<void> {
  const parsed = qtyChangeSchema.safeParse({
    variantId: formData.get('variantId'),
    qty: formData.get('qty'),
  });
  if (!parsed.success) return;

  const context = await getCartContext();
  if (!context) return; // no identity yet — nothing to update

  const cart = await getActiveCart(context.client, context.identity);
  if (!cart) return;

  try {
    await setCartItemQty(context.client, cart.id, parsed.data.variantId, parsed.data.qty);
  } catch (err) {
    if (!(err instanceof CartOperationError)) throw err;
  }

  revalidatePath('/', 'layout');
}

export async function removeCartLine(formData: FormData): Promise<void> {
  const parsed = lineSchema.safeParse({ variantId: formData.get('variantId') });
  if (!parsed.success) return;

  const context = await getCartContext();
  if (!context) return;

  const cart = await getActiveCart(context.client, context.identity);
  if (!cart) return;

  await removeCartItem(context.client, cart.id, parsed.data.variantId);

  revalidatePath('/', 'layout');
}

/**
 * Adds one variant to the shopper's cart — product-card quick-add and the
 * PDP add-to-cart button. Unlike `updateCartItemQty`/`removeCartLine`, this
 * is the one write path allowed to *create* both a cart and, for a guest
 * with no session cookie yet, the guest identity itself (see the header
 * comment on `getCartContext` in `cart-identity.ts`).
 *
 * `locale` decides which country's stock/currency the new cart is opened
 * in — the same country every other price on the page the shopper clicked
 * from was computed for (`getCountry(locale)`), never a client-supplied value.
 */
export async function addCartLine(locale: Locale, variantId: string, qty = 1): Promise<AddCartLineResult> {
  const parsed = addLineSchema.safeParse({ variantId, qty });
  if (!parsed.success) return { status: 'error', reason: 'invalid' };

  let context = await getCartContext();
  if (!context) {
    const token = createSessionToken();
    await setGuestSessionCookie(token);
    // Guest write path only — a signed-in customer's cart stays on the
    // request-bound, RLS-scoped client from `getCartContext`.
    context = { client: createAdminClient(), identity: { sessionToken: token } };
  }

  const country = await getCountry(locale);
  const cart = await getOrCreateActiveCart(
    context.client,
    context.identity,
    country.code as CountryCode,
    country.currency,
  );

  try {
    const resolution = await addCartItem(context.client, cart.id, parsed.data.variantId, parsed.data.qty);
    revalidatePath('/', 'layout');
    return { status: resolution.status === 'clamped' ? 'clamped' : 'ok' };
  } catch (err) {
    if (err instanceof CartOperationError) return { status: 'error', reason: err.reason };
    throw err;
  }
}
