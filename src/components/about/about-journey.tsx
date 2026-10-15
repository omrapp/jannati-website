'use client';

import { MessageCircle, Search, ShoppingBag, Truck } from 'lucide-react';
import { motion, useReducedMotion } from 'motion/react';

import { DURATION, EASING, STAGGER_CHILD } from '@/lib/motion-tokens';

const STEP_ICONS = [Search, ShoppingBag, Truck, MessageCircle] as const;

export type AboutJourneyStep = { title: string; description: string };

/**
 * Numbered process steps, not a dated company timeline — the reference
 * design's "2025: Founded", "2026: Expanded" milestones aren't real facts
 * we have, so this section shows what shopping with Jannati looks like
 * instead of inventing company history.
 */
export function AboutJourney({
  heading,
  subheading,
  steps,
}: {
  heading: string;
  subheading: string;
  steps: AboutJourneyStep[];
}) {
  const reduceMotion = useReducedMotion();

  return (
    <div className="flex flex-col gap-12">
      <div className="flex flex-col items-center gap-3 text-center">
        <h2 className="font-display text-3xl font-semibold">{heading}</h2>
        <p className="text-muted-foreground max-w-2xl text-base leading-relaxed">{subheading}</p>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {steps.map((step, index) => {
          const Icon = STEP_ICONS[index % STEP_ICONS.length];
          return (
            <motion.div
              key={step.title}
              initial={reduceMotion ? { opacity: 1 } : { opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '0px 0px -60px 0px' }}
              transition={{
                duration: reduceMotion ? 0 : DURATION.normal,
                ease: EASING.out,
                delay: reduceMotion ? 0 : index * STAGGER_CHILD,
              }}
              className="bg-card flex flex-col gap-3 rounded-lg border p-6"
            >
              <div className="flex items-center gap-3">
                <div className="bg-primary text-primary-foreground flex size-9 shrink-0 items-center justify-center rounded-full font-semibold">
                  {index + 1}
                </div>
                <Icon className="text-primary size-5" />
              </div>
              <h3 className="font-display text-base font-semibold">{step.title}</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">{step.description}</p>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
