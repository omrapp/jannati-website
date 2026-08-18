import type { MetadataRoute } from 'next';

import { locales } from '@/i18n/config';
import { env } from '@/lib/env';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      // Every storefront route carries a locale prefix, so blocking the
      // account area means one disallow rule per locale — `/admin` has no
      // such prefix and one rule covers it and everything under it.
      disallow: ['/admin', ...locales.map((locale) => `/${locale}/account`)],
    },
    sitemap: `${env.siteUrl}/sitemap.xml`,
  };
}
