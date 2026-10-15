'use server';

import { revalidatePath } from 'next/cache';
import { getTranslations } from 'next-intl/server';
import { z } from 'zod';

import type { Locale } from '@/i18n/config';
import { hasDeliveredPurchase, upsertReview } from '@/lib/commerce/reviews';
import { createClient, getAuthUser } from '@/lib/supabase/server';

/** Mirrors `AddressActionState`'s shape, plus `success` — a submitted review
 * doesn't navigate anywhere, so the form needs its own "it worked" state to
 * show the pending-approval message instead of just clearing errors. */
export type ReviewActionState = { status: 'idle' | 'error' | 'success'; message?: string };

const reviewSchema = z.object({
  productId: z.string().uuid(),
  handle: z.string().trim().min(1),
  rating: z.coerce.number().int().min(1).max(5),
  body: z.string().trim().min(1),
});

export async function submitReviewAction(
  locale: Locale,
  _prevState: ReviewActionState,
  formData: FormData,
): Promise<ReviewActionState> {
  const t = await getTranslations({ locale, namespace: 'reviews' });

  const user = await getAuthUser();
  if (!user) return { status: 'error', message: t('signInRequired') };

  const parsed = reviewSchema.safeParse({
    productId: formData.get('productId'),
    handle: formData.get('handle'),
    rating: formData.get('rating'),
    body: formData.get('body'),
  });
  if (!parsed.success) return { status: 'error', message: t('invalid') };

  const client = await createClient();

  // Re-checked here even though the page only renders the form for an
  // already-eligible customer — the page's render-time check is a client
  // convenience, not the security boundary; this is.
  const eligible = await hasDeliveredPurchase(client, user.id, parsed.data.productId);
  if (!eligible) return { status: 'error', message: t('notEligible') };

  await upsertReview(client, user.id, parsed.data.productId, {
    rating: parsed.data.rating,
    body: parsed.data.body,
  });

  revalidatePath(`/products/${parsed.data.handle}`);
  return { status: 'success', message: t('submitted') };
}
