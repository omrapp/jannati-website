'use client';

import { useActionState } from 'react';
import { useTranslations } from 'next-intl';

import { Link } from '@/i18n/navigation';
import type { Locale } from '@/i18n/config';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { idleAuthState } from '@/lib/auth/action-state';
import { login } from './actions';

export function LoginForm({ locale, next }: { locale: Locale; next: string }) {
  const t = useTranslations('auth.login');
  const [state, formAction, pending] = useActionState(
    login.bind(null, locale, next),
    idleAuthState,
  );

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
          autoComplete="current-password"
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

      <div className="text-muted-foreground flex flex-col gap-1 text-sm">
        <Link href="/auth/reset" className="hover:text-foreground">
          {t('forgotPassword')}
        </Link>
        <p>
          {t('noAccount')}{' '}
          <Link href="/auth/register" className="text-foreground underline underline-offset-4">
            {t('registerLink')}
          </Link>
        </p>
      </div>
    </form>
  );
}
