'use server';

import { getTranslations } from 'next-intl/server';
import { z } from 'zod';

import { redirect } from '@/i18n/navigation';
import type { Locale } from '@/i18n/config';
import type { AuthActionState } from '@/lib/auth/action-state';
import { safeRedirectPath } from '@/lib/auth/safe-redirect';
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
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) {
    return { status: 'error', message: t(authErrorKey(error.code)) };
  }

  return redirect({ href: safeRedirectPath(next), locale });
}
