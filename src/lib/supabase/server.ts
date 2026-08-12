import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

import { env } from '@/lib/env';
import type { Database } from './types';

/**
 * Server-side Supabase client bound to the request's cookies, so RLS sees the
 * signed-in user. Use this in Server Components, Route Handlers and Actions.
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(env.supabaseUrl, env.supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Server Components cannot set cookies; the proxy refreshes sessions instead.
        }
      },
    },
  });
}
