'use server';

import { redirect } from 'next/navigation';
import { z } from 'zod';

import type { AuthActionState } from '@/lib/auth/action-state';
import { authErrorKey } from '@/lib/supabase/auth-errors';
import { createClient } from '@/lib/supabase/server';

const schema = z.object({
  email: z.email(),
  password: z.string().min(1),
});

// Plain English, not next-intl: staff-only surface, same call as the admin
// layout's lack of RTL/locale provider — see `admin/layout.tsx`.
const ERROR_MESSAGES: Record<string, string> = {
  invalidCredentials: 'Incorrect email or password.',
  rateLimited: 'Too many attempts. Try again in a moment.',
  generic: 'Something went wrong. Try again.',
};

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
    return { status: 'error', message: ERROR_MESSAGES.generic };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) {
    const key = authErrorKey(error.code);
    return { status: 'error', message: ERROR_MESSAGES[key] ?? ERROR_MESSAGES.generic };
  }

  redirect('/admin');
}
