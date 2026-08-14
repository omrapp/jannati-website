'use server';

import { getTranslations } from 'next-intl/server';
import { z } from 'zod';

import { redirect } from '@/i18n/navigation';
import type { Locale } from '@/i18n/config';
import type { AuthActionState } from '@/lib/auth/action-state';
import { safeRedirectPath } from '@/lib/auth/safe-redirect';
import { mergeGuestCartIntoCustomer } from '@/lib/commerce/cart';
import { clearGuestSessionCookie, getGuestSessionToken } from '@/lib/commerce/session';
import { createAdminClient } from '@/lib/supabase/admin';
import { authErrorKey } from '@/lib/supabase/auth-errors';
import { createClient } from '@/lib/supabase/server';

const schema = z.object({
  email: z.email(),
  password: z.string().min(1),
});

export async function login(
  locale: Locale,
  next: string,
  _prevState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const t = await getTranslations({ locale, namespace: 'auth.errors' });

  const parsed = schema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
  });
  if (!parsed.success) {
    return { status: 'error', message: t('generic') };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) {
    return { status: 'error', message: t(authErrorKey(error.code)) };
  }

  // Fold the guest cart (if any) into the account the shopper just proved
  // ownership of. Guest carts have no RLS policy, so this needs the
  // service-role client — see the file header in `src/lib/commerce/cart.ts`.
  // `signInWithPassword` has already set the auth session by this point, so
  // a merge failure must never block the redirect — the shopper is logged
  // in either way. Leave the guest cookie in place on failure so the merge
  // has something to retry against on their next login, instead of quietly
  // orphaning the guest cart.
  const guestToken = await getGuestSessionToken();
  if (guestToken) {
    try {
      await mergeGuestCartIntoCustomer(createAdminClient(), data.user.id, guestToken);
      await clearGuestSessionCookie();
    } catch (mergeError) {
      console.error('guest cart merge failed on login', mergeError);
    }
  }

  return redirect({ href: safeRedirectPath(next), locale });
}
