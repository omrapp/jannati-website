import type { Metadata } from 'next';
import { Cairo, Outfit, Playfair_Display } from 'next/font/google';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages, getTranslations, setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';

import { Footer } from '@/components/layout/footer';
import { Header } from '@/components/layout/header';
import { WhatsAppButton } from '@/components/layout/whatsapp-button';
import { ThemeProvider } from '@/components/theme-provider';
import { htmlLang, isLocale, locales, parseLocale, textDirection } from '@/i18n/config';
import { getSiteSettings } from '@/lib/admin/site-settings';
import { env } from '@/lib/env';
import { createClient } from '@/lib/supabase/server';
import '../globals.css';

// Darbeauty's actual body/UI fonts (Outfit + Cairo) — headings stay Playfair Display,
// which darbeauty doesn't have but the user asked to keep.
const arabic = Cairo({
  subsets: ['arabic'],
  weight: ['300', '400', '600', '700', '800'],
  variable: '--font-arabic',
  display: 'swap',
});

const latin = Outfit({
  subsets: ['latin'],
  variable: '--font-latin',
  display: 'swap',
});

const display = Playfair_Display({
  subsets: ['latin'],
  variable: '--font-display',
  display: 'swap',
});

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  const t = await getTranslations({ locale, namespace: 'brand' });

  return {
    // Lets every page below set OG images and canonical/hreflang URLs as
    // relative paths and still resolve correctly.
    metadataBase: new URL(env.siteUrl),
    title: { default: `${t('name')} — ${t('tagline')}`, template: `%s | ${t('name')}` },
    description: t('tagline'),
  };
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  setRequestLocale(locale);
  const messages = await getMessages();
  const { language } = parseLocale(locale);
  const settings = await getSiteSettings(await createClient());

  return (
    <html
      lang={htmlLang(locale)}
      dir={textDirection(language)}
      suppressHydrationWarning
      className={`${arabic.variable} ${latin.variable} ${display.variable}`}
    >
      <body>
        <ThemeProvider>
          <NextIntlClientProvider messages={messages}>
            <div className="flex min-h-dvh flex-col">
              <Header />
              <main className="flex-1">{children}</main>
              <Footer />
              <WhatsAppButton settings={settings} />
            </div>
          </NextIntlClientProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
