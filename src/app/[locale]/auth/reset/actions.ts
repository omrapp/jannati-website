'use server';

import { getTranslations } from 'next-intl/server';
import { z } from 'zod';

import type { Locale } from '@/i18n/config';
import type { AuthActionState } from '@/lib/auth/action-state';
import { env } from '@/lib/env';
import { authErrorKey } from '@/lib/supabase/auth-errors';
import { createClient } from '@/lib/supabase/server';

const schema = z.object({ email: z.email() });

export async function requestReset(
  locale: Locale,
  _prevState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const t = await getTranslations({ locale, namespace: 'auth' });

  const parsed = schema.safeParse({ email: formData.get('email') });
  if (!parsed.success) {
    return { status: 'error', message: t('errors.generic') };
  }

  const supabase = await createClient();
  const redirectTo = `${env.siteUrl}/${locale}/auth/callback?next=/${locale}/auth/reset/confirm`;
  const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email, { redirectTo });

  // Supabase deliberately reports success even for an unknown email, to
  // avoid leaking which addresses have an account; a real send failure
  // (e.g. rate limit) still surfaces below.
  if (error) {
    return { status: 'error', message: t(`errors.${authErrorKey(error.code)}`) };
  }

  return { status: 'success', message: t('reset.emailSent', { email: parsed.data.email }) };
}
