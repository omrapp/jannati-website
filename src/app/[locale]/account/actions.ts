'use server';

import { redirect } from '@/i18n/navigation';
import type { Locale } from '@/i18n/config';
import { createClient } from '@/lib/supabase/server';

export async function logout(locale: Locale): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect({ href: '/', locale });
}
