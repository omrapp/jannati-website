'use client';

import Image from 'next/image';
import { motion, useReducedMotion } from 'motion/react';

import { Button } from '@/components/ui/button';
import { Link } from '@/i18n/navigation';
import { DURATION, EASING } from '@/lib/motion-tokens';
import { cn } from '@/lib/utils';

/**
 * Two brand-toned gradient backgrounds, built from the same design tokens as
 * the rest of the home page (hero fallback uses `secondary`, NewsletterStrip
 * blends `primary`/`accent`/`secondary`) rather than one-off colors.
 */
const TONE_CLASSES = {
  primary: 'from-primary/15 via-primary/5 to-background',
  secondary: 'from-secondary/70 via-secondary/25 to-background',
} as const;

/**
 * Full-bleed promotional strip for the home page — the sooqwoow.com-style
 * pattern of a bold headline + short copy + CTA breaking up the vertical
 * rhythm of product rails. We don't have (or own) their banner imagery, so
 * this reproduces the *layout*: an optional catalog image (brand logo,
 * category shot) on one side, or — the default — a brand-toned gradient,
 * the same full-bleed treatment as page.tsx's no-banner hero fallback.
 */
export function PromoBanner({
  heading,
  subheading,
  ctaLabel,
  ctaHref,
  imageSrc,
  imageAlt,
  tone = 'primary',
}: {
  heading: string;
  subheading: string;
  ctaLabel: string;
  ctaHref: string;
  imageSrc?: string;
  imageAlt?: string;
  tone?: 'primary' | 'secondary';
}) {
  const reduceMotion = useReducedMotion();

  return (
    <motion.section
      initial={reduceMotion ? { opacity: 1 } : { opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '0px 0px -80px 0px' }}
      transition={{ duration: reduceMotion ? 0 : DURATION.slow, ease: EASING.out }}
      className={cn(
        '-mx-4 overflow-hidden bg-gradient-to-br shadow-sm md:mx-0 md:rounded-lg',
        TONE_CLASSES[tone],
      )}
    >
      <div className="max-w-page mx-auto flex flex-col items-center gap-8 px-4 py-14 text-center md:flex-row md:py-20 md:text-start lg:px-8">
        <div className="flex flex-1 flex-col items-center gap-4 md:items-start">
          <h2 className="font-display max-w-lg text-3xl font-semibold text-balance md:text-4xl">
            {heading}
          </h2>
          <p className="text-muted-foreground max-w-md text-base md:text-lg">{subheading}</p>
          <Button size="lg" asChild>
            <Link href={ctaHref}>{ctaLabel}</Link>
          </Button>
        </div>
        {imageSrc ? (
          <div className="relative aspect-square w-full max-w-xs flex-1 overflow-hidden rounded-lg shadow-sm md:max-w-sm">
            <Image
              src={imageSrc}
              alt={imageAlt ?? ''}
              fill
              sizes="(min-width: 768px) 384px, 320px"
              className="object-cover"
            />
          </div>
        ) : null}
      </div>
    </motion.section>
  );
}
