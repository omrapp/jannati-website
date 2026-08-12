'use client';

import { useLocale, useTranslations } from 'next-intl';
import { useParams } from 'next/navigation';
import { useTransition } from 'react';

import { Button } from '@/components/ui/button';
import { buildLocale, parseLocale, type Locale } from '@/i18n/config';
import { usePathname, useRouter } from '@/i18n/navigation';

/**
 * Flips the language half of the locale (`ar-ae` <-> `en-ae`) while keeping
 * the shopper in the same country and on the same page.
 */
export function LocaleSwitcher() {
  const t = useTranslations('locale');
  const locale = useLocale() as Locale;
  const { language, country } = parseLocale(locale);
  const router = useRouter();
  const pathname = usePathname();
  const params = useParams();
  const [isPending, startTransition] = useTransition();

  const nextLanguage = language === 'ar' ? 'en' : 'ar';

  function switchLanguage() {
    startTransition(() => {
      router.replace(
        // @ts-expect-error -- pathname/params are correlated at runtime
        { pathname, params },
        { locale: buildLocale(nextLanguage, country) },
      );
    });
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={switchLanguage}
      disabled={isPending}
      title={t('language')}
    >
      {nextLanguage === 'ar' ? t('arabic') : t('english')}
    </Button>
  );
}
