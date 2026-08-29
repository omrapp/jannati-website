'use client';

import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { useTranslations } from 'next-intl';

import { WhatsAppIcon, whatsAppLink } from '@/components/layout/social-icons';
import type { SiteSettings } from '@/lib/admin/site-settings';
import { DURATION, SPRING_DRAWER } from '@/lib/motion-tokens';

/**
 * Sticky, site-wide WhatsApp contact button — fixed to a screen corner
 * (logical `bottom-6 end-6`, so it sits correctly in both LTR and RTL with
 * no direction check), not tied to any one page. Mounted once in the root
 * locale layout alongside `Header`/`Footer`.
 *
 * `z-40`, one below the header's sticky bar and the cart/login drawer
 * overlays (`z-50` each) — it must never sit on top of an open drawer.
 *
 * Renders nothing when WhatsApp isn't configured or the admin toggle
 * (`whatsapp_show`) is off, same gating as the footer's WhatsApp link.
 */
export function WhatsAppButton({ settings }: { settings: SiteSettings }) {
  const t = useTranslations('common');
  const reduceMotion = useReducedMotion();

  const show = Boolean(settings.whatsapp_show && settings.whatsapp);
  const href = show ? whatsAppLink(settings.whatsapp as string) : null;

  return (
    <AnimatePresence>
      {href && (
        <motion.a
          href={href}
          target="_blank"
          rel="noreferrer noopener"
          aria-label={t('whatsappContact')}
          initial={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.5 }}
          transition={reduceMotion ? { duration: DURATION.instant } : SPRING_DRAWER}
          className="fixed bottom-6 end-6 z-40 flex size-14 items-center justify-center rounded-full bg-[#25D366] text-white shadow-lg transition-transform hover:scale-105"
        >
          <WhatsAppIcon className="size-7" />
        </motion.a>
      )}
    </AnimatePresence>
  );
}
