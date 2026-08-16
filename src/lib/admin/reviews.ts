/**
 * Admin review moderation (Task 3.9). `reviews` is in generated `types.ts`
 * (`db:types` was re-run after this migration), so — unlike `banners.ts` /
 * `content-pages.ts` — no local type-extension workaround is needed here.
 * Cookie-bound client: `"admins can manage reviews"` RLS is the real gate.
 */

import type { SupabaseClient } from '@supabase/supabase-js';

import type { Database } from '@/lib/supabase/types';

export type ReviewStatus = Database['public']['Enums']['review_status'];

export type PendingReview = {
  id: string;
  productId: string;
  productName: string;
  customerId: string;
  rating: number;
  body: string;
  createdAt: string;
};

type Client = SupabaseClient<Database>;

/** Oldest first — a FIFO moderation queue, per the acceptance criteria. */
export async function listPendingReviews(client: Client): Promise<PendingReview[]> {
  const { data, error } = await client
    .from('reviews')
    .select('id, product_id, customer_id, rating, body, created_at, products(name_en, name_ar)')
    .eq('status', 'pending')
    .order('created_at', { ascending: true });
  if (error) throw new Error(`listing pending reviews: ${error.message}`);

  return data.map((row) => ({
    id: row.id,
    productId: row.product_id,
    productName: row.products?.name_en || row.products?.name_ar || row.product_id,
    customerId: row.customer_id,
    rating: row.rating,
    body: row.body,
    createdAt: row.created_at,
  }));
}

export async function setReviewStatus(client: Client, id: string, status: 'approved' | 'rejected'): Promise<void> {
  const { error } = await client.from('reviews').update({ status }).eq('id', id);
  if (error) throw new Error(`updating review status: ${error.message}`);
}
