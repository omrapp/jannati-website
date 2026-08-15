import type { Metadata } from 'next';
import { Inter } from 'next/font/google';

import { ThemeProvider } from '@/components/theme-provider';
import '../globals.css';

/**
 * `/admin` is a separate route tree from `/[locale]/**`, so it needs its own
 * root layout with `html`/`body` — see the file header note in
 * `[locale]/layout.tsx`, which only covers the storefront tree. Staff-only,
 * so no next-intl provider, no RTL, no storefront Header/Footer: role
 * gating and the admin chrome (nav, sign-out) live in
 * `admin/(protected)/layout.tsx`, not here — this layer is just the HTML
 * shell every admin route (including `/admin/login`) needs.
 */
const latin = Inter({ subsets: ['latin'], variable: '--font-latin', display: 'swap' });

export const metadata: Metadata = {
  title: { default: 'Jannati Admin', template: '%s | Jannati Admin' },
  robots: { index: false, follow: false },
};

export default function AdminRootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" dir="ltr" suppressHydrationWarning className={latin.variable}>
      <body>
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
