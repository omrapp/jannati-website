import Image from 'next/image';
import { useTranslations } from 'next-intl';

import { Badge } from '@/components/ui/badge';
import { Link } from '@/i18n/navigation';
import type { ProductSummary } from '@/lib/catalog/mappers';

/**
 * One product in a grid. The whole card is a single link, so a shopper on a
 * phone hits the target wherever they tap.
 */
export function ProductCard({
  product,
  priority,
}: {
  product: ProductSummary;
  priority?: boolean;
}) {
  const t = useTranslations('catalog');

  return (
    <Link
      href={`/products/${product.handle}`}
      className="group focus-visible:ring-ring/50 flex flex-col gap-3 rounded-lg focus-visible:ring-2 focus-visible:outline-none"
    >
      <div className="bg-secondary/40 relative aspect-square overflow-hidden rounded-lg">
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
      </div>

      <div className="flex flex-col gap-1">
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
    </Link>
  );
}
