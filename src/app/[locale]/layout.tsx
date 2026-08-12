import type { Metadata } from 'next';
import { IBM_Plex_Sans_Arabic, Inter, Playfair_Display } from 'next/font/google';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages, getTranslations, setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';

import { Footer } from '@/components/layout/footer';
import { Header } from '@/components/layout/header';
import { ThemeProvider } from '@/components/theme-provider';
import { htmlLang, isLocale, locales, parseLocale, textDirection } from '@/i18n/config';
import '../globals.css';

const arabic = IBM_Plex_Sans_Arabic({
  subsets: ['arabic'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-arabic',
  display: 'swap',
});

const latin = Inter({
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
            </div>
          </NextIntlClientProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
