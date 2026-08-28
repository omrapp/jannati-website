'use client';

import { motion, useReducedMotion, type Variants } from 'motion/react';
import Image from 'next/image';

import { Link } from '@/i18n/navigation';
import type { CategorySummary } from '@/lib/catalog/mappers';
import { DURATION, EASING, STAGGER_CHILD } from '@/lib/motion-tokens';

/**
 * Photo-led category tiles — the first thing a shopper sees, so this is
 * where the editorial aesthetic gets established. Falls back to a brand-
 * tinted gradient card (not a broken image) when a category has no
 * `imageUrl` yet, since not every category will have art on day one.
 */
export function CategoryGrid({ heading, categories }: { heading: string; categories: CategorySummary[] }) {
  const reduceMotion = useReducedMotion();

  if (categories.length === 0) return null;

  const container: Variants = {
    hidden: {},
    visible: { transition: { staggerChildren: reduceMotion ? 0 : STAGGER_CHILD } },
  };

  const item: Variants = {
    hidden: reduceMotion ? { opacity: 1 } : { opacity: 0, y: 24 },
    visible: { opacity: 1, y: 0, transition: { duration: reduceMotion ? 0 : DURATION.normal, ease: EASING.out } },
  };

  return (
    <section className="flex flex-col gap-4 sm:gap-6">
      <h2 className="font-display text-2xl font-semibold sm:text-3xl">{heading}</h2>
      <motion.div
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: '0px 0px -80px 0px' }}
        variants={container}
        className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 md:grid-cols-4"
      >
        {categories.map((category) => (
          <motion.div key={category.slug} variants={item}>
            <Link
              href={`/collections/${category.slug}`}
              className="group focus-visible:ring-ring/50 shadow-sm hover:shadow-lg relative flex aspect-[4/5] overflow-hidden rounded-lg transition-shadow duration-300 focus-visible:ring-2 focus-visible:outline-none"
            >
              {category.imageUrl ? (
                <>
                  <Image
                    src={category.imageUrl}
                    alt=""
                    fill
                    sizes="(min-width: 768px) 25vw, 50vw"
                    className="object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                  <div
                    aria-hidden
                    className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/10 to-transparent"
                  />
                  <span className="absolute inset-x-0 bottom-0 p-3 text-sm font-semibold text-white sm:p-4 sm:text-base">
                    {category.name}
                  </span>
                </>
              ) : (
                <div className="from-primary/20 via-accent/10 to-secondary/60 flex size-full flex-col items-center justify-center gap-2 bg-gradient-to-br p-4 text-center transition-transform duration-300 group-hover:scale-105">
                  <span className="text-foreground text-sm font-semibold sm:text-base">{category.name}</span>
                </div>
              )}
            </Link>
          </motion.div>
        ))}
      </motion.div>
    </section>
  );
}
