/**
 * Supabase's auth errors are raw, English, and occasionally identity-leaking
 * ("User already registered"). We never show those to a shopper directly —
 * map the stable `error.code` to one of our own translated message keys
 * instead. Pure and DB-free so it's unit-testable without a live Supabase
 * client, matching the pattern in `src/lib/commerce/cart.ts`.
 */

export type AuthErrorKey =
  'invalidCredentials' | 'emailTaken' | 'weakPassword' | 'rateLimited' | 'samePassword' | 'generic';

const CODE_TO_KEY: Record<string, AuthErrorKey> = {
  invalid_credentials: 'invalidCredentials',
  email_exists: 'emailTaken',
  user_already_exists: 'emailTaken',
  weak_password: 'weakPassword',
  over_email_send_rate_limit: 'rateLimited',
  over_request_rate_limit: 'rateLimited',
  same_password: 'samePassword',
};

/** Falls back to `'generic'` for unrecognized or missing codes — never leaks the raw message. */
export function authErrorKey(code: string | null | undefined): AuthErrorKey {
  if (!code) return 'generic';
  return CODE_TO_KEY[code] ?? 'generic';
}
