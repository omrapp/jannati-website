/**
 * Guest cart identity. A guest has no Supabase Auth session, so their cart is
 * keyed by a random token carried in a cookie — signed so a shopper (or
 * anyone reading their cookie jar) cannot forge another guest's token and
 * walk off with their cart.
 *
 * Cookie value is `${token}.${signature}`, `signature` an HMAC-SHA256 of
 * `token` under `CART_SESSION_SECRET`, base64url-encoded. The token itself
 * (used as `carts.session_token`) is never trusted without a valid signature.
 */

import crypto from 'node:crypto';

import { cookies } from 'next/headers';

import { env } from '@/lib/env';

const COOKIE_NAME = 'jannati_cart_session';
const MAX_AGE_SECONDS = 60 * 60 * 24 * 30; // 30 days — long enough to survive a slow decision, not forever.

function secret(): string {
  if (!env.cartSessionSecret) {
    throw new Error('CART_SESSION_SECRET is required to sign a guest cart session');
  }

  return env.cartSessionSecret;
}

function sign(token: string): string {
  return crypto.createHmac('sha256', secret()).update(token).digest('base64url');
}

/** A fresh, unsigned guest token — `carts.session_token` stores this, not the cookie value. */
export function createSessionToken(): string {
  return crypto.randomUUID();
}

export function signSessionCookie(token: string): string {
  return `${token}.${sign(token)}`;
}

/**
 * Verifies a cookie value and returns the token, or `null` if the cookie is
 * missing, malformed, or its signature doesn't match — any of which mean
 * "no guest cart", never a thrown error, since a bad cookie is not the
 * caller's fault to handle.
 */
export function verifySessionCookie(cookieValue: string | undefined): string | null {
  if (!cookieValue) return null;

  const [token, signature] = cookieValue.split('.');
  if (!token || !signature) return null;

  const expected = sign(token);
  const given = Buffer.from(signature);
  const wanted = Buffer.from(expected);

  // Constant-time compare: a length check up front is fine to leak (lengths
  // are public knowledge — both are fixed-size base64url digests in
  // practice), but comparing the bytes themselves via `===`/`Buffer.equals`
  // would leak how many leading bytes matched through response timing.
  if (given.length !== wanted.length || !crypto.timingSafeEqual(given, wanted)) return null;

  return token;
}

/** Reads and verifies the guest session cookie. Safe to call from a Server Component. */
export async function getGuestSessionToken(): Promise<string | null> {
  const store = await cookies();

  return verifySessionCookie(store.get(COOKIE_NAME)?.value);
}

/**
 * Issues (or re-issues) the signed guest session cookie. Only callable from a
 * Server Action or Route Handler — Next.js rejects a cookie write from a
 * Server Component render.
 */
export async function setGuestSessionCookie(token: string): Promise<void> {
  const store = await cookies();

  store.set(COOKIE_NAME, signSessionCookie(token), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: MAX_AGE_SECONDS,
  });
}

/** Clears the guest session cookie — called once its cart is merged into an account on login (2.5). */
export async function clearGuestSessionCookie(): Promise<void> {
  const store = await cookies();
  store.delete(COOKIE_NAME);
}
