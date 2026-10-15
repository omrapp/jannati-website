'use client';

import { Mail, MapPin, Phone } from 'lucide-react';
import { motion, useReducedMotion } from 'motion/react';

import { WhatsAppIcon } from '@/components/layout/social-icons';
import { DURATION, EASING, STAGGER_CHILD } from '@/lib/motion-tokens';

export type ContactCardKind = 'phone' | 'email' | 'whatsapp' | 'address';

export type ContactCard = {
  kind: ContactCardKind;
  title: string;
  description: string;
  value: string;
  href?: string;
};

// `kind` decides the icon here, in the client component, rather than the
// icon component itself being passed down as a prop — a function/component
// reference can't cross the server→client boundary from `page.tsx`.
const ICONS: Record<ContactCardKind, React.ComponentType<React.SVGProps<SVGSVGElement>>> = {
  phone: Phone,
  email: Mail,
  whatsapp: WhatsAppIcon,
  address: MapPin,
};

/** Icon-card grid for the contact page's phone/email/WhatsApp/address details, replacing the old plain list. */
export function ContactInfoCards({ cards }: { cards: ContactCard[] }) {
  const reduceMotion = useReducedMotion();

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {cards.map((card, index) => {
        const Icon = ICONS[card.kind];
        const isExternal = card.kind === 'whatsapp';

        return (
          <motion.div
            key={card.kind}
            initial={reduceMotion ? { opacity: 1 } : { opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '0px 0px -60px 0px' }}
            transition={{
              duration: reduceMotion ? 0 : DURATION.normal,
              ease: EASING.out,
              delay: reduceMotion ? 0 : index * STAGGER_CHILD,
            }}
            className="flex items-start gap-3 rounded-lg border p-4"
          >
            <div className="bg-primary/10 flex size-10 shrink-0 items-center justify-center rounded-lg">
              <Icon className="text-primary size-5" />
            </div>
            <div className="flex flex-col gap-0.5">
              <span className="font-display text-sm font-semibold">{card.title}</span>
              {card.href ? (
                <a
                  href={card.href}
                  target={isExternal ? '_blank' : undefined}
                  rel={isExternal ? 'noreferrer noopener' : undefined}
                  className="text-sm hover:underline"
                >
                  {card.value}
                </a>
              ) : (
                <span className="text-sm">{card.value}</span>
              )}
              <span className="text-muted-foreground text-xs">{card.description}</span>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}
