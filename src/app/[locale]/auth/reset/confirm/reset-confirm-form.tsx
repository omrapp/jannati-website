'use client';

import { useActionState } from 'react';
import { useTranslations } from 'next-intl';

import type { Locale } from '@/i18n/config';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { idleAuthState } from '@/lib/auth/action-state';
import { confirmReset } from './actions';

export function ResetConfirmForm({ locale }: { locale: Locale }) {
  const t = useTranslations('auth.reset');
  const [state, formAction, pending] = useActionState(
    confirmReset.bind(null, locale),
    idleAuthState,
  );

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="password">{t('newPasswordLabel')}</Label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          minLength={8}
          required
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="confirmPassword">{t('confirmPasswordLabel')}</Label>
        <Input
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          autoComplete="new-password"
          minLength={8}
          required
        />
      </div>

      {state.status === 'error' && (
        <p role="alert" className="text-destructive text-sm">
          {state.message}
        </p>
      )}

      <Button type="submit" disabled={pending}>
        {t('confirmSubmit')}
      </Button>
    </form>
  );
}
