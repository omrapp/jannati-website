import { Heart, Search, ShoppingBag, User } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { CountrySwitcher } from '@/components/layout/country-switcher';
import { LocaleSwitcher } from '@/components/layout/locale-switcher';
import { Logo } from '@/components/layout/logo';
import { MobileNav } from '@/components/layout/mobile-nav';
import { primaryNav } from '@/components/layout/nav-links';
import { ThemeToggle } from '@/components/layout/theme-toggle';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Link } from '@/i18n/navigation';

export function Header() {
  const t = useTranslations();

  return (
    <header className="bg-background/95 supports-[backdrop-filter]:bg-background/80 sticky top-0 z-50 border-b backdrop-blur">
      <div className="bg-primary text-primary-foreground hidden py-1.5 text-center text-xs md:block">
        {t('brand.tagline')}
      </div>

      <div className="mx-auto flex h-16 max-w-7xl items-center gap-3 px-4">
        <MobileNav />
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
            <CountrySwitcher />
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
          <Button variant="ghost" size="icon" asChild aria-label={t('common.cart')}>
            <Link href="/cart">
              <ShoppingBag className="size-5" />
            </Link>
          </Button>
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
