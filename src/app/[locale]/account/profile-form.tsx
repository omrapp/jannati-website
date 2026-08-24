'use client';

import { useActionState, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Pencil } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { Locale } from '@/i18n/config';

import { updateProfileAction, type ProfileActionState } from './actions';

type ProfileFormAction = (
  state: ProfileActionState,
  formData: FormData,
) => Promise<ProfileActionState>;

// A plain object can't be exported from a `'use server'` file (only async
// functions can), so this lives here instead of alongside `ProfileActionState`.
const idleProfileState: ProfileActionState = { status: 'idle' };

/**
 * View/edit toggle in one component, same shape as `AddressForm` but with
 * no delete/list around it — there's exactly one profile. `email` is never
 * editable here: it's the Supabase Auth identity, not a `customers` column,
 * changing it is a separate "change email" flow this task doesn't ask for.
 */
export function ProfileForm({
  locale,
  email,
  fullName,
  phone,
}: {
  locale: Locale;
  email: string;
  fullName: string | null;
  phone: string | null;
}) {
  const t = useTranslations('auth.account.profile');
  const [editing, setEditing] = useState(false);
  const [saved, setSaved] = useState(false);

  const action = updateProfileAction.bind(null, locale) as ProfileFormAction;
  const [state, formAction, pending] = useActionState(
    async (prevState: ProfileActionState, formData: FormData) => {
      const next = await action(prevState, formData);
      if (next.status === 'idle') {
        setEditing(false);
        setSaved(true);
      }
      return next;
    },
    idleProfileState,
  );

  if (!editing) {
    return (
      <div className="flex flex-col gap-4">
        <dl className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-0.5">
            <dt className="text-muted-foreground text-xs uppercase">{t('fullName')}</dt>
            <dd className="font-medium">{fullName || '—'}</dd>
          </div>
          <div className="flex flex-col gap-0.5">
            <dt className="text-muted-foreground text-xs uppercase">{t('email')}</dt>
            <dd className="font-medium break-all">{email}</dd>
          </div>
          <div className="flex flex-col gap-0.5">
            <dt className="text-muted-foreground text-xs uppercase">{t('phone')}</dt>
            <dd className="font-mono font-medium">{phone || '—'}</dd>
          </div>
        </dl>

        {saved && (
          <p className="border-primary/30 bg-primary/5 text-primary rounded-md border px-3 py-2 text-xs">
            {t('saved')}
          </p>
        )}

        <Button
          type="button"
          variant="outline"
          size="sm"
          className="self-start"
          onClick={() => {
            setEditing(true);
            setSaved(false);
          }}
        >
          <Pencil />
          {t('edit')}
        </Button>
      </div>
    );
  }

  return (
    <form action={formAction} className="grid gap-4 sm:grid-cols-2">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="fullName">{t('fullName')}</Label>
        <Input
          id="fullName"
          name="fullName"
          defaultValue={fullName ?? ''}
          placeholder={t('fullNamePlaceholder')}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="phone">{t('phone')}</Label>
        <Input
          id="phone"
          name="phone"
          type="tel"
          defaultValue={phone ?? ''}
          placeholder={t('phonePlaceholder')}
        />
      </div>
      <div className="flex flex-col gap-1.5 sm:col-span-2">
        <Label className="text-muted-foreground text-xs">{t('email')}</Label>
        <Input value={email} disabled />
        <span className="text-muted-foreground text-xs">{t('emailLocked')}</span>
      </div>

      {state.status === 'error' && (
        <p role="alert" className="text-destructive text-sm sm:col-span-2">
          {state.message}
        </p>
      )}

      <div className="flex items-center gap-2 sm:col-span-2">
        <Button type="submit" disabled={pending}>
          {pending ? t('saving') : t('save')}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => setEditing(false)}
          disabled={pending}
        >
          {t('cancel')}
        </Button>
      </div>
    </form>
  );
}
