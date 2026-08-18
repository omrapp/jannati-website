import type { Metadata } from 'next';
import { Mail, MapPin, Phone } from 'lucide-react';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';

import { ContactForm } from '@/app/[locale]/contact/contact-form';
import { WhatsAppIcon, whatsAppLink } from '@/components/layout/social-icons';
import { isLocale, parseLocale } from '@/i18n/config';
import { getSiteSettings } from '@/lib/admin/site-settings';
import { localeAlternates } from '@/lib/seo/alternates';
import { createClient } from '@/lib/supabase/server';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  return { alternates: localeAlternates(locale, '/contact') };
}

export default async function ContactPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  setRequestLocale(locale);
  const t = await getTranslations('contact');
  const { language } = parseLocale(locale);

  const settings = await getSiteSettings(await createClient());
  const address = (language === 'ar' ? settings.address_ar : settings.address_en) || null;
  const whatsapp = settings.whatsapp_show && settings.whatsapp ? whatsAppLink(settings.whatsapp) : null;
  const hasMap = settings.map_lat != null && settings.map_lng != null;
  const hasInfo = settings.phone || settings.email || whatsapp || address;

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-10 px-4 py-16">
      <div className="flex flex-col gap-2 text-center">
        <h1 className="font-display text-3xl font-semibold md:text-4xl">{t('heading')}</h1>
        <p className="text-muted-foreground mx-auto max-w-xl">{t('subheading')}</p>
      </div>

      <div className="grid gap-10 md:grid-cols-2">
        <div className="flex flex-col gap-6">
          {hasInfo ? (
            <ul className="flex flex-col gap-4 text-sm">
              {settings.phone && (
                <li className="flex items-center gap-3">
                  <Phone className="text-muted-foreground size-4 shrink-0" />
                  <a href={`tel:${settings.phone}`} className="hover:underline">
                    {settings.phone}
                  </a>
                </li>
              )}
              {settings.email && (
                <li className="flex items-center gap-3">
                  <Mail className="text-muted-foreground size-4 shrink-0" />
                  <a href={`mailto:${settings.email}`} className="hover:underline">
                    {settings.email}
                  </a>
                </li>
              )}
              {whatsapp && (
                <li className="flex items-center gap-3">
                  <WhatsAppIcon className="text-muted-foreground size-4 shrink-0" />
                  <a href={whatsapp} target="_blank" rel="noreferrer noopener" className="hover:underline">
                    {t('whatsappLabel')}
                  </a>
                </li>
              )}
              {address && (
                <li className="flex items-start gap-3">
                  <MapPin className="text-muted-foreground mt-0.5 size-4 shrink-0" />
                  <span>{address}</span>
                </li>
              )}
            </ul>
          ) : (
            <p className="text-muted-foreground text-sm">{t('noInfoYet')}</p>
          )}

          {hasMap && (
            <div className="flex flex-col gap-2">
              <h2 className="text-sm font-semibold">{t('mapHeading')}</h2>
              <iframe
                title={t('mapHeading')}
                src={`https://www.google.com/maps?q=${settings.map_lat},${settings.map_lng}&output=embed`}
                className="h-64 w-full rounded-lg border"
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              />
            </div>
          )}
        </div>

        <div className="flex flex-col gap-4">
          <h2 className="text-sm font-semibold">{t('formHeading')}</h2>
          <ContactForm />
        </div>
      </div>
    </div>
  );
}
