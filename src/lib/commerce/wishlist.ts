/**
 * Signed-in customer's wishlist (Task 4.2). Same posture as `addresses.ts`:
 * every function takes an explicit `customerId` and filters by it even
 * though `wishlist_items`' RLS policy (`customer_id = auth.uid()`) already
 * scopes reads/writes — defense in depth, `customer_id` never comes from
 * client input.
 */

import type { SupabaseClient } from '@supabase/supabase-js';

import type { Database } from '@/lib/supabase/types';

type Client = SupabaseClient<Database>;

/** Product ids on a customer's wishlist, most recently added first. */
export async function listWishlistProductIds(client: Client, customerId: string): Promise<string[]> {
  const { data, error } = await client
    .from('wishlist_items')
    .select('product_id')
    .eq('customer_id', customerId)
    .order('created_at', { ascending: false });
  if (error) throw new Error(`reading wishlist: ${error.message}`);

  return (data ?? []).map((row) => row.product_id);
}

export async function isWishlisted(client: Client, customerId: string, productId: string): Promise<boolean> {
  const { data, error } = await client
    .from('wishlist_items')
    .select('id')
    .eq('customer_id', customerId)
    .eq('product_id', productId)
    .maybeSingle();
  if (error) throw new Error(`checking wishlist: ${error.message}`);

  return data !== null;
}

/** Idempotent — adding an already-wishlisted product is a no-op, not an error, backed by the unique `(customer_id, product_id)` constraint. */
export async function addToWishlist(client: Client, customerId: string, productId: string): Promise<void> {
  const { error } = await client
    .from('wishlist_items')
    .upsert({ customer_id: customerId, product_id: productId }, { onConflict: 'customer_id,product_id' });
  if (error) throw new Error(`adding to wishlist: ${error.message}`);
}

export async function removeFromWishlist(client: Client, customerId: string, productId: string): Promise<void> {
  const { error } = await client
    .from('wishlist_items')
    .delete()
    .eq('customer_id', customerId)
    .eq('product_id', productId);
  if (error) throw new Error(`removing from wishlist: ${error.message}`);
}
