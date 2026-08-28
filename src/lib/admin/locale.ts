import { cookies } from 'next/headers';

import type { Language } from '@/i18n/config';
import type adminEn from '@/messages/admin-en.json';

// `admin-en.json`'s literal shape, not `Record<string, unknown>` — next-intl's
// `useTranslations`/`createTranslator` infer valid namespace/key strings from
// the actual `messages` object type, so a widened type here would make every
// `t('key')` call downstream untyped (`never`). `admin-ar.json` is assumed to
// mirror this key structure (same convention as the storefront's `en.json`/
// `ar.json` pair).
export type AdminMessages = typeof adminEn;

/**
 * `/admin` deliberately sits outside next-intl's URL-based routing (see the
 * file header note in `admin/layout.tsx` and `src/proxy.ts`'s `admin` early
 * return) — so its language preference can't live in the URL the way the
 * storefront's does. This cookie is the only signal, and it's intentionally
 * its own cookie, not the storefront's `LANGUAGE_COOKIE`: an admin staying on
 * English shouldn't force the storefront to English on the same browser, and
 * vice versa. Exported so `(protected)/actions.ts`'s `setAdminLocale` writes
 * the same cookie this reads, rather than a second literal drifting out of sync.
 */
export const ADMIN_LOCALE_COOKIE = 'jannati_admin_locale';
export const ADMIN_LOCALE_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

function isAdminLocale(value: string | undefined): value is Language {
  return value === 'en' || value === 'ar';
}

/** Server-side read for `admin/layout.tsx` — defaults to `'en'` when the cookie is absent or invalid. */
export async function getAdminLocale(): Promise<Language> {
  const store = await cookies();
  const value = store.get(ADMIN_LOCALE_COOKIE)?.value;
  return isAdminLocale(value) ? value : 'en';
}

/**
 * Loads the admin-only message catalogue for a language — `admin-en.json` /
 * `admin-ar.json`, never the storefront's `src/messages/{en,ar}.json`.
 * Callable from any server-only module that needs a translator without
 * next-intl's request-config machinery, e.g. `admin/login/actions.ts`
 * translating a Server Action's returned message.
 */
export async function getAdminMessages(locale: Language): Promise<AdminMessages> {
  return (await import(`../../messages/admin-${locale}.json`)).default;
}
