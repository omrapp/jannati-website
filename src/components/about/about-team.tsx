'use client';

import { Handshake, MessageCircle, PackageCheck } from 'lucide-react';
import { motion, useReducedMotion } from 'motion/react';

import { DURATION, EASING, STAGGER_CHILD } from '@/lib/motion-tokens';

const ROLE_ICONS = [Handshake, MessageCircle, PackageCheck] as const;

export type AboutTeamRole = { title: string; description: string };

/**
 * Role-based cards, deliberately no names or photos — there's no real team
 * roster to draw from, and inventing one (as the reference design's "Ahmed
 * Al-Harazi, Founder & CEO" does) would put fabricated people on a live
 * commercial page.
 */
export function AboutTeam({
  heading,
  subheading,
  roles,
}: {
  heading: string;
  subheading: string;
  roles: AboutTeamRole[];
}) {
  const reduceMotion = useReducedMotion();

  return (
    <div className="flex flex-col gap-12">
      <div className="flex flex-col items-center gap-3 text-center">
        <h2 className="font-display text-3xl font-semibold">{heading}</h2>
        <p className="text-muted-foreground max-w-2xl text-base leading-relaxed">{subheading}</p>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {roles.map((role, index) => {
          const Icon = ROLE_ICONS[index % ROLE_ICONS.length];
          return (
            <motion.div
              key={role.title}
              initial={reduceMotion ? { opacity: 1 } : { opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '0px 0px -60px 0px' }}
              transition={{
                duration: reduceMotion ? 0 : DURATION.normal,
                ease: EASING.out,
                delay: reduceMotion ? 0 : index * STAGGER_CHILD,
              }}
              className="bg-card flex flex-col items-center gap-4 rounded-lg border p-8 text-center"
            >
              <div className="bg-primary/10 flex size-16 items-center justify-center rounded-full">
                <Icon className="text-primary size-7" />
              </div>
              <h3 className="font-display text-lg font-semibold">{role.title}</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">{role.description}</p>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
