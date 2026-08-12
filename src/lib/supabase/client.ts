import { createBrowserClient } from '@supabase/ssr';

import { env } from '@/lib/env';
import type { Database } from './types';

/** Browser-side Supabase client. Subject to RLS as the signed-in user (or anon). */
export function createClient() {
  return createBrowserClient<Database>(env.supabaseUrl, env.supabaseAnonKey);
}
