'use server';

import { createTranslator } from 'next-intl';
import { redirect } from 'next/navigation';
import { z } from 'zod';

import { getAdminLocale, getAdminMessages } from '@/lib/admin/locale';
import type { AuthActionState } from '@/lib/auth/action-state';
import { authErrorKey, type AuthErrorKey } from '@/lib/supabase/auth-errors';
import { createClient } from '@/lib/supabase/server';

const schema = z.object({
  email: z.email(),
  password: z.string().min(1),
});

const LOGIN_ERROR_KEYS = ['invalidCredentials', 'rateLimited', 'generic'] as const;
type LoginErrorKey = (typeof LOGIN_ERROR_KEYS)[number];

function isLoginErrorKey(key: AuthErrorKey): key is LoginErrorKey {
  return (LOGIN_ERROR_KEYS as readonly string[]).includes(key);
}

/**
 * `AuthActionState.message` must already be translated (see that type's file
 * header) — now that the admin layout carries an i18n provider
 * (`admin/layout.tsx`), this reads the same `jannati_admin_locale` cookie it
 * does and translates with next-intl's non-routing `createTranslator`, not
 * `getTranslations` (which needs `getRequestConfig`, storefront-only here).
 * `authErrorKey` can also return `emailTaken`/`weakPassword`/`samePassword`
 * — none apply to sign-in, so those fall back to `generic`, same as the old
 * `Record` lookup's `?? ERROR_MESSAGES.generic` did.
 */
async function translateLoginError(key: AuthErrorKey): Promise<string> {
  const locale = await getAdminLocale();
  const messages = await getAdminMessages(locale);
  const t = createTranslator({ locale, messages, namespace: 'login.errors' });
  return t(isLoginErrorKey(key) ? key : 'generic');
}

/**
 * Authenticates any valid Supabase user — it does not itself check
 * `admin_users`. Whether the account is actually staff is enforced by
 * `admin/(protected)/layout.tsx` on the next request, same "auth is not
 * authorization" split as the rest of the app.
 */
export async function login(
  _prevState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const parsed = schema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
  });
  if (!parsed.success) {
    return { status: 'error', message: await translateLoginError('generic') };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) {
    return { status: 'error', message: await translateLoginError(authErrorKey(error.code)) };
  }

  redirect('/admin');
}
