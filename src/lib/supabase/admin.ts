import { createClient as createSupabaseClient } from '@supabase/supabase-js';

import { env } from '@/lib/env';
import type { Database } from './types';

/**
 * Service-role client. Bypasses RLS entirely — only for trusted server-side
 * work such as payment webhooks and the seed pipeline. Never import this into
 * a Client Component.
 */
export function createAdminClient() {
  if (!env.supabaseServiceRoleKey) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is required for admin operations');
  }

  return createSupabaseClient<Database>(env.supabaseUrl, env.supabaseServiceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
