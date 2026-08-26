'use client';

import { ShoppingBag, X } from 'lucide-react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { useLocale, useTranslations } from 'next-intl';
import { Dialog } from 'radix-ui';
import { useSyncExternalStore } from 'react';

import { CartLineItem } from '@/components/commerce/cart-line-item';
import { CartTotals } from '@/components/commerce/cart-totals';
import { Button, buttonVariants } from '@/components/ui/button';
import { parseLocale, textDirection, type Locale } from '@/i18n/config';
import { Link } from '@/i18n/navigation';
import type { CartLineDetail } from '@/lib/commerce/cart';
import { DURATION, EASING, SPRING_DRAWER } from '@/lib/motion-tokens';
import { cn } from '@/lib/utils';

type CartTotalsView = {
  subtotal: string;
  discount: string | null;
  shipping: string;
  vat: string;
  total: string;
};

// Open/close state lives in a tiny module-level store instead of component
// state. `Header` (a Server Component) can't hold client state for us, and a
// future add-to-cart flow (product-card.tsx quick-add, PDP add button —
// tracked separately, see task note) needs to be able to pop this drawer
// open from anywhere in the client tree without this file changing again.
// `useSyncExternalStore` below is the single source of truth for `open`.
type Listener = () => void;
let cartDrawerOpen = false;
const listeners = new Set<Listener>();

function notify() {
  for (const listener of listeners) listener();
}

/** Opens the cart drawer from any client component. */
export function openCartDrawer() {
  cartDrawerOpen = true;
  notify();
}

/** Closes the cart drawer from any client component. */
export function closeCartDrawer() {
  cartDrawerOpen = false;
  notify();
}

function subscribe(listener: Listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot() {
  return cartDrawerOpen;
}

function getServerSnapshot() {
  return false;
}

/**
 * Header's cart trigger + drawer. `lines` and `totals` are server-computed
 * props from `Header` — the same `getCartWithTotals` read the `/cart` page
 * uses — so the drawer only ever owns open/close state, never re-derives a
 * price or a total, and can't drift from what `/cart` shows for the same cart.
 *
 * Built on the bare Radix `Dialog` primitive rather than the shared
 * `ui/sheet.tsx` wrapper: that wrapper's slide is a CSS keyframe transition
 * (no spring support) and is also used by unrelated surfaces (admin sidebar,
 * mobile nav) this task must not touch, so the spring-driven chrome lives
 * here instead.
 */
export function CartDrawer({
  lines,
  totals,
}: {
  lines: CartLineDetail[];
  totals: CartTotalsView | null;
}) {
  const t = useTranslations('cart');
  const locale = useLocale() as Locale;
  const isRtl = textDirection(parseLocale(locale).language) === 'rtl';
  const reduceMotion = useReducedMotion();
  const open = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const itemCount = lines.reduce((sum, line) => sum + line.qty, 0);
  const isEmpty = lines.length === 0 || !totals;

  // Docks at the inline-end — the same edge the cart icon sits on — via
  // logical positioning (`end-0` below), so no per-direction class swap is
  // needed for placement. The slide *offset* is a raw transform though, so
  // its sign still has to flip by hand: inline-end is the physical right in
  // LTR (slides out towards positive x) and the physical left in RTL
  // (slides out towards negative x).
  const hiddenX = isRtl ? '-100%' : '100%';

  function handleOpenChange(next: boolean) {
    if (next) openCartDrawer();
    else closeCartDrawer();
  }

  return (
    <Dialog.Root open={open} onOpenChange={handleOpenChange}>
      <Dialog.Trigger asChild>
        <Button variant="ghost" size="icon" className="relative" aria-label={t('title')}>
          <ShoppingBag className="size-5" />
          <AnimatePresence>
            {itemCount > 0 && (
              <motion.span
                key={itemCount}
                initial={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.5 }}
                transition={reduceMotion ? { duration: DURATION.instant } : SPRING_DRAWER}
                className="bg-primary text-primary-foreground absolute -top-1 -end-1 flex size-4 items-center justify-center rounded-full text-[10px]"
              >
                {itemCount}
              </motion.span>
            )}
          </AnimatePresence>
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
                  <Dialog.Title className="text-foreground font-semibold">{t('title')}</Dialog.Title>
                </div>
                <Dialog.Close className="ring-offset-background focus-visible:ring-ring hover:bg-secondary absolute top-2 end-2 flex size-11 items-center justify-center rounded-md opacity-70 transition-opacity hover:opacity-100 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none">
                  <X className="size-4" />
                  <span className="sr-only">Close</span>
                </Dialog.Close>

                {isEmpty ? (
                  <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
                    <motion.div
                      initial={reduceMotion ? false : { opacity: 0, scale: 0.85 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: reduceMotion ? 0 : 0.05, duration: DURATION.normal, ease: EASING.spring }}
                      className="bg-secondary/60 text-muted-foreground flex size-16 items-center justify-center rounded-full"
                    >
                      <ShoppingBag className="size-7" aria-hidden="true" />
                    </motion.div>
                    <p className="text-muted-foreground max-w-[26ch] text-sm">{t('empty')}</p>
                    <Link
                      href="/"
                      onClick={closeCartDrawer}
                      className={cn(buttonVariants({ variant: 'outline' }), 'min-h-11')}
                    >
                      {t('continueShopping')}
                    </Link>
                  </div>
                ) : (
                  <>
                    <div className="flex-1 divide-y overflow-y-auto px-4">
                      <AnimatePresence initial={false}>
                        {lines.map((line) => (
                          <CartLineItem key={line.variantId} line={line} />
                        ))}
                      </AnimatePresence>
                    </div>
                    <div className="border-t p-4">
                      <CartTotals {...totals} />
                      <Button asChild size="lg" className="mt-4 w-full">
                        <Link href="/cart" onClick={closeCartDrawer}>
                          {t('viewCart')}
                        </Link>
                      </Button>
                    </div>
                  </>
                )}
              </motion.div>
            </Dialog.Content>
          </Dialog.Portal>
        )}
      </AnimatePresence>
    </Dialog.Root>
  );
}
