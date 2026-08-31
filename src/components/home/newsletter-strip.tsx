'use client';

import { motion, useReducedMotion } from 'motion/react';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { DURATION, EASING } from '@/lib/motion-tokens';

/**
 * Decorative only — there's no email-capture backend yet (out of Phase 5
 * scope), so the input is `disabled` rather than wired to a fake submit.
 * An honest "coming soon" beats a form that silently does nothing.
 */
export function NewsletterStrip({
  title,
  subtitle,
  placeholder,
  comingSoon,
}: {
  title: string;
  subtitle: string;
  placeholder: string;
  comingSoon: string;
}) {
  const reduceMotion = useReducedMotion();

  return (
    <motion.section
      initial={reduceMotion ? { opacity: 1 } : { opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '0px 0px -80px 0px' }}
      transition={{ duration: reduceMotion ? 0 : DURATION.slow, ease: EASING.out }}
      className="from-primary/10 via-accent/5 to-secondary/40 shadow-sm flex flex-col items-center gap-3 rounded-lg bg-gradient-to-br px-6 py-12 text-center sm:py-16"
    >
      <h2 className="font-display text-2xl font-semibold sm:text-3xl">{title}</h2>
      <p className="text-muted-foreground max-w-md text-sm sm:text-base">{subtitle}</p>
      <div className="mt-2 flex w-full max-w-sm gap-2">
        <Label htmlFor="newsletter-email" className="sr-only">
          {placeholder}
        </Label>
        <Input
          id="newsletter-email"
          type="email"
          autoComplete="email"
          placeholder={placeholder}
          disabled
          className="bg-background"
        />
      </div>
      <p className="text-muted-foreground text-xs">{comingSoon}</p>
    </motion.section>
  );
}
