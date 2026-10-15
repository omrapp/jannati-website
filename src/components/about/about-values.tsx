'use client';

import { Award, Eye, ShieldCheck, Target, Truck, Wallet } from 'lucide-react';
import { motion, useReducedMotion } from 'motion/react';

import { DURATION, EASING, STAGGER_CHILD } from '@/lib/motion-tokens';

const VALUE_ICONS = [ShieldCheck, Wallet, Truck, Award] as const;

export type AboutValueDetail = { title: string; description: string };

/**
 * Mission/Vision header row, then a 4-card detail grid grounded in the
 * same authorized-sourcing / local-currency / GCC-shipping / regional-
 * support facts as the `about-us` CMS copy — not a generic "Excellence,
 * Integrity, ..." list.
 */
export function AboutValues({
  missionTitle,
  missionBody,
  visionTitle,
  visionBody,
  valuesTitle,
  valuesBody,
  details,
}: {
  missionTitle: string;
  missionBody: string;
  visionTitle: string;
  visionBody: string;
  valuesTitle: string;
  valuesBody: string;
  details: AboutValueDetail[];
}) {
  const reduceMotion = useReducedMotion();
  const headerCards = [
    { Icon: Target, title: missionTitle, body: missionBody },
    { Icon: Eye, title: visionTitle, body: visionBody },
    { Icon: Award, title: valuesTitle, body: valuesBody },
  ];

  return (
    <div className="flex flex-col gap-12">
      <div className="grid gap-6 md:grid-cols-3">
        {headerCards.map(({ Icon, title, body }) => (
          <div
            key={title}
            className="bg-card flex flex-col items-center gap-4 rounded-lg border p-8 text-center"
          >
            <Icon className="text-primary size-10" />
            <h3 className="font-display text-xl font-semibold">{title}</h3>
            <p className="text-muted-foreground text-sm leading-relaxed">{body}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {details.map((detail, index) => {
          const Icon = VALUE_ICONS[index % VALUE_ICONS.length];
          return (
            <motion.div
              key={detail.title}
              initial={reduceMotion ? { opacity: 1 } : { opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '0px 0px -60px 0px' }}
              transition={{
                duration: reduceMotion ? 0 : DURATION.normal,
                ease: EASING.out,
                delay: reduceMotion ? 0 : index * STAGGER_CHILD,
              }}
              className="flex flex-col items-center gap-3 text-center"
            >
              <div className="bg-primary/10 flex size-14 items-center justify-center rounded-xl">
                <Icon className="text-primary size-7" />
              </div>
              <h4 className="font-display text-base font-semibold">{detail.title}</h4>
              <p className="text-muted-foreground text-sm leading-relaxed">{detail.description}</p>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
