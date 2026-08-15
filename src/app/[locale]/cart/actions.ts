'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';

import { CartOperationError, getActiveCart, removeCartItem, setCartItemQty } from '@/lib/commerce/cart';
import { getCartContext } from '@/lib/commerce/cart-identity';

const qtyChangeSchema = z.object({
  variantId: z.uuid(),
  qty: z.coerce.number().int().min(0),
});

const lineSchema = z.object({ variantId: z.uuid() });

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
