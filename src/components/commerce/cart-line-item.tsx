'use client';

import { Minus, Plus, Trash2 } from 'lucide-react';
import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { useTransition } from 'react';

import { Button } from '@/components/ui/button';
import { Link } from '@/i18n/navigation';
import type { CartLineDetail } from '@/lib/commerce/cart';
import { cn } from '@/lib/utils';

import { removeCartLine, updateCartItemQty } from '@/app/[locale]/cart/actions';

/**
 * One cart line: image, name, unit price, quantity stepper, remove. No line
 * total here on purpose — multiplying price by quantity is money math, and
 * that belongs in `src/lib/commerce`, not a component. The totals panel is
 * the only place a sum gets shown.
 *
 * The stepper never computes a price or clamps to stock itself; it only
 * proposes the next quantity and lets `updateCartItemQty` (and the DB
 * constraints/stock check underneath it) decide what actually gets written.
 * The re-render after that write is the only source of truth for `line.qty`.
 */
export function CartLineItem({ line }: { line: CartLineDetail }) {
  const t = useTranslations('cart');
  const [isPending, startTransition] = useTransition();

  function changeQty(qty: number) {
    const formData = new FormData();
    formData.set('variantId', line.variantId);
    formData.set('qty', String(qty));
    startTransition(() => {
      void updateCartItemQty(formData);
    });
  }

  function remove() {
    const formData = new FormData();
    formData.set('variantId', line.variantId);
    startTransition(() => {
      void removeCartLine(formData);
    });
  }

  return (
    <div className={cn('flex gap-4 py-4 transition-opacity', isPending && 'opacity-60')}>
      <Link
        href={`/products/${line.handle}`}
        className="bg-secondary/40 relative size-20 shrink-0 overflow-hidden rounded-md"
      >
        {line.image && (
          <Image
            src={line.image.url}
            alt={line.image.alt ?? line.name}
            fill
            sizes="80px"
            className="object-cover"
          />
        )}
      </Link>

      <div className="flex flex-1 flex-col gap-1">
        {line.brandName && <span className="text-muted-foreground text-xs">{line.brandName}</span>}
        <Link href={`/products/${line.handle}`} className="text-sm font-medium hover:underline">
          {line.name}
        </Link>
        {line.price && <span className="text-primary text-sm font-semibold">{line.price}</span>}
        {!line.inStock && <span className="text-destructive text-xs">{t('lineOutOfStock')}</span>}
      </div>

      <div className="flex flex-col items-end justify-between gap-2">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-8"
          disabled={isPending}
          onClick={remove}
          aria-label={t('remove')}
        >
          <Trash2 className="size-4" />
        </Button>

        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="size-7"
            disabled={isPending || line.qty <= 1}
            onClick={() => changeQty(line.qty - 1)}
            aria-label={t('decreaseQty')}
          >
            <Minus className="size-3" />
          </Button>
          <span className="w-6 text-center text-sm" aria-live="polite">
            {line.qty}
          </span>
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="size-7"
            disabled={isPending}
            onClick={() => changeQty(line.qty + 1)}
            aria-label={t('increaseQty')}
          >
            <Plus className="size-3" />
          </Button>
        </div>
      </div>
    </div>
  );
}
