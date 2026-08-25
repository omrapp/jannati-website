import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { NextIntlClientProvider } from 'next-intl';

import { ThemeProvider } from '@/components/theme-provider';
import { textDirection } from '@/i18n/config';
import { getAdminLocale, getAdminMessages } from '@/lib/admin/locale';
import '../globals.css';

/**
 * `/admin` is a separate route tree from `/[locale]/**`, so it needs its own
 * root layout with `html`/`body` — see the file header note in
 * `[locale]/layout.tsx`, which only covers the storefront tree.
 *
 * AR/RTL: `/admin` deliberately has no URL-based locale (see `src/proxy.ts`'s
 * `admin` early return and `src/i18n/routing.ts`'s `localePrefix`), so
 * `dir`/`lang` and the message catalogue are driven entirely by the
 * `jannati_admin_locale` cookie (`@/lib/admin/locale`), read here on every
 * request. This is next-intl's non-routing usage — messages are loaded
 * directly from `admin-{en,ar}.json` and handed to `NextIntlClientProvider`,
 * not through `getRequestConfig`/`routing.ts`, which stay storefront-only.
 */
const latin = Inter({ subsets: ['latin'], variable: '--font-latin', display: 'swap' });

export const metadata: Metadata = {
  title: { default: 'Jannati Admin', template: '%s | Jannati Admin' },
  robots: { index: false, follow: false },
};

export default async function AdminRootLayout({ children }: { children: React.ReactNode }) {
  const locale = await getAdminLocale();
  const messages = await getAdminMessages(locale);

  return (
    <html
      lang={locale}
      dir={textDirection(locale)}
      suppressHydrationWarning
      className={latin.variable}
    >
      <body>
        <ThemeProvider>
          <NextIntlClientProvider locale={locale} messages={messages}>
            {children}
          </NextIntlClientProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
