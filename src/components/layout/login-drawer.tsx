'use client';

import { User, X } from 'lucide-react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { useTranslations } from 'next-intl';
import { Dialog } from 'radix-ui';
import { useState } from 'react';

import { LoginForm } from '@/app/[locale]/auth/login/login-form';
import { Button } from '@/components/ui/button';
import { parseLocale, textDirection, type Locale } from '@/i18n/config';
import { usePathname } from '@/i18n/navigation';
import { DURATION, EASING, SPRING_DRAWER } from '@/lib/motion-tokens';

/**
 * Header's account trigger for a logged-out shopper: opens the existing
 * `LoginForm` in a side drawer instead of navigating to `/auth/login`,
 * mirroring `CartDrawer`'s structure (bare Radix `Dialog`, spring slide-in,
 * same docking edge). A logged-in shopper never sees this — `Header` renders
 * a plain `Link` to `/account` instead, see header.tsx.
 *
 * Unlike `CartDrawer`, open/close state is local: nothing else in the app
 * needs to open this drawer imperatively, so there's no need for the
 * module-level store `CartDrawer` uses to let other components pop it open.
 *
 * `next` is the current path (locale-stripped, via next-intl's `usePathname`
 * — the same shape the `/auth/login` page reads from its `?next=` search
 * param) so a successful login returns the shopper to where they were. The
 * server action itself calls `redirect()` on success, so the drawer just
 * unmounts as the page navigates — no local "close on success" handling
 * needed.
 */
export function LoginDrawer({ locale }: { locale: Locale }) {
  const t = useTranslations();
  const isRtl = textDirection(parseLocale(locale).language) === 'rtl';
  const reduceMotion = useReducedMotion();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  // Same docking-edge logic as `CartDrawer`: `end-0` handles placement via
  // logical positioning, but the slide transform's sign still has to flip by
  // hand between LTR (slides from the physical right) and RTL (left).
  const hiddenX = isRtl ? '-100%' : '100%';

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>
        <Button variant="ghost" size="icon" aria-label={t('common.account')}>
          <User className="size-5" />
        </Button>
      </Dialog.Trigger>

      <AnimatePresence>
        {open && (
          <Dialog.Portal forceMount>
            <Dialog.Overlay asChild forceMount>
              <motion.div
                className="fixed inset-0 z-50 bg-black/50"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: DURATION.normal, ease: EASING.out }}
              />
            </Dialog.Overlay>
            <Dialog.Content asChild forceMount>
              <motion.div
                role="dialog"
                className="bg-background fixed inset-y-0 end-0 z-50 flex w-full flex-col border-s shadow-lg sm:max-w-md"
                initial={reduceMotion ? { opacity: 0 } : { x: hiddenX, opacity: 1 }}
                animate={{ x: 0, opacity: 1 }}
                exit={reduceMotion ? { opacity: 0 } : { x: hiddenX, opacity: 1 }}
                transition={reduceMotion ? { duration: DURATION.instant } : SPRING_DRAWER}
              >
                <div className="flex flex-col gap-1.5 p-4 pe-14">
                  <Dialog.Title className="text-foreground font-semibold">
                    {t('auth.login.heading')}
                  </Dialog.Title>
                </div>
                <Dialog.Close
                  aria-label={t('common.close')}
                  className="ring-offset-background focus-visible:ring-ring hover:bg-secondary absolute top-2 end-2 flex size-11 items-center justify-center rounded-md opacity-70 transition-opacity hover:opacity-100 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
                >
                  <X className="size-4" />
                </Dialog.Close>

                <div className="flex-1 overflow-y-auto px-4 pb-6">
                  <LoginForm locale={locale} next={pathname} />
                </div>
              </motion.div>
            </Dialog.Content>
          </Dialog.Portal>
        )}
      </AnimatePresence>
    </Dialog.Root>
  );
}
