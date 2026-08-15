'use client';

import { ShoppingBag } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';

import { CartLineItem } from '@/components/commerce/cart-line-item';
import { CartTotals } from '@/components/commerce/cart-totals';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { parseLocale, textDirection, type Locale } from '@/i18n/config';
import { Link } from '@/i18n/navigation';
import type { CartLineDetail } from '@/lib/commerce/cart';

type CartTotalsView = {
  subtotal: string;
  discount: string | null;
  shipping: string;
  vat: string;
  total: string;
};

/**
 * Header's cart trigger + drawer. `lines` and `totals` are server-computed
 * props from `Header` — the same `getCartWithTotals` read the `/cart` page
 * uses — so the drawer only ever owns open/close state, never re-derives a
 * price or a total, and can't drift from what `/cart` shows for the same cart.
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

  const itemCount = lines.reduce((sum, line) => sum + line.qty, 0);
  // Opens from the side the cart icon sits on — the end of the header, which
  // is right in English and left in Arabic. Mirrors MobileNav's start-side
  // hamburger, which opens from the opposite edge for the same reason.
  const side = textDirection(parseLocale(locale).language) === 'rtl' ? 'left' : 'right';

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="relative" aria-label={t('title')}>
          <ShoppingBag className="size-5" />
          {itemCount > 0 && (
            <span className="bg-primary text-primary-foreground absolute -top-1 -end-1 flex size-4 items-center justify-center rounded-full text-[10px]">
              {itemCount}
            </span>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent side={side} className="flex w-full flex-col sm:max-w-md">
        <SheetHeader>
          <SheetTitle>{t('title')}</SheetTitle>
        </SheetHeader>

        {lines.length === 0 || !totals ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 px-4 text-center">
            <p className="text-muted-foreground">{t('empty')}</p>
          </div>
        ) : (
          <>
            <div className="flex-1 divide-y overflow-y-auto px-4">
              {lines.map((line) => (
                <CartLineItem key={line.variantId} line={line} />
              ))}
            </div>
            <SheetFooter className="border-t">
              <CartTotals {...totals} />
              <Button asChild size="lg" className="mt-2 w-full">
                <Link href="/cart">{t('viewCart')}</Link>
              </Button>
            </SheetFooter>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
