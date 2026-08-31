'use client';

import { motion, useAnimationControls, useReducedMotion, type Variants } from 'motion/react';
import Image from 'next/image';
import { useLocale } from 'next-intl';
import { useEffect, useState } from 'react';

import { parseLocale, textDirection, type Locale } from '@/i18n/config';
import { Link } from '@/i18n/navigation';
import type { BrandSummary } from '@/lib/catalog/mappers';
import { DURATION, EASING, STAGGER_CHILD } from '@/lib/motion-tokens';

/** Logo brand one, name text otherwise — mirrors `ProductCard`'s
 * image-or-fallback treatment. `hidden` marks the decorative second copy
 * used by the marquee track: not reachable by AT or by keyboard tabbing. */
function BrandTile({ brand, hidden }: { brand: BrandSummary; hidden?: boolean }) {
  return (
    <Link
      href={`/brands/${brand.slug}`}
      aria-hidden={hidden}
      tabIndex={hidden ? -1 : undefined}
      className="text-muted-foreground hover:text-foreground focus-visible:ring-ring/50 bg-card flex h-14 min-w-28 shrink-0 items-center justify-center rounded-md border px-4 shadow-sm transition-all duration-300 hover:shadow-md focus-visible:ring-2 focus-visible:outline-none"
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
  );
}

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
  const locale = useLocale() as Locale;
  const isRtl = textDirection(parseLocale(locale).language) === 'rtl';
  const controls = useAnimationControls();
  const [isPaused, setIsPaused] = useState(false);

  // Loop duration scales with catalog size (~3s per brand) so the strip
  // feels the same speed whether Jannati carries 6 brands or 40.
  const duration = brands.length * 3;
  // The track is the brand list doubled, so -50% of its own width is
  // exactly one copy's width — a seamless loop back to the start. The
  // *direction* it visually reads start-to-end flips with locale: physical
  // left in LTR, physical right in RTL — same physical-vs-logical sign flip
  // `CartDrawer` does for its slide-in offset, not a hardcoded left/right.
  const target = isRtl ? '50%' : '-50%';

  useEffect(() => {
    if (reduceMotion) return;
    if (isPaused) {
      controls.stop();
      return;
    }
    void controls.start({
      x: target,
      transition: { duration, ease: 'linear', repeat: Infinity, repeatType: 'loop' },
    });
  }, [controls, isPaused, reduceMotion, duration, target]);

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

      {reduceMotion ? (
        // A moving marquee is exactly the motion `prefers-reduced-motion`
        // exists to avoid — fall back to the original static wrapped row.
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '0px 0px -80px 0px' }}
          variants={container}
          className="flex flex-wrap items-center gap-6"
        >
          {brands.map((brand) => (
            <motion.div key={brand.slug} variants={item}>
              <BrandTile brand={brand} />
            </motion.div>
          ))}
        </motion.div>
      ) : (
        <div
          className="overflow-hidden"
          onMouseEnter={() => setIsPaused(true)}
          onMouseLeave={() => setIsPaused(false)}
          onFocus={() => setIsPaused(true)}
          onBlur={() => setIsPaused(false)}
        >
          <motion.div animate={controls} className="flex w-max items-center gap-6">
            {brands.map((brand) => (
              <BrandTile key={brand.slug} brand={brand} />
            ))}
            {brands.map((brand) => (
              <BrandTile key={`${brand.slug}-duplicate`} brand={brand} hidden />
            ))}
          </motion.div>
        </div>
      )}
    </section>
  );
}
