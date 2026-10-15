'use client';

import { useActionState } from 'react';
import { useTranslations } from 'next-intl';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { countries } from '@/i18n/config';
import { cn } from '@/lib/utils';

import type { AddressActionState } from '@/app/[locale]/account/addresses/actions';
import type { Address } from '@/lib/commerce/addresses';

const idleAddressState: AddressActionState = { status: 'idle' };

type AddressFormAction = (
  state: AddressActionState,
  formData: FormData,
) => Promise<AddressActionState>;

/**
 * Shared create/edit form. `address` supplies default values for editing —
 * omitted, every field starts blank for a new address. The country field is
 * a native `<select>` restricted to `countries` (the 6 enabled codes from
 * `src/i18n/config.ts`), the same list `CountrySwitcher` offers, so a
 * shopper can never submit a country the storefront doesn't serve.
 */
export function AddressForm({
  action,
  address,
  onSaved,
  onCancel,
  className,
}: {
  action: AddressFormAction;
  address?: Address;
  onSaved?: () => void;
  onCancel?: () => void;
  className?: string;
}) {
  const t = useTranslations('addresses');
  const tCountry = useTranslations('country');
  const [state, formAction, pending] = useActionState(async (
    prevState: AddressActionState,
    formData: FormData,
  ) => {
    const next = await action(prevState, formData);
    if (next.status === 'idle') onSaved?.();
    return next;
  }, idleAddressState);

  return (
    <form action={formAction} className={cn('flex flex-col gap-3', className)}>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="fullName">{t('fullNameLabel')}</Label>
        <Input id="fullName" name="fullName" defaultValue={address?.full_name} required />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="phone">{t('phoneLabel')}</Label>
        <Input id="phone" name="phone" type="tel" defaultValue={address?.phone} required />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="countryCode">{t('countryLabel')}</Label>
        <select
          id="countryCode"
          name="countryCode"
          defaultValue={address?.country_code ?? countries[0]}
          required
          className="border-input bg-background h-9 rounded-md border px-3 text-sm shadow-xs"
        >
          {countries.map((code) => (
            <option key={code} value={code}>
              {tCountry(code)}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="city">{t('cityLabel')}</Label>
        <Input id="city" name="city" defaultValue={address?.city} required />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="area">{t('areaLabel')}</Label>
        <Input id="area" name="area" defaultValue={address?.area ?? ''} />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="line1">{t('line1Label')}</Label>
        <Input id="line1" name="line1" defaultValue={address?.line1} required />
      </div>

      {state.status === 'error' && (
        <p role="alert" className="text-destructive text-sm">
          {state.message}
        </p>
      )}

      <div className="flex gap-2">
        <Button type="submit" disabled={pending}>
          {pending ? t('saving') : t('save')}
        </Button>
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel} disabled={pending}>
            {t('cancel')}
          </Button>
        )}
      </div>
    </form>
  );
}
