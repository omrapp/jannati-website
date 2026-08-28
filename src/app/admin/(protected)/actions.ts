'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';

import type { Language } from '@/i18n/config';
import { ADMIN_LOCALE_COOKIE, ADMIN_LOCALE_COOKIE_MAX_AGE } from '@/lib/admin/locale';
import { createClient } from '@/lib/supabase/server';

export async function logout(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect('/admin/login');
}

/**
 * Behind `admin-locale-toggle.tsx`. No `checkAdminAccess()` guard — this is a
 * UI preference, not a privileged write, same posture as `admin-theme-toggle.tsx`'s
 * theme choice needing no such check.
 *
 * Lives here rather than in `src/lib/admin/locale.ts` (which also exports the
 * plain server-side reader `getAdminLocale`) because a file imported by a
 * Client Component can't mix a function-level `'use server'` export with
 * plain server-only exports — Next.js requires actions to live in a file
 * that's entirely `'use server'`.
 */
export async function setAdminLocale(locale: Language): Promise<void> {
  const store = await cookies();
  store.set(ADMIN_LOCALE_COOKIE, locale, {
    maxAge: ADMIN_LOCALE_COOKIE_MAX_AGE,
    path: '/admin',
    sameSite: 'lax',
  });

  // `admin/layout.tsx` reads the cookie during render; a Server Action's
  // implicit refresh only covers the current route's segments, not the root
  // layout above it, so this revalidation is what actually flips `dir`/`lang`
  // and the message catalogue without a full page reload.
  revalidatePath('/admin', 'layout');
}
