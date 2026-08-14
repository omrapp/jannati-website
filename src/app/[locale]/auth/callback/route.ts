import { NextResponse, type NextRequest } from 'next/server';

import { createClient } from '@/lib/supabase/server';
import { safeRedirectPath } from '@/lib/auth/safe-redirect';

/**
 * Landing point for every Supabase auth email link (password recovery
 * today; email confirmation and OAuth reuse this same shape later). The
 * `code` query param is a one-time PKCE code — exchanging it here, in a
 * Route Handler, is what actually persists the resulting session cookie;
 * a Server Component render can only read cookies, never write them.
 */
export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get('code');
  const next = safeRedirectPath(request.nextUrl.searchParams.get('next'));

  if (code) {
    const supabase = await createClient();
    await supabase.auth.exchangeCodeForSession(code);
  }

  return NextResponse.redirect(new URL(next, request.url));
}
