'use client';

import { Quote } from 'lucide-react';
import { motion, useReducedMotion } from 'motion/react';

import { DURATION, EASING } from '@/lib/motion-tokens';

/**
 * Two-column story + pull-quote. `body` is the storefront's real `about-us`
 * CMS copy (see `scripts/seed/content-pages.ts`), not new marketing text —
 * and the quote is attributed to "The Jannati Team", not an invented
 * founder name (there's no real one to use).
 */
export function AboutStory({
  heading,
  body,
  quote,
  quoteAttribution,
}: {
  heading: string;
  body: string;
  quote: string;
  quoteAttribution: string;
}) {
  const reduceMotion = useReducedMotion();

  return (
    <motion.div
      initial={reduceMotion ? { opacity: 1 } : { opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '0px 0px -80px 0px' }}
      transition={{ duration: reduceMotion ? 0 : DURATION.slow, ease: EASING.out }}
      className="grid gap-10 lg:grid-cols-2 lg:items-center"
    >
      <div className="flex flex-col gap-4">
        <h2 className="font-display text-3xl font-semibold">{heading}</h2>
        <p className="text-muted-foreground leading-relaxed whitespace-pre-line">{body}</p>
      </div>

      <div className="bg-card flex flex-col gap-4 rounded-lg border p-8 shadow-sm">
        <Quote className="text-primary size-10" />
        <blockquote className="text-lg leading-relaxed italic">{quote}</blockquote>
        <span className="text-muted-foreground text-sm font-medium">— {quoteAttribution}</span>
      </div>
    </motion.div>
  );
}
