'use server';

import { getTranslations } from 'next-intl/server';
import { z } from 'zod';

import { redirect } from '@/i18n/navigation';
import type { Locale } from '@/i18n/config';
import type { AuthActionState } from '@/lib/auth/action-state';
import { authErrorKey } from '@/lib/supabase/auth-errors';
import { createClient } from '@/lib/supabase/server';

const schema = z
  .object({ password: z.string().min(8), confirmPassword: z.string() })
  .refine((value) => value.password === value.confirmPassword, {
    path: ['confirmPassword'],
  });

export async function confirmReset(
  locale: Locale,
  _prevState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const t = await getTranslations({ locale, namespace: 'auth' });

  const parsed = schema.safeParse({
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
  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) {
    return { status: 'error', message: t(`errors.${authErrorKey(error.code)}`) };
  }

  // Password changed — the recovery session has done its job. Sign out so
  // the shopper logs back in fresh with the new password, same as any
  // other password change.
  await supabase.auth.signOut();

  return redirect({ href: '/auth/login?reset=success', locale });
}
