'use client';

import { motion, useReducedMotion, type Variants } from 'motion/react';
import Image from 'next/image';

import { Link } from '@/i18n/navigation';
import type { BrandSummary } from '@/lib/catalog/mappers';
import { DURATION, EASING, STAGGER_CHILD } from '@/lib/motion-tokens';

/** Logo when the brand has one, name text otherwise — mirrors `ProductCard`'s
 * image-or-fallback treatment. Renders nothing when the catalog has no brands yet. */
export function BrandStrip({
  heading,
  viewAllHref,
  viewAllLabel,
  brands,
}: {
  heading: string;
  viewAllHref: string;
  viewAllLabel: string;
  brands: BrandSummary[];
}) {
  const reduceMotion = useReducedMotion();

  if (brands.length === 0) return null;

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
        className="flex flex-wrap items-center gap-6"
      >
        {brands.map((brand) => (
          <motion.div key={brand.slug} variants={item}>
            <Link
              href={`/brands/${brand.slug}`}
              className="text-muted-foreground hover:text-foreground focus-visible:ring-ring/50 shadow-sm hover:shadow-md flex h-14 min-w-28 items-center justify-center rounded-md border bg-card px-4 transition-all duration-300 focus-visible:ring-2 focus-visible:outline-none"
            >
              {brand.logoUrl ? (
                <Image
                  src={brand.logoUrl}
                  alt={brand.name}
                  width={96}
                  height={48}
                  className="h-10 w-auto object-contain"
                />
              ) : (
                <span className="text-sm font-medium">{brand.name}</span>
              )}
            </Link>
          </motion.div>
        ))}
      </motion.div>
    </section>
  );
}
