import { defineRouting } from 'next-intl/routing';

import { defaultLocale, locales } from './config';

export const routing = defineRouting({
  locales,
  defaultLocale,
  // Every URL carries its locale-country prefix; detection is handled in middleware.
  localePrefix: 'always',
  localeDetection: false,
});
