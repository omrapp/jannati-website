'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ReviewForm } from '@/components/commerce/review-form';
import type { Locale } from '@/i18n/config';
import type { Review } from '@/lib/commerce/reviews';

import { submitReviewAction } from '@/app/[locale]/products/[handle]/actions';

/**
 * PDP reviews block — approved reviews + average rating (public), plus the
 * signed-in customer's own write/edit form when the page determined they're
 * eligible. `eligible` and `ownReview` are both server-computed (RLS +
 * `hasDeliveredPurchase`); this component only toggles which pre-fetched
 * state is visible, same split as `AddressList`. `submitReviewAction`
 * doesn't hand back the saved row, so after a successful submit this asks
 * the router to re-run the Server Component instead of guessing the new
 * row's shape client-side — `revalidatePath` in the action already marked
 * this route stale, `router.refresh()` is what actually re-fetches it.
 */
export function ReviewsSection({
  locale,
  productId,
  handle,
  approvedReviews,
  eligible,
  ownReview,
}: {
  locale: Locale;
  productId: string;
  handle: string;
  approvedReviews: Review[];
  eligible: boolean;
  ownReview: Review | null;
}) {
  const t = useTranslations('reviews');
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);

  const average =
    approvedReviews.length > 0
      ? approvedReviews.reduce((sum, r) => sum + r.rating, 0) / approvedReviews.length
      : null;

  const canWrite = eligible || ownReview !== null;

  return (
    <section className="flex flex-col gap-4">
      <h2 className="text-lg font-medium">{t('title')}</h2>

      {average !== null && (
        <p className="text-sm">
          {t('averageSummary', { average: average.toFixed(1), count: approvedReviews.length })}
        </p>
      )}

      {approvedReviews.length === 0 && <p className="text-muted-foreground text-sm">{t('empty')}</p>}

      <ul className="flex flex-col gap-3">
        {approvedReviews.map((review) => (
          <li key={review.id} className="rounded-md border p-3 text-sm">
            <div className="flex items-center gap-2 font-medium">{review.rating} / 5</div>
            <p className="text-muted-foreground">{review.body}</p>
          </li>
        ))}
      </ul>

      {ownReview && !isEditing && (
        <div className="rounded-md border p-3 text-sm">
          <div className="flex items-center gap-2 font-medium">
            {t('yourReview')}
            {ownReview.status === 'pending' && <Badge variant="secondary">{ownReview.status}</Badge>}
          </div>
          <p className="text-muted-foreground">{ownReview.body}</p>
          {ownReview.status === 'pending' && (
            <p className="text-muted-foreground mt-1 text-xs">{t('pendingNotice')}</p>
          )}
          {ownReview.status === 'rejected' && (
            <p className="text-muted-foreground mt-1 text-xs">{t('rejectedNotice')}</p>
          )}
          <Button variant="outline" size="sm" className="mt-2" onClick={() => setIsEditing(true)}>
            {t('editReview')}
          </Button>
        </div>
      )}

      {canWrite && (isEditing || !ownReview) && (
        <ReviewForm
          action={submitReviewAction.bind(null, locale)}
          productId={productId}
          handle={handle}
          existing={ownReview ?? undefined}
          onSaved={() => {
            setIsEditing(false);
            router.refresh();
          }}
          onCancel={ownReview ? () => setIsEditing(false) : undefined}
        />
      )}
    </section>
  );
}
