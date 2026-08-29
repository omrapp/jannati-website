import { Mail, MapPin, Phone } from 'lucide-react';
import { getLocale, getTranslations } from 'next-intl/server';

import { Logo } from '@/components/layout/logo';
import { footerAboutNav, footerHelpNav, footerShopNav } from '@/components/layout/nav-links';
import { SocialIcons, WhatsAppIcon, whatsAppLink } from '@/components/layout/social-icons';
import { parseLocale, type Locale } from '@/i18n/config';
import { Link } from '@/i18n/navigation';
import { getSiteSettings } from '@/lib/admin/site-settings';
import { createClient } from '@/lib/supabase/server';

const columns = [
  { titleKey: 'shop', items: footerShopNav },
  { titleKey: 'help', items: footerHelpNav },
  { titleKey: 'about', items: footerAboutNav },
] as const;

/** Payment methods shown as text until brand-approved payment marks are added. */
const paymentMethods = ['Visa', 'Mastercard', 'Amex', 'Thawani', 'COD'];

export async function Footer() {
  const t = await getTranslations();
  const settings = await getSiteSettings(await createClient());
  const locale = (await getLocale()) as Locale;
  const { language } = parseLocale(locale);
  const address = (language === 'ar' ? settings.address_ar : settings.address_en) || null;
  const whatsapp = settings.whatsapp_show && settings.whatsapp ? whatsAppLink(settings.whatsapp) : null;

  return (
    <footer className="bg-muted/40 mt-16 border-t">
      <div className="max-w-page mx-auto grid gap-10 px-4 py-12 sm:grid-cols-2 sm:py-16 lg:grid-cols-4">
        <div className="space-y-4">
          <Logo />
          <p className="text-muted-foreground text-sm leading-relaxed">{t('brand.tagline')}</p>
          {(settings.phone || settings.email || whatsapp || address) && (
            <ul className="text-muted-foreground space-y-1.5 text-sm">
              {settings.phone && (
                <li>
                  <a href={`tel:${settings.phone}`} className="hover:text-foreground flex items-center gap-1.5">
                    <Phone className="size-3.5" /> {settings.phone}
                  </a>
                </li>
              )}
              {settings.email && (
                <li>
                  <a href={`mailto:${settings.email}`} className="hover:text-foreground flex items-center gap-1.5">
                    <Mail className="size-3.5" /> {settings.email}
                  </a>
                </li>
              )}
              {whatsapp && (
                <li>
                  <a
                    href={whatsapp}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="hover:text-foreground flex items-center gap-1.5"
                  >
                    <WhatsAppIcon className="size-3.5" /> {t('contact.whatsappLabel')}
                  </a>
                </li>
              )}
              {address && (
                <li className="flex items-start gap-1.5">
                  <MapPin className="size-3.5 shrink-0 translate-y-0.5" /> <span>{address}</span>
                </li>
              )}
            </ul>
          )}
          <SocialIcons settings={settings} t={t} className="flex items-center gap-3" />
        </div>

        {columns.map((column) => (
          <nav key={column.titleKey} aria-label={t(`footer.${column.titleKey}`)}>
            <h2 className="mb-3 text-sm font-semibold">{t(`footer.${column.titleKey}`)}</h2>
            <ul className="space-y-2 text-sm">
              {column.items.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {t(item.labelKey)}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        ))}
      </div>

      <div className="border-t">
        <div className="max-w-page text-muted-foreground mx-auto flex flex-col gap-3 px-4 py-5 text-xs sm:flex-row sm:items-center sm:justify-between">
          <p>
            © {new Date().getFullYear()} {t('brand.name')}. {t('footer.rights')}
          </p>
          <ul className="flex flex-wrap items-center gap-2" aria-label={t('footer.payments')}>
            {paymentMethods.map((method) => (
              <li key={method} className="bg-background rounded border px-2 py-1">
                {method}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </footer>
  );
}
