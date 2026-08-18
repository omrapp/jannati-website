import { Mail, Phone } from 'lucide-react';
import { getTranslations } from 'next-intl/server';

import { Logo } from '@/components/layout/logo';
import { footerAboutNav, footerHelpNav, footerShopNav } from '@/components/layout/nav-links';
import { SocialIcons } from '@/components/layout/social-icons';
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

  return (
    <footer className="bg-muted/40 mt-16 border-t">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-12 sm:grid-cols-2 lg:grid-cols-4">
        <div className="space-y-4">
          <Logo />
          <p className="text-muted-foreground text-sm">{t('brand.tagline')}</p>
          {(settings.phone || settings.email) && (
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
        <div className="text-muted-foreground mx-auto flex max-w-7xl flex-col gap-3 px-4 py-5 text-xs sm:flex-row sm:items-center sm:justify-between">
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
