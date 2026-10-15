'use server';

import { z } from 'zod';

import { checkAdminAccess } from '@/lib/admin/auth';
import { updateSiteSettings, type SiteSettingsInput } from '@/lib/admin/site-settings';
import { createClient } from '@/lib/supabase/server';

function emptyToNull(value: FormDataEntryValue | null): string | null {
  const s = typeof value === 'string' ? value.trim() : '';
  return s.length > 0 ? s : null;
}

// Same "null skips the inner coercion" nullable shape as `coupons/actions.ts`'s
// `minOrderMinor` — `emptyToNull` upstream turns a blank field into `null`
// before this schema ever sees it.
const settingsSchema = z.object({
  phone: z.string().trim().nullable(),
  whatsapp: z.string().trim().nullable(),
  whatsappShow: z.boolean(),
  email: z.string().trim().email().nullable(),
  addressAr: z.string().trim().nullable(),
  addressEn: z.string().trim().nullable(),
  mapLat: z.coerce.number().finite().min(-90).max(90).nullable(),
  mapLng: z.coerce.number().finite().min(-180).max(180).nullable(),
  instagramUrl: z.string().trim().url().nullable(),
  facebookUrl: z.string().trim().url().nullable(),
  tiktokUrl: z.string().trim().url().nullable(),
  xUrl: z.string().trim().url().nullable(),
  youtubeUrl: z.string().trim().url().nullable(),
  legalEntityNameEn: z.string().trim().nullable(),
  legalEntityNameAr: z.string().trim().nullable(),
  registrationNumber: z.string().trim().nullable(),
});

export type SettingsFormState = { status: 'idle' | 'error' | 'success'; message?: string };

export async function saveSiteSettings(
  _prevState: SettingsFormState,
  formData: FormData,
): Promise<SettingsFormState> {
  const access = await checkAdminAccess();
  if (!access.isAdmin) return { status: 'error', message: 'Not authorized.' };

  const parsed = settingsSchema.safeParse({
    phone: emptyToNull(formData.get('phone')),
    whatsapp: emptyToNull(formData.get('whatsapp')),
    whatsappShow: formData.get('whatsappShow') === 'on',
    email: emptyToNull(formData.get('email')),
    addressAr: emptyToNull(formData.get('addressAr')),
    addressEn: emptyToNull(formData.get('addressEn')),
    mapLat: emptyToNull(formData.get('mapLat')),
    mapLng: emptyToNull(formData.get('mapLng')),
    instagramUrl: emptyToNull(formData.get('instagramUrl')),
    facebookUrl: emptyToNull(formData.get('facebookUrl')),
    tiktokUrl: emptyToNull(formData.get('tiktokUrl')),
    xUrl: emptyToNull(formData.get('xUrl')),
    youtubeUrl: emptyToNull(formData.get('youtubeUrl')),
    legalEntityNameEn: emptyToNull(formData.get('legalEntityNameEn')),
    legalEntityNameAr: emptyToNull(formData.get('legalEntityNameAr')),
    registrationNumber: emptyToNull(formData.get('registrationNumber')),
  });
  if (!parsed.success) {
    return { status: 'error', message: parsed.error.issues[0]?.message ?? 'Invalid input.' };
  }

  const input: SiteSettingsInput = parsed.data;

  try {
    const client = await createClient();
    await updateSiteSettings(client, input);
  } catch (err) {
    return { status: 'error', message: err instanceof Error ? err.message : 'Save failed.' };
  }

  // No `redirect()` — this is a singleton settings form, staying on the
  // same page after save (like `/admin/countries`' inline edits) reads
  // better than bouncing to a list that doesn't exist.
  return { status: 'success', message: 'Settings saved.' };
}
