'use client';

import { Menu } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useState } from 'react';

import { CountrySwitcher } from '@/components/layout/country-switcher';
import { LocaleSwitcher } from '@/components/layout/locale-switcher';
import { primaryNav } from '@/components/layout/nav-links';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { parseLocale, textDirection, type CountryCode, type Locale } from '@/i18n/config';
import { Link } from '@/i18n/navigation';

export function MobileNav({ enabledCountries }: { enabledCountries: readonly CountryCode[] }) {
  const t = useTranslations();
  const locale = useLocale() as Locale;
  const [open, setOpen] = useState(false);

  // The drawer opens from the side the page starts on: right in Arabic, left in English.
  const side = textDirection(parseLocale(locale).language) === 'rtl' ? 'right' : 'left';

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="md:hidden" aria-label={t('nav.openMenu')}>
          <Menu className="size-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side={side} className="w-72">
        <SheetHeader>
          <SheetTitle>{t('brand.name')}</SheetTitle>
        </SheetHeader>
        <nav className="px-4">
          <ul className="flex flex-col gap-1">
            {primaryNav.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className="hover:bg-muted block rounded-md px-3 py-2.5 text-sm transition-colors"
                >
                  {t(item.labelKey)}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <div className="mt-auto flex flex-col gap-2 border-t p-4">
          <CountrySwitcher enabled={enabledCountries} />
          <LocaleSwitcher />
        </div>
      </SheetContent>
    </Sheet>
  );
}
