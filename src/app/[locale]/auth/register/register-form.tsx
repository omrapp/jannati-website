'use client';

import { useActionState } from 'react';
import { useTranslations } from 'next-intl';

import { Link } from '@/i18n/navigation';
import type { Locale } from '@/i18n/config';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { idleAuthState } from '@/lib/auth/action-state';
import { register } from './actions';

export function RegisterForm({ locale, next }: { locale: Locale; next: string }) {
  const t = useTranslations('auth.register');
  const [state, formAction, pending] = useActionState(
    register.bind(null, locale, next),
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

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="password">{t('passwordLabel')}</Label>
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
        {t('submit')}
      </Button>

      <p className="text-muted-foreground text-center text-sm">
        {t('haveAccount')}{' '}
        <Link href="/auth/login" className="text-foreground underline underline-offset-4">
          {t('loginLink')}
        </Link>
      </p>
    </form>
  );
}
