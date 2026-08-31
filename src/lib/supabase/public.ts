import { createClient as createSupabaseClient } from '@supabase/supabase-js';

import { env } from '@/lib/env';
import type { Database } from './types';

/**
 * Anonymous, cookie-free Supabase client for public catalog reads that get
 * wrapped in `unstable_cache` (see `lib/catalog/queries.ts`). `next/cache`
 * forbids Request-time APIs (`cookies()`, `headers()`) inside a cached
 * callback, so the cookie-bound client from `./server` can't be called
 * there. Catalog data (products, brands, categories) is public and RLS
 * only ever narrows it to `status = 'active'` rows regardless of who's
 * asking, so a plain anon-key client is equivalent for these reads.
 */
export function createPublicClient() {
  return createSupabaseClient<Database>(env.supabaseUrl, env.supabaseAnonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
