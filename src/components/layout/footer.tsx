import { useTranslations } from 'next-intl';

import { Logo } from '@/components/layout/logo';
import { footerAboutNav, footerHelpNav, footerShopNav } from '@/components/layout/nav-links';
import { Link } from '@/i18n/navigation';

const columns = [
  { titleKey: 'shop', items: footerShopNav },
  { titleKey: 'help', items: footerHelpNav },
  { titleKey: 'about', items: footerAboutNav },
] as const;

/** Payment methods shown as text until brand-approved payment marks are added. */
const paymentMethods = ['Visa', 'Mastercard', 'Amex', 'Thawani', 'COD'];

export function Footer() {
  const t = useTranslations();

  return (
    <footer className="bg-muted/40 mt-16 border-t">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-12 sm:grid-cols-2 lg:grid-cols-4">
        <div className="space-y-4">
          <Logo />
          <p className="text-muted-foreground text-sm">{t('brand.tagline')}</p>
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
