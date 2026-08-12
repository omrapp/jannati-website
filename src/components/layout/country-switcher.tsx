'use client';

import { Check, Globe } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useParams } from 'next/navigation';
import { useTransition } from 'react';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { buildLocale, countries, parseLocale, type CountryCode, type Locale } from '@/i18n/config';
import { usePathname, useRouter } from '@/i18n/navigation';

/**
 * Changes the country half of the locale. Country determines currency, VAT and
 * shipping, so this is a commerce control, not just a display preference.
 */
export function CountrySwitcher() {
  const t = useTranslations('country');
  const tLocale = useTranslations('locale');
  const locale = useLocale() as Locale;
  const { language, country } = parseLocale(locale);
  const router = useRouter();
  const pathname = usePathname();
  const params = useParams();
  const [, startTransition] = useTransition();

  function switchCountry(next: CountryCode) {
    startTransition(() => {
      router.replace(
        // @ts-expect-error -- pathname/params are correlated at runtime
        { pathname, params },
        { locale: buildLocale(language, next) },
      );
    });
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-2" aria-label={tLocale('country')}>
          <Globe className="size-4" />
          <span className="hidden sm:inline">{t(country)}</span>
          <span className="uppercase sm:hidden">{country}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {countries.map((code) => (
          <DropdownMenuItem key={code} onClick={() => switchCountry(code)}>
            <Check className={code === country ? 'size-4 opacity-100' : 'size-4 opacity-0'} />
            {t(code)}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
