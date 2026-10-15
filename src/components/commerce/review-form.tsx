'use client';

import { useActionState } from 'react';
import { useTranslations } from 'next-intl';

import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import type { Review } from '@/lib/commerce/reviews';

import type { ReviewActionState } from '@/app/[locale]/products/[handle]/actions';

const idleReviewState: ReviewActionState = { status: 'idle' };

type ReviewFormAction = (state: ReviewActionState, formData: FormData) => Promise<ReviewActionState>;

const RATINGS = [1, 2, 3, 4, 5];

/**
 * Create/edit form for the signed-in customer's own review — the page only
 * renders this once eligibility (`hasDeliveredPurchase`) has already been
 * checked server-side, same "render-time check is a convenience, the
 * server action is the boundary" split as everywhere else forms hit RLS.
 */
export function ReviewForm({
  action,
  productId,
  handle,
  existing,
  onSaved,
  onCancel,
}: {
  action: ReviewFormAction;
  productId: string;
  handle: string;
  existing?: Review;
  onSaved?: () => void;
  onCancel?: () => void;
}) {
  const t = useTranslations('reviews');
  const [state, formAction, pending] = useActionState(async (
    prevState: ReviewActionState,
    formData: FormData,
  ) => {
    const next = await action(prevState, formData);
    if (next.status === 'success') onSaved?.();
    return next;
  }, idleReviewState);

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <input type="hidden" name="productId" value={productId} />
      <input type="hidden" name="handle" value={handle} />

      <fieldset className="flex flex-col gap-1.5">
        <legend className="text-sm font-medium">{t('ratingLabel')}</legend>
        <div className="flex gap-2">
          {RATINGS.map((value) => (
            <label key={value} className="flex items-center gap-1 text-sm">
              <input
                type="radio"
                name="rating"
                value={value}
                defaultChecked={existing?.rating === value}
                required
              />
              {value}
            </label>
          ))}
        </div>
      </fieldset>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="body">{t('bodyLabel')}</Label>
        <Textarea id="body" name="body" defaultValue={existing?.body} required rows={4} />
      </div>

      {state.status === 'error' && (
        <p role="alert" className="text-destructive text-sm">
          {state.message}
        </p>
      )}
      {state.status === 'success' && (
        <p className={cn('text-sm text-green-700 dark:text-green-500')}>{state.message}</p>
      )}

      <div className="flex gap-2">
        <Button type="submit" disabled={pending}>
          {pending ? t('saving') : t('submit')}
        </Button>
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel} disabled={pending}>
            {t('cancel')}
          </Button>
        )}
      </div>
    </form>
  );
}
