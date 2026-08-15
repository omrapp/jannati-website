import type { SupabaseClient, User } from '@supabase/supabase-js';

import { createClient } from '@/lib/supabase/server';
import type { Database } from '@/lib/supabase/types';

/**
 * `is_admin()` doesn't exist in `Database` yet — same typegen gap as
 * `mark_payment_status` in `apply-webhook-result.ts` (this migration hasn't
 * been through `db:push`/`gen types` either). Delete this once the real
 * migration lands in generated types and call `.rpc('is_admin')` directly.
 */
type DatabaseWithIsAdmin = Database & {
  public: Database['public'] & {
    Functions: Database['public']['Functions'] & {
      is_admin: { Args: Record<string, never>; Returns: boolean };
    };
  };
};

// Discriminated on `isAdmin`, not a plain `{ user, isAdmin }` pair, so
// `if (!access.isAdmin) redirect(...)` narrows `access.user` to `User` for
// every caller past that guard, instead of leaving it `User | null` no
// matter which branch already ran.
export type AdminAccess = { isAdmin: true; user: User } | { isAdmin: false; user: User | null };

/**
 * One check covering both halves `admin/(protected)/layout.tsx` needs to
 * distinguish: "not signed in at all" (→ login) vs "signed in, not staff"
 * (→ storefront, not a login form that would just confirm the account
 * exists). Uses the cookie-bound client, so this respects RLS/auth exactly
 * as the request making it — never the service-role client, which would
 * make the check meaningless.
 */
export async function checkAdminAccess(): Promise<AdminAccess> {
  const supabase = (await createClient()) as unknown as SupabaseClient<DatabaseWithIsAdmin>;

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { user: null, isAdmin: false };

  const { data: isAdmin, error } = await supabase.rpc('is_admin');
  if (error || isAdmin !== true) return { user, isAdmin: false };

  return { user, isAdmin: true };
}
