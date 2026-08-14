import { createServerClient } from '@supabase/ssr';
import createMiddleware from 'next-intl/middleware';
import { NextResponse, type NextRequest } from 'next/server';

import {
  COUNTRY_COOKIE,
  LANGUAGE_COOKIE,
  buildLocale,
  countries,
  defaultCountry,
  defaultLanguage,
  isLocale,
  parseLocale,
  type CountryCode,
  type Language,
} from '@/i18n/config';
import { routing } from '@/i18n/routing';
import { env } from '@/lib/env';
import type { Database } from '@/lib/supabase/types';

const handleI18nRouting = createMiddleware(routing);

const COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

/**
 * Refreshes an expiring Supabase auth session and rewrites its cookies onto
 * `response`. This has to happen here, not in a Server Component: a Server
 * Component render can only read cookies, never write them (see the
 * `setAll` catch in `src/lib/supabase/server.ts`), so an expiring session
 * would otherwise never get renewed and the visitor would be silently
 * signed out.
 */
async function refreshSupabaseSession(request: NextRequest, response: NextResponse): Promise<void> {
  const supabase = createServerClient<Database>(env.supabaseUrl, env.supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options);
        }
      },
    },
  });

  // Do not add code between `createServerClient` and `getUser()` — the call
  // itself is what triggers the token refresh and cookie rewrite.
  await supabase.auth.getUser();
}

function resolveCountry(request: NextRequest): CountryCode {
  const fromCookie = request.cookies.get(COUNTRY_COOKIE)?.value;
  if (fromCookie && (countries as readonly string[]).includes(fromCookie)) {
    return fromCookie as CountryCode;
  }

  // Vercel injects the visitor's country; falls back to Oman elsewhere.
  const fromGeo = request.headers.get('x-vercel-ip-country')?.toLowerCase();
  if (fromGeo && (countries as readonly string[]).includes(fromGeo)) {
    return fromGeo as CountryCode;
  }

  return defaultCountry;
}

function resolveLanguage(request: NextRequest): Language {
  const fromCookie = request.cookies.get(LANGUAGE_COOKIE)?.value;
  if (fromCookie === 'ar' || fromCookie === 'en') {
    return fromCookie;
  }

  // Arabic is the shop's default language, so `accept-language` is deliberately
  // ignored: Gulf shoppers commonly browse with an English-configured device.
  // Only an explicit choice, remembered in the cookie, switches to English.
  return defaultLanguage;
}

export default async function proxy(request: NextRequest): Promise<NextResponse> {
  const { pathname } = request.nextUrl;
  const firstSegment = pathname.split('/')[1] ?? '';

  if (!isLocale(firstSegment)) {
    const locale = buildLocale(resolveLanguage(request), resolveCountry(request));
    const url = request.nextUrl.clone();
    url.pathname = `/${locale}${pathname === '/' ? '' : pathname}`;
    const response = NextResponse.redirect(url);
    await refreshSupabaseSession(request, response);
    return response;
  }

  const response = handleI18nRouting(request);

  // Remember what the visitor is actually browsing so later visits land there.
  const { language, country } = parseLocale(firstSegment);
  response.cookies.set(LANGUAGE_COOKIE, language, { maxAge: COOKIE_MAX_AGE, path: '/' });
  response.cookies.set(COUNTRY_COOKIE, country, { maxAge: COOKIE_MAX_AGE, path: '/' });

  await refreshSupabaseSession(request, response);

  return response;
}

export const config = {
  // Skip API routes, Next internals, and anything that looks like a static file.
  matcher: ['/((?!api|_next|_vercel|.*\\..*).*)'],
};
