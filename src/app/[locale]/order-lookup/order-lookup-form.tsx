'use client';

import { useActionState } from 'react';
import { useTranslations } from 'next-intl';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { Locale } from '@/i18n/config';

import { lookupOrder, type OrderLookupState } from './actions';

const idleOrderLookupState: OrderLookupState = { status: 'idle' };

export function OrderLookupForm({ locale }: { locale: Locale }) {
  const t = useTranslations('orderLookup');
  const [state, formAction, pending] = useActionState(
    lookupOrder.bind(null, locale),
    idleOrderLookupState,
  );

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="orderNumber">{t('orderNumberLabel')}</Label>
        <Input id="orderNumber" name="orderNumber" required />
      </div>

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
    </form>
  );
}
