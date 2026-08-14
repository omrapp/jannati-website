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

/**
 * The signed-in user, or `null` for a guest. Safe to call from a Server
 * Component — unlike `getSession()`, this round-trips through Supabase Auth
 * so a stale or forged cookie can't pass as a valid session.
 */
export async function getAuthUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return user;
}
