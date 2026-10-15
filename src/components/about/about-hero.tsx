'use client';

import { Fragment } from 'react';
import { motion, useReducedMotion } from 'motion/react';

import { Separator } from '@/components/ui/separator';
import { DURATION, EASING } from '@/lib/motion-tokens';

export type AboutStat = { value: string; label: string };

/**
 * Hero + a 3-stat row, same fade-up-on-view treatment as the home page's
 * `PromoBanner`/`NewsletterStrip`. Every stat here is a real, checkable
 * number (years in `home.heroSubtitle`, GCC country count from
 * `i18n/config.ts`) — no invented founding year or headcount, unlike the
 * reference design this replaces.
 */
export function AboutHero({
  heading,
  subheading,
  stats,
}: {
  heading: string;
  subheading: string;
  stats: AboutStat[];
}) {
  const reduceMotion = useReducedMotion();

  return (
    <motion.div
      initial={reduceMotion ? { opacity: 1 } : { opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: reduceMotion ? 0 : DURATION.slow, ease: EASING.out }}
      className="from-primary/10 via-accent/5 to-secondary/40 flex flex-col items-center gap-8 bg-gradient-to-br px-4 py-16 text-center sm:py-20"
    >
      <div className="flex flex-col items-center gap-3">
        <h1 className="font-display text-3xl font-semibold text-balance sm:text-5xl">{heading}</h1>
        <p className="text-muted-foreground max-w-xl text-base sm:text-lg">{subheading}</p>
      </div>

      <div className="flex items-center gap-6 sm:gap-10">
        {stats.map((stat, index) => (
          <Fragment key={stat.label}>
            {index > 0 && <Separator orientation="vertical" className="h-10" />}
            <div className="flex flex-col items-center">
              <span className="font-display text-primary text-2xl font-bold sm:text-3xl">
                {stat.value}
              </span>
              <span className="text-muted-foreground text-xs sm:text-sm">{stat.label}</span>
            </div>
          </Fragment>
        ))}
      </div>
    </motion.div>
  );
}
