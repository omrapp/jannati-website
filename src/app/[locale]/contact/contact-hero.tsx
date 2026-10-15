'use client';

import { motion, useReducedMotion } from 'motion/react';

import { DURATION, EASING } from '@/lib/motion-tokens';

/**
 * Centered hero above the info/form grid — previously the page opened
 * straight into a small `<h1>` with no breathing room. Same
 * fade-up-on-view treatment as the home page's `PromoBanner`/
 * `NewsletterStrip`, so this page doesn't feel like a different product.
 */
export function ContactHero({ heading, subheading }: { heading: string; subheading: string }) {
  const reduceMotion = useReducedMotion();

  return (
    <motion.div
      initial={reduceMotion ? { opacity: 1 } : { opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: reduceMotion ? 0 : DURATION.slow, ease: EASING.out }}
      className="from-primary/10 via-accent/5 to-secondary/40 flex flex-col items-center gap-3 bg-gradient-to-br px-4 py-16 text-center sm:py-20"
    >
      <h1 className="font-display text-3xl font-semibold text-balance sm:text-5xl">{heading}</h1>
      <p className="text-muted-foreground max-w-xl text-base sm:text-lg">{subheading}</p>
    </motion.div>
  );
}
