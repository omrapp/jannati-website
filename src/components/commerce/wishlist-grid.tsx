'use client';

import { useTransition } from 'react';
import { useTranslations } from 'next-intl';
import { X } from 'lucide-react';

import { removeFromWishlistAction } from '@/app/[locale]/account/wishlist/actions';
import { ProductCard } from '@/components/commerce/product-card';
import { Button } from '@/components/ui/button';
import type { ProductSummary } from '@/lib/catalog/mappers';

/**
 * Same card as the PLP grid, just with a remove button pinned over the
 * corner — removing here is a direct delete, not a toggle, so it skips
 * `WishlistButton`'s optimistic-toggle shape.
 */
export function WishlistGrid({ products }: { products: ProductSummary[] }) {
  const t = useTranslations('wishlist');
  const [isPending, startTransition] = useTransition();

  if (products.length === 0) {
    return <p className="text-muted-foreground py-16 text-center">{t('empty')}</p>;
  }

  function remove(productId: string) {
    startTransition(() => {
      void removeFromWishlistAction(productId);
    });
  }

  return (
    <div className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 lg:grid-cols-4">
      {products.map((product) => (
        <div key={product.handle} className="relative">
          <Button
            variant="secondary"
            size="icon"
            disabled={isPending}
            onClick={() => remove(product.id)}
            aria-label={t('remove')}
            className="absolute end-2 top-2 z-10 size-8 rounded-full"
          >
            <X className="size-4" />
          </Button>
          <ProductCard product={product} />
        </div>
      ))}
    </div>
  );
}
