'use client';

import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { useState } from 'react';
import { useTranslations } from 'next-intl';

import { PriceDisplay } from '@/components/commerce/price-display';
import { Button } from '@/components/ui/button';
import type { ProductVariant } from '@/lib/catalog/mappers';
import { DURATION, EASING, SPRING_SNAP } from '@/lib/motion-tokens';
import { cn } from '@/lib/utils';

/**
 * Owns the selected variant, and with it the price and stock line — switching
 * size or shade re-prices in place instead of navigating.
 *
 * Add to cart is deliberately inert until Phase 2 wires the cart; it is
 * rendered disabled rather than hidden so the layout does not shift when it
 * starts working.
 *
 * `ProductVariant` carries no image reference (see `src/lib/catalog/mappers.ts`),
 * so there is no data path from a variant to a specific gallery photo yet —
 * selecting a shade/size re-prices in place but cannot swap the PDP gallery
 * image. "No layout jump" here means the price/availability swap itself:
 * the crossfade below (`mode="popLayout"`) removes the outgoing text from
 * layout immediately instead of animating both old and new at once, so nothing
 * shifts height while it transitions.
 */
export function VariantPicker({ variants }: { variants: ProductVariant[] }) {
  const t = useTranslations('catalog');
  const reduceMotion = useReducedMotion();
  // Prefer something buyable: landing on a sold-out shade reads as a dead page.
  const [selectedId, setSelectedId] = useState(
    () => (variants.find((variant) => variant.inStock) ?? variants[0])?.id,
  );
  const selected = variants.find((variant) => variant.id === selectedId) ?? variants[0] ?? null;
  const named = variants.filter((variant) => variant.title);

  const snapTransition = reduceMotion ? { duration: DURATION.instant } : SPRING_SNAP;
  const fadeTransition = reduceMotion
    ? { duration: DURATION.instant }
    : { duration: DURATION.fast, ease: EASING.out };

  return (
    <div className="flex flex-col gap-5">
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.div
          key={selected?.id ?? 'none'}
          initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 4 }}
          transition={fadeTransition}
        >
          <PriceDisplay
            price={selected?.price ?? null}
            compareAtPrice={selected?.compareAtPrice}
            fallback={t('priceOnRequest')}
          />
        </motion.div>
      </AnimatePresence>

      {named.length > 1 && (
        <fieldset className="flex flex-col gap-2">
          <legend className="text-muted-foreground mb-2 text-sm">{t('chooseOption')}</legend>
          <div className="flex flex-wrap gap-2">
            {named.map((variant) => {
              const isSelected = variant.id === selected?.id;

              return (
                <button
                  key={variant.id}
                  type="button"
                  onClick={() => setSelectedId(variant.id)}
                  aria-pressed={isSelected}
                  // The strike-through is the only visual cue; screen readers
                  // get the same information in the name.
                  aria-label={variant.inStock ? undefined : `${variant.title} — ${t('outOfStock')}`}
                  className={cn(
                    'relative inline-flex min-h-11 min-w-11 items-center justify-center rounded-md border px-3 py-2 text-sm transition-colors',
                    isSelected ? 'border-primary text-primary-foreground' : 'hover:bg-secondary',
                    !variant.inStock && 'text-muted-foreground line-through',
                  )}
                >
                  {isSelected && (
                    <motion.span
                      layoutId="variant-picker-highlight"
                      className="bg-primary absolute inset-0 -z-10 rounded-md"
                      transition={snapTransition}
                    />
                  )}
                  <span className="relative">{variant.title}</span>
                </button>
              );
            })}
          </div>
        </fieldset>
      )}

      <AnimatePresence mode="popLayout" initial={false}>
        <motion.p
          key={selected?.inStock ? 'in-stock' : 'out-of-stock'}
          initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 4 }}
          transition={fadeTransition}
          className={cn('text-sm', selected?.inStock ? 'text-emerald-600' : 'text-muted-foreground')}
        >
          {selected?.inStock ? t('inStock') : t('outOfStock')}
        </motion.p>
      </AnimatePresence>

      <div className="flex flex-col gap-2">
        <Button size="lg" disabled aria-describedby="cart-coming-soon" className="w-full sm:w-auto">
          {t('addToCart')}
        </Button>
        <p id="cart-coming-soon" className="text-muted-foreground text-xs">
          {t('cartComingSoon')}
        </p>
      </div>
    </div>
  );
}
