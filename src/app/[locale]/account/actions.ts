'use server';

import { revalidatePath } from 'next/cache';
import { getTranslations } from 'next-intl/server';
import { z } from 'zod';

import { redirect } from '@/i18n/navigation';
import type { Locale } from '@/i18n/config';
import { updateCustomerProfile } from '@/lib/commerce/customers';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient, getAuthUser } from '@/lib/supabase/server';

export async function logout(locale: Locale): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect({ href: '/', locale });
}

/** Mirrors `AddressActionState` (`account/addresses/actions.ts`) — same shape, unrelated feature. */
export type ProfileActionState = { status: 'idle' | 'error'; message?: string };

const profileSchema = z.object({
  fullName: z.string().trim().optional(),
  phone: z.string().trim().optional(),
});

export async function updateProfileAction(
  locale: Locale,
  _prevState: ProfileActionState,
  formData: FormData,
): Promise<ProfileActionState> {
  const t = await getTranslations({ locale, namespace: 'auth.account.profile' });

  const user = await getAuthUser();
  if (!user) return { status: 'error', message: t('error') };

  const parsed = profileSchema.safeParse({
    fullName: formData.get('fullName'),
    phone: formData.get('phone'),
  });
  if (!parsed.success) return { status: 'error', message: t('error') };

  const client = await createClient();
  await updateCustomerProfile(client, user.id, {
    fullName: parsed.data.fullName || null,
    phone: parsed.data.phone || null,
  });

  revalidatePath('/account');
  return { status: 'idle' };
}

/**
 * Deletes the signed-in customer's own account. `auth.admin.deleteUser`
 * needs the service-role client — there's no self-serve "delete my auth
 * user" RPC a cookie-bound client can call — but *which* user it deletes is
 * never client-supplied: it's always `getAuthUser()`'s own id, so this can
 * only ever delete the caller's own account, never anyone else's.
 *
 * No manual cleanup of `customers`/`addresses`/`carts`/`wishlist_items`/
 * `reviews` afterwards — every one of those tables' `customer_id` FK is
 * `on delete cascade` back to `auth.users` (`20260813000002_commerce.sql`),
 * so deleting the auth user removes all of it in one step. `orders.customer_id`
 * is `on delete set null` instead, on purpose: past orders stay on the books
 * for accounting/fulfilment even after the account that placed them is gone.
 */
export type DeleteAccountState = { status: 'idle' | 'error'; message?: string };

/**
 * Called directly from a client `onClick`, not through `useActionState` /
 * `<form action>` — there's no form data to collect (the confirm-phrase gate
 * is client-only UX, same posture the reference implementation used: the
 * session cookie is the real authorization boundary, the typed phrase is
 * just a "make sure you meant to click that" speed bump).
 */
export async function deleteAccountAction(locale: Locale): Promise<DeleteAccountState> {
  const t = await getTranslations({ locale, namespace: 'auth.account.danger' });

  const user = await getAuthUser();
  if (!user) return { status: 'error', message: t('error') };

  const admin = createAdminClient();
  const { error } = await admin.auth.admin.deleteUser(user.id);
  if (error) return { status: 'error', message: t('error') };

  const supabase = await createClient();
  await supabase.auth.signOut();

  return redirect({ href: '/', locale });
}
