'use client';

import { Languages } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useTransition } from 'react';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { setAdminLocale } from './actions';

/**
 * Same shell placement/pattern as `admin-theme-toggle.tsx`, but flips
 * `jannati_admin_locale` via the `setAdminLocale` Server Action instead of
 * `next-themes`' client-side `setTheme` — same `startTransition` + `void`
 * call shape `notification-bell.tsx` uses for its own Server Action.
 */
export function AdminLocaleToggle() {
  const locale = useLocale();
  const t = useTranslations('locale');
  const [, startTransition] = useTransition();

  const switchTo = (next: 'en' | 'ar') => {
    if (next === locale) return;
    startTransition(() => {
      void setAdminLocale(next);
    });
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" aria-label={t('label')}>
          <Languages className="size-5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => switchTo('en')} aria-current={locale === 'en' ? 'true' : undefined}>
          {t('english')}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => switchTo('ar')} aria-current={locale === 'ar' ? 'true' : undefined}>
          {t('arabic')}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
