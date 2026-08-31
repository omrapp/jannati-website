'use client';

import { Check, Heart, Loader2, Plus } from 'lucide-react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { useLocale, useTranslations } from 'next-intl';
import Image from 'next/image';
import { useState, useTransition } from 'react';

import { addCartLine } from '@/app/[locale]/cart/actions';
import { openCartDrawer } from '@/components/commerce/cart-drawer';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { Locale } from '@/i18n/config';
import { Link } from '@/i18n/navigation';
import type { ProductSummary } from '@/lib/catalog/mappers';
import { SPRING_SNAP } from '@/lib/motion-tokens';
import { cn } from '@/lib/utils';

/** How long the success checkmark holds before reverting to the plus icon —
 * long enough to read, short enough that a shopper adding several items in a
 * row isn't stuck waiting on it. */
const SUCCESS_HOLD_MS = 1600;

/**
 * One product in a grid. The product link is a full-card overlay (`inset-0`,
 * `z-10`) rather than wrapping every child, so the wishlist/quick-add
 * buttons can sit above it (`z-20`) as real siblings instead of buttons
 * nested inside an `<a>` — invalid HTML, and unreachable by keyboard as two
 * separate stops. A shopper still hits the product link wherever else they
 * tap; the two small buttons are the only carve-outs.
 */
export function ProductCard({ product, priority }: { product: ProductSummary; priority?: boolean }) {
  const t = useTranslations('catalog');
  const tWishlist = useTranslations('wishlist');
  const locale = useLocale() as Locale;
  const reduceMotion = useReducedMotion();
  // Decorative only — real per-shopper wishlist state would need every
  // product listing query to join wishlist rows for the current user, which
  // is out of this visual-redesign task's scope.
  const [saved, setSaved] = useState(false);

  const [isPending, startTransition] = useTransition();
  const [added, setAdded] = useState(false);

  function handleQuickAdd() {
    if (!product.variantId) return; // nothing to add — no variant on this product

    startTransition(async () => {
      const result = await addCartLine(locale, product.variantId as string, 1);
      if (result.status === 'error') return; // stock/variant vanished mid-click — fail quiet, button just resets

      openCartDrawer();
      setAdded(true);
      setTimeout(() => setAdded(false), SUCCESS_HOLD_MS);
    });
  }

  return (
    <motion.div
      className="group relative flex flex-col gap-3"
      whileHover={reduceMotion ? undefined : { y: -4 }}
      whileTap={reduceMotion ? undefined : { scale: 0.98 }}
      transition={SPRING_SNAP}
    >
      <Link
        href={`/products/${product.handle}`}
        aria-label={product.name}
        className="focus-visible:ring-ring/50 absolute inset-0 z-10 rounded-lg focus-visible:ring-2 focus-visible:outline-none"
      />

      <div className="bg-secondary/40 shadow-sm relative aspect-square overflow-hidden rounded-lg transition-shadow duration-300 group-hover:shadow-md">
        {product.image ? (
          <Image
            src={product.image.url}
            alt={product.image.alt ?? product.name}
            fill
            // Three columns on desktop, two on mobile.
            sizes="(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw"
            // `priority` was deprecated in Next.js 16 in favor of `preload`,
            // but neither sets `fetchPriority="high"` on the rendered
            // `<img>` — the attribute real browsers (and Lighthouse's LCP
            // discovery) use to prioritize the network fetch. `loading`
            // mirrors what `priority` used to imply (skip lazy-loading).
            loading={priority ? 'eager' : undefined}
            fetchPriority={priority ? 'high' : undefined}
            className="object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="text-muted-foreground flex h-full items-center justify-center text-xs">
            {t('noImage')}
          </div>
        )}

        {!product.inStock && (
          <Badge variant="secondary" className="absolute start-2 top-2">
            {t('outOfStock')}
          </Badge>
        )}

        <motion.button
          type="button"
          onClick={() => setSaved((current) => !current)}
          whileTap={reduceMotion ? undefined : { scale: 0.8 }}
          animate={!reduceMotion && saved ? { scale: [1, 1.3, 1] } : undefined}
          transition={SPRING_SNAP}
          aria-pressed={saved}
          aria-label={saved ? tWishlist('remove') : tWishlist('add')}
          className="bg-background/90 text-foreground hover:text-primary focus-visible:ring-ring/50 absolute end-2 top-2 z-20 flex size-9 items-center justify-center rounded-full shadow-sm backdrop-blur-sm focus-visible:ring-2 focus-visible:outline-none"
        >
          <Heart className={cn('size-4', saved && 'fill-primary text-primary')} />
        </motion.button>

        {product.inStock && product.variantId && (
          <Button
            type="button"
            size="icon-lg"
            onClick={handleQuickAdd}
            disabled={isPending}
            aria-label={added ? t('addedToCart') : t('addToCart')}
            className={cn(
              'absolute end-2 bottom-2 z-20 size-11 overflow-hidden rounded-full opacity-100 shadow-md transition-opacity duration-fast active:scale-95',
              'md:opacity-0 md:group-hover:opacity-100 md:group-focus-within:opacity-100',
            )}
          >
            <AnimatePresence mode="popLayout" initial={false}>
              {isPending ? (
                <motion.span
                  key="pending"
                  initial={reduceMotion ? false : { opacity: 0, scale: 0.6 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.6 }}
                  transition={SPRING_SNAP}
                >
                  <Loader2 className="size-5 animate-spin" />
                </motion.span>
              ) : added ? (
                <motion.span
                  key="added"
                  initial={reduceMotion ? false : { opacity: 0, scale: 0.6 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.6 }}
                  transition={SPRING_SNAP}
                >
                  <Check className="size-5" />
                </motion.span>
              ) : (
                <motion.span
                  key="idle"
                  initial={reduceMotion ? false : { opacity: 0, scale: 0.6 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.6 }}
                  transition={SPRING_SNAP}
                >
                  <Plus className="size-5" />
                </motion.span>
              )}
            </AnimatePresence>
          </Button>
        )}
      </div>

      <div className="pointer-events-none flex flex-col gap-1">
        {product.brandName && (
          <span className="text-muted-foreground text-xs">{product.brandName}</span>
        )}
        <h3 className="line-clamp-2 text-sm font-medium">{product.name}</h3>

        <div className="flex items-baseline gap-2">
          {product.price ? (
            <span className="text-primary font-semibold">{product.price}</span>
          ) : (
            <span className="text-muted-foreground text-sm">{t('priceOnRequest')}</span>
          )}
          {product.compareAtPrice && (
            <span className="text-muted-foreground text-xs line-through">
              {product.compareAtPrice}
            </span>
          )}
        </div>
      </div>
    </motion.div>
  );
}
