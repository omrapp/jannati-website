/**
 * Locale model: every storefront URL carries both a language and a country,
 * e.g. `/ar-om` or `/en-ae`. Language drives translation + text direction,
 * country drives currency, VAT, shipping and product availability.
 */

export const languages = ['ar', 'en'] as const;
export type Language = (typeof languages)[number];

export const countries = ['om', 'ae', 'sa', 'kw', 'qa', 'bh'] as const;
export type CountryCode = (typeof countries)[number];

export const defaultLanguage: Language = 'ar';
export const defaultCountry: CountryCode = 'om';

/** All 12 valid `{language}-{country}` combinations, e.g. `ar-om`. */
export const locales = languages.flatMap((language) =>
  countries.map((country) => `${language}-${country}` as const),
);
export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = `${defaultLanguage}-${defaultCountry}`;

export function isLocale(value: string): value is Locale {
  return (locales as readonly string[]).includes(value);
}

export function parseLocale(locale: Locale): { language: Language; country: CountryCode } {
  const [language, country] = locale.split('-') as [Language, CountryCode];
  return { language, country };
}

export function buildLocale(language: Language, country: CountryCode): Locale {
  return `${language}-${country}` as Locale;
}

export function textDirection(language: Language): 'rtl' | 'ltr' {
  return language === 'ar' ? 'rtl' : 'ltr';
}

/** `lang` attribute value — full BCP 47 tag, e.g. `ar-OM`. */
export function htmlLang(locale: Locale): string {
  const { language, country } = parseLocale(locale);
  return `${language}-${country.toUpperCase()}`;
}

/** Cookie remembering the shopper's chosen country across visits. */
export const COUNTRY_COOKIE = 'jannati_country';
/** Cookie remembering the shopper's chosen language across visits. */
export const LANGUAGE_COOKIE = 'jannati_language';
