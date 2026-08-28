'use client';

import { motion, useReducedMotion, type Variants } from 'motion/react';
import { useTranslations } from 'next-intl';

import { ProductCard } from '@/components/commerce/product-card';
import type { ProductSummary } from '@/lib/catalog/mappers';
import { DURATION, EASING, STAGGER_CHILD } from '@/lib/motion-tokens';

export function ProductGrid({ products }: { products: ProductSummary[] }) {
  const t = useTranslations('catalog');
  const reduceMotion = useReducedMotion();

  if (products.length === 0) {
    return <p className="text-muted-foreground py-16 text-center">{t('empty')}</p>;
  }

  const container: Variants = {
    hidden: {},
    visible: { transition: { staggerChildren: reduceMotion ? 0 : STAGGER_CHILD } },
  };
  const item: Variants = {
    hidden: reduceMotion ? { opacity: 1 } : { opacity: 0, y: 16 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: reduceMotion ? 0 : DURATION.normal, ease: EASING.out },
    },
  };

  return (
    <motion.div
      // Re-keying on the visible handles replays the stagger whenever a
      // filter/sort change swaps the list, not just on first mount — the
      // grid is usually already on screen when a shopper changes a filter,
      // so a scroll-triggered reveal wouldn't fire again on its own.
      key={products.map((product) => product.handle).join(',')}
      initial="hidden"
      animate="visible"
      variants={container}
      className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 lg:grid-cols-4"
    >
      {products.map((product, index) => (
        <motion.div key={product.handle} variants={item}>
          <ProductCard
            product={product}
            // The first row is above the fold on every width.
            priority={index < 4}
          />
        </motion.div>
      ))}
    </motion.div>
  );
}
