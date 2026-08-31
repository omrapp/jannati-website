import { Heart, Mail, Phone, Search, User } from 'lucide-react';
import { getLocale, getTranslations } from 'next-intl/server';

import { CartDrawer } from '@/components/commerce/cart-drawer';
import { CountrySwitcher } from '@/components/layout/country-switcher';
import { LocaleSwitcher } from '@/components/layout/locale-switcher';
import { Logo } from '@/components/layout/logo';
import { LoginDrawer } from '@/components/layout/login-drawer';
import { MegaMenu } from '@/components/layout/mega-menu';
import { MobileNav } from '@/components/layout/mobile-nav';
import {
  buildCategoryTree,
  fixedUtilityNav,
  partitionTopLevelCategories,
} from '@/components/layout/nav-links';
import { SocialIcons } from '@/components/layout/social-icons';
import { ThemeToggle } from '@/components/layout/theme-toggle';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { Locale } from '@/i18n/config';
import { Link } from '@/i18n/navigation';
import { getSiteSettings } from '@/lib/admin/site-settings';
import { toCountryPricing } from '@/lib/catalog/mappers';
import { getCountry, getEnabledCountries, listCategories } from '@/lib/catalog/queries';
import { getCartWithTotals } from '@/lib/commerce/cart';
import { getCartContext } from '@/lib/commerce/cart-identity';
import { formatMoney } from '@/lib/commerce/money';
import { createClient, getAuthUser } from '@/lib/supabase/server';

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
  const user = await getAuthUser();
  const enabledCountries = await getEnabledCountries();
  const settings = await getSiteSettings(await createClient());
  const categoryTree = buildCategoryTree(await listCategories(locale));
  const { visible: visibleCategories, overflow: overflowCategories } = partitionTopLevelCategories(
    categoryTree,
    fixedUtilityNav.length,
  );

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
    <header className="bg-background/95 supports-[backdrop-filter]:bg-background/80 sticky top-0 z-50 shadow-sm backdrop-blur">
      <div className="bg-primary text-primary-foreground hidden items-center justify-between py-1.5 text-xs md:flex">
        <div className="max-w-page mx-auto flex w-full items-center justify-between px-4">
          <span>{t('brand.tagline')}</span>
          <div className="flex items-center gap-4">
            <Link href="/p/about-us" className="hover:underline">
              {t('nav.about')}
            </Link>
            <Link href="/contact" className="hover:underline">
              {t('nav.contact')}
            </Link>
            {settings.phone && (
              <a href={`tel:${settings.phone}`} className="flex items-center gap-1 hover:underline">
                <Phone className="size-3.5" /> {settings.phone}
              </a>
            )}
            {settings.email && (
              <a
                href={`mailto:${settings.email}`}
                className="flex items-center gap-1 hover:underline"
              >
                <Mail className="size-3.5" /> {settings.email}
              </a>
            )}
            <SocialIcons
              settings={settings}
              t={t}
              className="flex items-center gap-3"
              iconClassName="size-3.5 text-primary-foreground/90 hover:text-primary-foreground"
            />
          </div>
        </div>
      </div>

      <div className="max-w-page mx-auto flex h-16 items-center gap-3 px-4">
        {/* Full tree, unsplit — the desktop bar's 7-slot cap doesn't apply to a scrollable drawer. */}
        <MobileNav enabledCountries={enabledCountries} categories={categoryTree} />
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
          {user ? (
            <Button variant="ghost" size="icon" asChild aria-label={t('common.account')}>
              <Link href="/account">
                <User className="size-5" />
              </Link>
            </Button>
          ) : (
            <LoginDrawer locale={locale} />
          )}
          <CartDrawer lines={cart?.lines ?? []} totals={cartTotals} />
        </div>
      </div>

      <MegaMenu
        categories={visibleCategories}
        overflowCategories={overflowCategories}
        fixedLinks={fixedUtilityNav}
      />
    </header>
  );
}
