'use client';

import { useActionState } from 'react';
import { useTranslations } from 'next-intl';

import { Link } from '@/i18n/navigation';
import type { Locale } from '@/i18n/config';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { idleAuthState } from '@/lib/auth/action-state';
import { requestReset } from './actions';

export function ResetRequestForm({ locale }: { locale: Locale }) {
  const t = useTranslations('auth.reset');
  const [state, formAction, pending] = useActionState(
    requestReset.bind(null, locale),
    idleAuthState,
  );

  if (state.status === 'success') {
    return (
      <p role="status" className="text-muted-foreground text-center text-sm">
        {state.message}
      </p>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="email">{t('emailLabel')}</Label>
        <Input id="email" name="email" type="email" autoComplete="email" required />
      </div>

      {state.status === 'error' && (
        <p role="alert" className="text-destructive text-sm">
          {state.message}
        </p>
      )}

      <Button type="submit" disabled={pending}>
        {t('submit')}
      </Button>

      <p className="text-muted-foreground text-center text-sm">
        <Link href="/auth/login" className="text-foreground underline underline-offset-4">
          {t('backToLogin')}
        </Link>
      </p>
    </form>
  );
}
