'use client';

import { Heart, Plus } from 'lucide-react';
import { motion, useReducedMotion } from 'motion/react';
import { useTranslations } from 'next-intl';
import Image from 'next/image';
import { useState } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Link } from '@/i18n/navigation';
import type { ProductSummary } from '@/lib/catalog/mappers';
import { SPRING_SNAP } from '@/lib/motion-tokens';
import { cn } from '@/lib/utils';

/**
 * One product in a grid. The product link is a full-card overlay (`inset-0`,
 * `z-10`) rather than wrapping every child, so the wishlist/quick-add
 * buttons can sit above it (`z-20`) as real siblings instead of buttons
 * nested inside an `<a>` — invalid HTML, and unreachable by keyboard as two
 * separate stops. A shopper still hits the product link wherever else they
 * tap; the two small buttons are the only carve-outs.
 */
export function ProductCard({
  product,
  priority,
  onQuickAdd,
}: {
  product: ProductSummary;
  priority?: boolean;
  /**
   * Quick-add is a visual affordance only for now — wiring it to the real
   * cart mutation (and the coordinated header cart-icon + drawer feedback)
   * is a separate task. Left as a passthrough so the button isn't dead: a
   * caller can wire it up without this component changing shape.
   */
  onQuickAdd?: (product: ProductSummary) => void;
}) {
  const t = useTranslations('catalog');
  const tWishlist = useTranslations('wishlist');
  const reduceMotion = useReducedMotion();
  // Decorative only, matching quick-add — see onQuickAdd note above. Real
  // per-shopper wishlist state would need every product listing query to
  // join wishlist rows for the current user, which is out of this
  // visual-redesign task's scope.
  const [saved, setSaved] = useState(false);

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
            priority={priority}
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

        {product.inStock && (
          <Button
            type="button"
            size="icon-lg"
            onClick={() => onQuickAdd?.(product)}
            aria-label={t('addToCart')}
            className={cn(
              'absolute end-2 bottom-2 z-20 size-11 rounded-full opacity-100 shadow-md transition-opacity duration-fast active:scale-95',
              'md:opacity-0 md:group-hover:opacity-100 md:group-focus-within:opacity-100',
            )}
          >
            <Plus className="size-5" />
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
