/**
 * Customer-facing reviews (Task 4.1) — submission and PDP read. RLS already
 * does the real enforcement (`reviews.sql`/`reviews_edit.sql`, Tasks 3.9/4.1):
 * public can read `status = 'approved'`, a customer can read/insert/update
 * their own row, and any customer write lands or re-lands `pending` — never
 * self-approved. What RLS *doesn't* enforce — purchase verification, one
 * review per customer per product — is checked or backed here.
 */

import type { SupabaseClient } from '@supabase/supabase-js';

import type { Database, Tables } from '@/lib/supabase/types';

type Client = SupabaseClient<Database>;

export type Review = Tables<'reviews'>;

/**
 * A customer is review-eligible for a product once they have a *delivered*
 * order containing it. `order_items` links to `product_variants`, not
 * `products`, directly — three flat queries (product's variant ids, this
 * customer's delivered order ids, then the intersection) rather than an
 * embedded `.select()`, same reasoning `products.ts` gives for avoiding
 * embeds: they're easy to get wrong against generated types.
 */
export async function hasDeliveredPurchase(client: Client, customerId: string, productId: string): Promise<boolean> {
  const { data: variants, error: variantError } = await client
    .from('product_variants')
    .select('id')
    .eq('product_id', productId);
  if (variantError) throw new Error(`reading variants for product ${productId}: ${variantError.message}`);

  const variantIds = (variants ?? []).map((v) => v.id);
  if (variantIds.length === 0) return false;

  const { data: orders, error: ordersError } = await client
    .from('orders')
    .select('id')
    .eq('customer_id', customerId)
    .eq('fulfilment_status', 'delivered');
  if (ordersError) throw new Error(`reading orders for customer ${customerId}: ${ordersError.message}`);

  const orderIds = (orders ?? []).map((o) => o.id);
  if (orderIds.length === 0) return false;

  const { data: items, error: itemsError } = await client
    .from('order_items')
    .select('id')
    .in('order_id', orderIds)
    .in('variant_id', variantIds)
    .limit(1);
  if (itemsError) throw new Error(`checking purchase eligibility: ${itemsError.message}`);

  return (items?.length ?? 0) > 0;
}

/** Approved reviews for a product, newest first — public PDP read. */
export async function getApprovedReviews(client: Client, productId: string): Promise<Review[]> {
  const { data, error } = await client
    .from('reviews')
    .select('*')
    .eq('product_id', productId)
    .eq('status', 'approved')
    .order('created_at', { ascending: false });
  if (error) throw new Error(`reading reviews for product ${productId}: ${error.message}`);

  return data ?? [];
}

/** A signed-in customer's own review for a product, whatever its status — so "your review is pending" is renderable. */
export async function getOwnReview(client: Client, customerId: string, productId: string): Promise<Review | null> {
  const { data, error } = await client
    .from('reviews')
    .select('*')
    .eq('product_id', productId)
    .eq('customer_id', customerId)
    .maybeSingle();
  if (error) throw new Error(`reading own review: ${error.message}`);

  return data;
}

export type ReviewInput = { rating: number; body: string };

/**
 * Insert-or-update, backed by `reviews_customer_id_product_id_key`
 * (4.1's migration) — one review per customer per product. Re-submitting
 * edits the existing row and resets it to `pending`: a changed opinion is
 * re-moderated, not silently kept live under the old wording.
 */
export async function upsertReview(
  client: Client,
  customerId: string,
  productId: string,
  input: ReviewInput,
): Promise<void> {
  const { error } = await client.from('reviews').upsert(
    {
      customer_id: customerId,
      product_id: productId,
      rating: input.rating,
      body: input.body,
      status: 'pending',
    },
    { onConflict: 'customer_id,product_id' },
  );
  if (error) throw new Error(`submitting review: ${error.message}`);
}
