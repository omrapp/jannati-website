'use client';

import { useState, useTransition } from 'react';
import { useTranslations } from 'next-intl';
import { Heart } from 'lucide-react';

import { addToWishlistAction, removeFromWishlistAction } from '@/app/[locale]/account/wishlist/actions';
import { Button } from '@/components/ui/button';
import { Link } from '@/i18n/navigation';

/**
 * Signed-out visitors get a sign-in link, not a disabled button — same
 * gate as the address book, just surfaced inline on the PDP instead of a
 * page-level redirect, since the product page itself is public.
 */
export function WishlistButton({
  productId,
  handle,
  signedIn,
  initialSaved,
}: {
  productId: string;
  handle: string;
  signedIn: boolean;
  initialSaved: boolean;
}) {
  const t = useTranslations('wishlist');
  const [saved, setSaved] = useState(initialSaved);
  const [isPending, startTransition] = useTransition();

  if (!signedIn) {
    return (
      <Button variant="outline" asChild>
        <Link href={{ pathname: '/auth/login', query: { next: `/products/${handle}` } }}>
          <Heart className="size-4" />
          {t('add')}
        </Link>
      </Button>
    );
  }

  function toggle() {
    // Optimistic: flip immediately, action runs in the background. A
    // failed mutation just leaves the UI one action-run out of sync with
    // the database until the next page load — not worth a rollback path
    // for a low-stakes, easily-repeated toggle.
    const next = !saved;
    setSaved(next);
    startTransition(() => {
      void (next ? addToWishlistAction(productId) : removeFromWishlistAction(productId));
    });
  }

  return (
    <Button variant="outline" disabled={isPending} onClick={toggle} aria-pressed={saved}>
      <Heart className={saved ? 'size-4 fill-current' : 'size-4'} />
      {saved ? t('remove') : t('add')}
    </Button>
  );
}
