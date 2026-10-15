'use server';

import { revalidatePath } from 'next/cache';
import { getTranslations } from 'next-intl/server';
import { z } from 'zod';

import type { Locale } from '@/i18n/config';
import { countries } from '@/i18n/config';
import {
  createAddress,
  deleteAddress,
  setDefaultAddress,
  updateAddress,
} from '@/lib/commerce/addresses';
import { getAuthUser, createClient } from '@/lib/supabase/server';

/**
 * Shared shape for the address form's `useActionState` — mirrors
 * `AuthActionState` (`src/lib/auth/action-state.ts`) but lives here instead
 * of being reused from there: it's a coincidence the two shapes match, not a
 * dependency worth taking on the auth module for an unrelated feature.
 * `message` is already translated, same rule as `AuthActionState`.
 */
export type AddressActionState = { status: 'idle' | 'error'; message?: string };

const addressSchema = z.object({
  fullName: z.string().trim().min(1),
  phone: z.string().trim().min(1),
  countryCode: z.enum(countries),
  city: z.string().trim().min(1),
  area: z.string().trim().optional(),
  line1: z.string().trim().min(1),
});

function parseAddressForm(formData: FormData) {
  return addressSchema.safeParse({
    fullName: formData.get('fullName'),
    phone: formData.get('phone'),
    countryCode: formData.get('countryCode'),
    city: formData.get('city'),
    area: formData.get('area') || undefined,
    line1: formData.get('line1'),
  });
}

export async function createAddressAction(
  locale: Locale,
  _prevState: AddressActionState,
  formData: FormData,
): Promise<AddressActionState> {
  const t = await getTranslations({ locale, namespace: 'addresses' });

  const user = await getAuthUser();
  if (!user) return { status: 'error', message: t('errorGeneric') };

  const parsed = parseAddressForm(formData);
  if (!parsed.success) return { status: 'error', message: t('errorGeneric') };

  const client = await createClient();
  await createAddress(client, user.id, {
    fullName: parsed.data.fullName,
    phone: parsed.data.phone,
    countryCode: parsed.data.countryCode,
    city: parsed.data.city,
    area: parsed.data.area ?? null,
    line1: parsed.data.line1,
  });

  revalidatePath('/account/addresses');
  return { status: 'idle' };
}

export async function updateAddressAction(
  locale: Locale,
  addressId: string,
  _prevState: AddressActionState,
  formData: FormData,
): Promise<AddressActionState> {
  const t = await getTranslations({ locale, namespace: 'addresses' });

  const user = await getAuthUser();
  if (!user) return { status: 'error', message: t('errorGeneric') };

  const parsed = parseAddressForm(formData);
  if (!parsed.success) return { status: 'error', message: t('errorGeneric') };

  const client = await createClient();
  await updateAddress(client, user.id, addressId, {
    fullName: parsed.data.fullName,
    phone: parsed.data.phone,
    countryCode: parsed.data.countryCode,
    city: parsed.data.city,
    area: parsed.data.area ?? null,
    line1: parsed.data.line1,
  });

  revalidatePath('/account/addresses');
  return { status: 'idle' };
}

export async function deleteAddressAction(formData: FormData): Promise<void> {
  const user = await getAuthUser();
  if (!user) return;

  const addressId = formData.get('addressId');
  if (typeof addressId !== 'string' || !addressId) return;

  const client = await createClient();
  await deleteAddress(client, user.id, addressId);

  revalidatePath('/account/addresses');
}

export async function setDefaultAddressAction(formData: FormData): Promise<void> {
  const user = await getAuthUser();
  if (!user) return;

  const addressId = formData.get('addressId');
  if (typeof addressId !== 'string' || !addressId) return;

  const client = await createClient();
  await setDefaultAddress(client, user.id, addressId);

  revalidatePath('/account/addresses');
}
