'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';

import { checkAdminAccess } from '@/lib/admin/auth';
import { updateCountrySettings, type CountrySettingsInput } from '@/lib/admin/countries';
import { createClient } from '@/lib/supabase/server';

// Mirrors the `countries` check constraints — see `updateCountrySettings`
// for why validation lives in the data layer, not just here: this schema
// only rules out non-numeric/malformed form input, the bounds check is
// shared with any other future caller.
const settingsSchema = z.object({
  fxRateFromOmr: z.coerce.number().finite(),
  roundingStepMinor: z.coerce.number().int(),
  vatRate: z.coerce.number().finite(),
  shippingFlatMinor: z.coerce.number().int(),
  freeShippingThresholdMinor: z.coerce.number().int().nullable(),
  enabled: z.boolean(),
});

export type CountrySettingsFormState = { status: 'idle' | 'error' | 'success'; message?: string };

function emptyToNull(value: FormDataEntryValue | null): string | null {
  const s = typeof value === 'string' ? value.trim() : '';
  return s.length > 0 ? s : null;
}

export async function saveCountrySettings(
  code: string,
  _prevState: CountrySettingsFormState,
  formData: FormData,
): Promise<CountrySettingsFormState> {
  const access = await checkAdminAccess();
  if (!access.isAdmin) return { status: 'error', message: 'Not authorized.' };

  const threshold = emptyToNull(formData.get('freeShippingThresholdMinor'));

  const parsed = settingsSchema.safeParse({
    fxRateFromOmr: formData.get('fxRateFromOmr'),
    roundingStepMinor: formData.get('roundingStepMinor'),
    vatRate: formData.get('vatRate'),
    shippingFlatMinor: formData.get('shippingFlatMinor'),
    freeShippingThresholdMinor: threshold,
    enabled: formData.get('enabled') === 'on',
  });
  if (!parsed.success) {
    return { status: 'error', message: parsed.error.issues[0]?.message ?? 'Invalid input.' };
  }

  const input: CountrySettingsInput = parsed.data;

  try {
    const client = await createClient();
    await updateCountrySettings(client, code, input);
  } catch (err) {
    return { status: 'error', message: err instanceof Error ? err.message : 'Save failed.' };
  }

  // Stays on this page (unlike brand/category saves, which redirect to a
  // list) — there's nowhere else to go, and staff editing FX/VAT for
  // several countries in a row shouldn't lose their place after each save.
  revalidatePath('/admin/countries');
  return { status: 'success', message: 'Saved.' };
}
