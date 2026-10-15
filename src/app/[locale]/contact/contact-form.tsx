'use client';

import { useActionState } from 'react';
import { useTranslations } from 'next-intl';

import { submitContact, type ContactFormState } from '@/app/[locale]/contact/actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

const idleContactFormState: ContactFormState = { status: 'idle' };

// Loose free-text values, not a DB enum (see the `service` migration) — the
// option list can grow without a schema change, this map is the only place
// it needs to stay in sync (value -> its i18n label key).
const SERVICE_OPTIONS = {
  general: 'serviceGeneral',
  order: 'serviceOrder',
  product: 'serviceProduct',
  wholesale: 'serviceWholesale',
  feedback: 'serviceFeedback',
  other: 'serviceOther',
} as const;

export function ContactForm() {
  const t = useTranslations('contact');
  const [state, formAction, pending] = useActionState(submitContact, idleContactFormState);

  if (state.status === 'success') {
    return (
      <p role="status" className="text-sm">
        {t('success')}
      </p>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-4">
      {/* Honeypot: hidden from sighted and screen-reader users alike (not
          just visually hidden), so a real visitor never touches it while a
          bot filling every field still does. Left un-required, un-labelled. */}
      <div className="hidden" aria-hidden="true">
        <label htmlFor="website">Website</label>
        <input id="website" name="website" type="text" tabIndex={-1} autoComplete="off" />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="name">{t('nameLabel')}</Label>
        <Input id="name" name="name" autoComplete="name" required />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="email">{t('emailFieldLabel')}</Label>
        <Input id="email" name="email" type="email" autoComplete="email" required />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="phone">{t('phoneFieldLabel')}</Label>
        <Input id="phone" name="phone" type="tel" autoComplete="tel" />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="service">{t('serviceLabel')}</Label>
        <select
          id="service"
          name="service"
          defaultValue=""
          className="border-input bg-background h-9 rounded-md border px-3 text-sm shadow-xs"
        >
          <option value="">{t('servicePlaceholder')}</option>
          {Object.entries(SERVICE_OPTIONS).map(([value, labelKey]) => (
            <option key={value} value={value}>
              {t(labelKey)}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="message">{t('messageLabel')}</Label>
        <Textarea id="message" name="message" rows={5} required />
      </div>

      {state.status === 'error' && (
        <p role="alert" className="text-destructive text-sm">
          {state.message ?? t('error')}
        </p>
      )}

      <Button type="submit" disabled={pending}>
        {pending ? t('sending') : t('submit')}
      </Button>
    </form>
  );
}
