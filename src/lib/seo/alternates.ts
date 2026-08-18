/**
 * hreflang + canonical for a route whose path stays identical across every
 * `{language}-{country}` combo once the locale prefix is stripped — true for
 * every catalog/content route in this app, since a product handle or
 * category slug isn't translated per-locale. `pathSuffix` is everything
 * after the locale segment: `''` for home, `/products/${handle}` for a PDP.
 */

import type { Metadata } from 'next';

import { htmlLang, locales, type Locale } from '@/i18n/config';
import { env } from '@/lib/env';

export function localeAlternates(currentLocale: Locale, pathSuffix: string): Metadata['alternates'] {
  const languages = Object.fromEntries(
    locales.map((locale) => [htmlLang(locale), `${env.siteUrl}/${locale}${pathSuffix}`]),
  );

  return { canonical: languages[htmlLang(currentLocale)], languages };
}
