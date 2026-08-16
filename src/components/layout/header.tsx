import { Heart, Search, User } from 'lucide-react';
import { getLocale, getTranslations } from 'next-intl/server';

import { CartDrawer } from '@/components/commerce/cart-drawer';
import { CountrySwitcher } from '@/components/layout/country-switcher';
import { LocaleSwitcher } from '@/components/layout/locale-switcher';
import { Logo } from '@/components/layout/logo';
import { MobileNav } from '@/components/layout/mobile-nav';
import { primaryNav } from '@/components/layout/nav-links';
import { ThemeToggle } from '@/components/layout/theme-toggle';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { Locale } from '@/i18n/config';
import { Link } from '@/i18n/navigation';
import { toCountryPricing } from '@/lib/catalog/mappers';
import { getCountry, getEnabledCountries } from '@/lib/catalog/queries';
import { getCartWithTotals } from '@/lib/commerce/cart';
import { getCartContext } from '@/lib/commerce/cart-identity';
import { formatMoney } from '@/lib/commerce/money';

/**
 * Server Component so the cart drawer (`CartDrawer`) can render from the same
 * server-computed cart read every other cart surface uses — no client-side
 * fetch, no separate total math. `getCartWithTotals` returns `null` for a
 * shopper with no cart yet, which is the common case on most page loads, so
 * the country/VAT/shipping lookup only happens once there's something to price.
 */
export async function Header() {
  const locale = (await getLocale()) as Locale;
  const t = await getTranslations();

  const context = await getCartContext();
  const cart = context ? await getCartWithTotals(context.client, context.identity, locale) : null;
  const enabledCountries = await getEnabledCountries();

  let cartTotals: {
    subtotal: string;
    discount: string | null;
    shipping: string;
    vat: string;
    total: string;
  } | null = null;

  if (cart && cart.lines.length > 0) {
    const pricing = toCountryPricing(await getCountry(locale));
    cartTotals = {
      subtotal: formatMoney(cart.subtotalMinor, pricing, locale),
      discount: cart.discountMinor > 0 ? formatMoney(cart.discountMinor, pricing, locale) : null,
      shipping: formatMoney(cart.shippingMinor, pricing, locale),
      vat: formatMoney(cart.vatMinor, pricing, locale),
      total: formatMoney(cart.totalMinor, pricing, locale),
    };
  }

  return (
    <header className="bg-background/95 supports-[backdrop-filter]:bg-background/80 sticky top-0 z-50 border-b backdrop-blur">
      <div className="bg-primary text-primary-foreground hidden py-1.5 text-center text-xs md:block">
        {t('brand.tagline')}
      </div>

      <div className="mx-auto flex h-16 max-w-7xl items-center gap-3 px-4">
        <MobileNav enabledCountries={enabledCountries} />
        <Logo />

        <form action="/search" className="relative mx-auto hidden max-w-md flex-1 md:block">
          <Search className="text-muted-foreground pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2" />
          <Input
            type="search"
            name="q"
            placeholder={t('common.search')}
            aria-label={t('common.search')}
            className="ps-9"
          />
        </form>

        <div className="ms-auto flex items-center gap-1">
          <div className="hidden md:flex md:items-center md:gap-1">
            <CountrySwitcher enabled={enabledCountries} />
            <LocaleSwitcher />
          </div>
          <ThemeToggle />
          <Button variant="ghost" size="icon" asChild aria-label={t('common.wishlist')}>
            <Link href="/account/wishlist">
              <Heart className="size-5" />
            </Link>
          </Button>
          <Button variant="ghost" size="icon" asChild aria-label={t('common.account')}>
            <Link href="/account">
              <User className="size-5" />
            </Link>
          </Button>
          <CartDrawer lines={cart?.lines ?? []} totals={cartTotals} />
        </div>
      </div>

      <nav className="hidden border-t md:block" aria-label={t('nav.products')}>
        <ul className="mx-auto flex max-w-7xl items-center gap-6 px-4 py-2.5 text-sm">
          {primaryNav.map((item) => (
            <li key={item.href}>
              <Link href={item.href} className="hover:text-primary transition-colors">
                {t(item.labelKey)}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </header>
  );
}
