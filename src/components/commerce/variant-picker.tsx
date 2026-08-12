'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';

import { PriceDisplay } from '@/components/commerce/price-display';
import { Button } from '@/components/ui/button';
import type { ProductVariant } from '@/lib/catalog/mappers';
import { cn } from '@/lib/utils';

/**
 * Owns the selected variant, and with it the price and stock line — switching
 * size or shade re-prices in place instead of navigating.
 *
 * Add to cart is deliberately inert until Phase 2 wires the cart; it is
 * rendered disabled rather than hidden so the layout does not shift when it
 * starts working.
 */
export function VariantPicker({ variants }: { variants: ProductVariant[] }) {
  const t = useTranslations('catalog');
  // Prefer something buyable: landing on a sold-out shade reads as a dead page.
  const [selectedId, setSelectedId] = useState(
    () => (variants.find((variant) => variant.inStock) ?? variants[0])?.id,
  );
  const selected = variants.find((variant) => variant.id === selectedId) ?? variants[0] ?? null;
  const named = variants.filter((variant) => variant.title);

  return (
    <div className="flex flex-col gap-5">
      <PriceDisplay
        price={selected?.price ?? null}
        compareAtPrice={selected?.compareAtPrice}
        fallback={t('priceOnRequest')}
      />

      {named.length > 1 && (
        <fieldset className="flex flex-col gap-2">
          <legend className="text-muted-foreground mb-2 text-sm">{t('chooseOption')}</legend>
          <div className="flex flex-wrap gap-2">
            {named.map((variant) => (
              <button
                key={variant.id}
                type="button"
                onClick={() => setSelectedId(variant.id)}
                aria-pressed={variant.id === selected?.id}
                // The strike-through is the only visual cue; screen readers get
                // the same information in the name.
                aria-label={variant.inStock ? undefined : `${variant.title} — ${t('outOfStock')}`}
                className={cn(
                  'hover:bg-secondary rounded-md border px-3 py-2 text-sm',
                  variant.id === selected?.id &&
                    'border-primary bg-primary text-primary-foreground hover:bg-primary',
                  !variant.inStock && 'text-muted-foreground line-through',
                )}
              >
                {variant.title}
              </button>
            ))}
          </div>
        </fieldset>
      )}

      <p
        className={cn('text-sm', selected?.inStock ? 'text-emerald-600' : 'text-muted-foreground')}
      >
        {selected?.inStock ? t('inStock') : t('outOfStock')}
      </p>

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
