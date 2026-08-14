'use server';

import { getTranslations } from 'next-intl/server';
import { z } from 'zod';

import { redirect } from '@/i18n/navigation';
import type { Locale } from '@/i18n/config';
import type { AuthActionState } from '@/lib/auth/action-state';
import { safeRedirectPath } from '@/lib/auth/safe-redirect';
import { authErrorKey } from '@/lib/supabase/auth-errors';
import { createClient } from '@/lib/supabase/server';

const schema = z
  .object({
    email: z.email(),
    password: z.string().min(8),
    confirmPassword: z.string(),
  })
  .refine((value) => value.password === value.confirmPassword, {
    path: ['confirmPassword'],
  });

export async function register(
  locale: Locale,
  next: string,
  _prevState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const t = await getTranslations({ locale, namespace: 'auth' });

  const parsed = schema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
    confirmPassword: formData.get('confirmPassword'),
  });
  if (!parsed.success) {
    const mismatch = parsed.error.issues.some((issue) => issue.path[0] === 'confirmPassword');
    return {
      status: 'error',
      message: t(mismatch ? 'errors.passwordMismatch' : 'errors.generic'),
    };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
  });
  if (error) {
    return { status: 'error', message: t(`errors.${authErrorKey(error.code)}`) };
  }

  // A project with email confirmation switched on returns a user but no
  // session — there's nothing to sign in to yet, so send the shopper to
  // check their inbox instead of silently doing nothing.
  if (!data.session) {
    return {
      status: 'success',
      message: t('register.checkEmail', { email: parsed.data.email }),
    };
  }

  return redirect({ href: safeRedirectPath(next), locale });
}
