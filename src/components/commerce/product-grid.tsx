import { useTranslations } from 'next-intl';

import { ProductCard } from '@/components/commerce/product-card';
import type { ProductSummary } from '@/lib/catalog/mappers';

export function ProductGrid({ products }: { products: ProductSummary[] }) {
  const t = useTranslations('catalog');

  if (products.length === 0) {
    return <p className="text-muted-foreground py-16 text-center">{t('empty')}</p>;
  }

  return (
    <div className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 lg:grid-cols-4">
      {products.map((product, index) => (
        <ProductCard
          key={product.handle}
          product={product}
          // The first row is above the fold on every width.
          priority={index < 4}
        />
      ))}
    </div>
  );
}
