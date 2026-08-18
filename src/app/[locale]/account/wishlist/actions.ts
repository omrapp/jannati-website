'use server';

import { revalidatePath } from 'next/cache';

import { addToWishlist, removeFromWishlist } from '@/lib/commerce/wishlist';
import { createClient, getAuthUser } from '@/lib/supabase/server';

/**
 * Both actions are silent no-ops for a signed-out caller rather than an
 * error — the UI never renders the toggle for a signed-out visitor (it
 * renders a sign-in link instead, same as `AddressesPage`'s gate), so
 * reaching here signed out only happens via a stale/forged request, which
 * doesn't need a user-facing message.
 */

export async function addToWishlistAction(productId: string): Promise<void> {
  const user = await getAuthUser();
  if (!user) return;

  const client = await createClient();
  await addToWishlist(client, user.id, productId);

  revalidatePath('/account/wishlist');
}

export async function removeFromWishlistAction(productId: string): Promise<void> {
  const user = await getAuthUser();
  if (!user) return;

  const client = await createClient();
  await removeFromWishlist(client, user.id, productId);

  revalidatePath('/account/wishlist');
}
