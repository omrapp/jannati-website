/**
 * Resolves *who* is asking for a cart and *which* Supabase client is allowed
 * to touch it — the one decision every cart-facing Server Component and
 * Server Action needs before calling into `src/lib/commerce/cart.ts`. Mirrors
 * the trust boundary documented in that file's header: a customer's cart is
 * RLS-scoped and safe with the request-bound client; a guest's has no RLS
 * policy at all and requires the service-role client.
 *
 * Read-only on purpose — it never issues a guest cookie. A guest with no
 * cookie yet has no cart yet either, so `null` here means "show the empty
 * state," not a race to paper over. The write path that creates a guest's
 * first cart (add to cart) lands with whichever task wires that button; the
 * quantity/remove actions this resolves for today only ever mutate a cart
 * that already exists.
 */

import type { SupabaseClient } from '@supabase/supabase-js';

import { createAdminClient } from '@/lib/supabase/admin';
import { createClient, getAuthUser } from '@/lib/supabase/server';
import type { Database } from '@/lib/supabase/types';

import type { CartIdentity } from './cart';
import { getGuestSessionToken } from './session';

export type CartContext = { client: SupabaseClient<Database>; identity: CartIdentity };

export async function getCartContext(): Promise<CartContext | null> {
  const user = await getAuthUser();
  if (user) return { client: await createClient(), identity: { customerId: user.id } };

  const token = await getGuestSessionToken();
  if (!token) return null;

  return { client: createAdminClient(), identity: { sessionToken: token } };
}
