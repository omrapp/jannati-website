import { hasLocale } from 'next-intl';
import { getRequestConfig } from 'next-intl/server';

import { defaultLocale, parseLocale } from './config';
import { routing } from './routing';

/**
 * Translations are stored per language, not per locale-country: `ar-om` and
 * `ar-ae` share the same message catalogue and differ only in commerce rules.
 */
export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale;
  const locale = hasLocale(routing.locales, requested) ? requested : defaultLocale;
  const { language } = parseLocale(locale);

  return {
    locale,
    messages: (await import(`../messages/${language}.json`)).default,
  };
});
