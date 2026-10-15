import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';

import { ContactForm } from '@/app/[locale]/contact/contact-form';
import { ContactHero } from '@/app/[locale]/contact/contact-hero';
import { ContactInfoCards, type ContactCard } from '@/app/[locale]/contact/contact-info-cards';
import { whatsAppLink } from '@/components/layout/social-icons';
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
  const whatsapp =
    settings.whatsapp_show && settings.whatsapp ? whatsAppLink(settings.whatsapp) : null;
  const hasMap = settings.map_lat != null && settings.map_lng != null;

  const cards: ContactCard[] = [];
  if (settings.phone) {
    cards.push({
      kind: 'phone',
      title: t('callUsTitle'),
      description: t('callUsDescription'),
      value: settings.phone,
      href: `tel:${settings.phone}`,
    });
  }
  if (settings.email) {
    cards.push({
      kind: 'email',
      title: t('emailUsTitle'),
      description: t('emailUsDescription'),
      value: settings.email,
      href: `mailto:${settings.email}`,
    });
  }
  if (whatsapp) {
    cards.push({
      kind: 'whatsapp',
      title: t('whatsappUsTitle'),
      description: t('whatsappUsDescription'),
      value: t('whatsappLabel'),
      href: whatsapp,
    });
  }
  if (address) {
    cards.push({
      kind: 'address',
      title: t('visitUsTitle'),
      description: t('visitUsDescription'),
      value: address,
    });
  }

  return (
    <div className="flex flex-col">
      <ContactHero heading={t('heading')} subheading={t('subheading')} />

      <div className="mx-auto flex w-full max-w-5xl flex-col gap-16 px-4 py-16">
        {cards.length > 0 ? (
          <ContactInfoCards cards={cards} />
        ) : (
          <p className="text-muted-foreground text-center text-sm">{t('noInfoYet')}</p>
        )}

        {hasMap ? (
          <div className="grid gap-10 md:grid-cols-2">
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
            <div className="flex flex-col gap-4">
              <h2 className="text-sm font-semibold">{t('formHeading')}</h2>
              <ContactForm />
            </div>
          </div>
        ) : (
          <div className="mx-auto flex w-full max-w-xl flex-col gap-4">
            <h2 className="text-sm font-semibold">{t('formHeading')}</h2>
            <ContactForm />
          </div>
        )}
      </div>
    </div>
  );
}
