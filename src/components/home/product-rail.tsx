'use client';

import { motion, useReducedMotion, type Variants } from 'motion/react';

import { ProductCard } from '@/components/commerce/product-card';
import { Link } from '@/i18n/navigation';
import type { ProductSummary } from '@/lib/catalog/mappers';
import { DURATION, EASING, STAGGER_CHILD } from '@/lib/motion-tokens';

/**
 * One home-page product section (New Arrivals / Best Sellers / Recommended).
 * Reuses `ProductCard` and the same stagger-reveal pattern as `ProductGrid`
 * on the `/products` grid — same image/price/badge shape and the same
 * motion language, since a shopper shouldn't feel two different components.
 * Renders nothing when empty, per the home rebuild's empty-state rule — an
 * empty section with no products under a heading would look broken, not
 * "empty".
 */
export function ProductRail({
  heading,
  viewAllHref,
  viewAllLabel,
  products,
  priority = false,
}: {
  heading: string;
  viewAllHref: string;
  viewAllLabel: string;
  products: ProductSummary[];
  /** Marks the first row's images `fetchpriority="high"` and skips lazy-loading — set this only on the rail that renders above the fold (the home page's first one). */
  priority?: boolean;
}) {
  const reduceMotion = useReducedMotion();

  if (products.length === 0) return null;

  const container: Variants = {
    hidden: {},
    visible: { transition: { staggerChildren: reduceMotion ? 0 : STAGGER_CHILD } },
  };
  const item: Variants = {
    hidden: reduceMotion ? { opacity: 1 } : { opacity: 0, y: 24 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: reduceMotion ? 0 : DURATION.normal, ease: EASING.out },
    },
  };

  return (
    <section className="flex flex-col gap-4 sm:gap-6">
      <div className="flex items-baseline justify-between">
        <h2 className="font-display text-2xl font-semibold sm:text-3xl">{heading}</h2>
        <Link href={viewAllHref} className="text-primary text-sm font-medium hover:underline">
          {viewAllLabel}
        </Link>
      </div>
      <motion.div
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: '0px 0px -80px 0px' }}
        variants={container}
        className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 lg:grid-cols-4"
      >
        {products.map((product, index) => {
          // Same LCP-vs-opacity:0 tradeoff as ProductGrid: the priority
          // cards (the rail marked `priority`, first row) must paint on
          // first render, so they skip the whileInView reveal wrapper
          // entirely instead of shipping `opacity:0` until it fires.
          const isPriorityCard = priority && index < 4;

          return isPriorityCard ? (
            <div key={product.handle}>
              <ProductCard product={product} priority />
            </div>
          ) : (
            <motion.div key={product.handle} variants={item}>
              <ProductCard product={product} priority={false} />
            </motion.div>
          );
        })}
      </motion.div>
    </section>
  );
}
