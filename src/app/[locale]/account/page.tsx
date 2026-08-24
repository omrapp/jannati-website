import NextLink from 'next/link';
import { notFound } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { LayoutDashboard, ShoppingBag } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { checkAdminAccess } from '@/lib/admin/auth';
import { htmlLang, isLocale, type CountryCode } from '@/i18n/config';
import { Link, redirect } from '@/i18n/navigation';
import { listAddresses } from '@/lib/commerce/addresses';
import { getCustomerProfile } from '@/lib/commerce/customers';
import { formatMoney } from '@/lib/commerce/money';
import { FULFILMENT_STATUSES, type FulfilmentStatus } from '@/lib/commerce/fulfilment';
import { listOrdersForCustomer, type OrderListEntry } from '@/lib/commerce/orders';
import type { CountryPricing } from '@/lib/commerce/types';
import { createClient, getAuthUser } from '@/lib/supabase/server';
import { cn } from '@/lib/utils';

import { logout } from './actions';
import { DeleteAccount } from './delete-account';
import { ProfileForm } from './profile-form';

const ACTIVE_STATUSES: readonly FulfilmentStatus[] = ['pending', 'processing', 'shipped'];

const STATUS_BADGE: Record<FulfilmentStatus, string> = {
  pending: 'border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300',
  processing: 'border-sky-500/40 bg-sky-500/10 text-sky-700 dark:text-sky-300',
  shipped: 'border-indigo-500/40 bg-indigo-500/10 text-indigo-700 dark:text-indigo-300',
  delivered: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
  cancelled: 'border-rose-500/40 bg-rose-500/10 text-rose-700 dark:text-rose-300',
};

type StatusFilter = FulfilmentStatus | 'all';

function computeStats(orders: OrderListEntry[]) {
  const total = orders.length;
  const active = orders.filter((o) => ACTIVE_STATUSES.includes(o.fulfilment_status)).length;
  const delivered = orders.filter((o) => o.fulfilment_status === 'delivered').length;

  // Orders span currencies (multi-country store), so "total spent" is a sum
  // per currency, not one number — summing raw `total_minor` across
  // currencies would silently mix OMR fils with AED fils.
  const spentByCurrency = new Map<string, number>();
  for (const o of orders) {
    spentByCurrency.set(o.currency, (spentByCurrency.get(o.currency) ?? 0) + o.total_minor);
  }

  return { total, active, delivered, spentByCurrency };
}

export default async function AccountPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ status?: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  setRequestLocale(locale);

  const user = await getAuthUser();
  if (!user) {
    return redirect({ href: { pathname: '/auth/login', query: { next: '/account' } }, locale });
  }

  const client = await createClient();
  const [profile, orders, addresses, adminAccess, t, tAddresses, tStatus] = await Promise.all([
    getCustomerProfile(client, user.id),
    listOrdersForCustomer(client, user.id),
    listAddresses(client, user.id),
    checkAdminAccess(),
    getTranslations({ locale, namespace: 'auth.account' }),
    getTranslations({ locale, namespace: 'addresses' }),
    getTranslations({ locale, namespace: 'orders.status' }),
  ]);

  const countryCodes = [...new Set(orders.map((o) => o.country_code))];
  const { data: countryRows } = countryCodes.length
    ? await client.from('countries').select('code, currency_exponent').in('code', countryCodes)
    : { data: [] };
  const exponentByCountry = new Map((countryRows ?? []).map((c) => [c.code, c.currency_exponent]));

  const { status } = await searchParams;
  const statusFilter: StatusFilter = FULFILMENT_STATUSES.includes(status as FulfilmentStatus)
    ? (status as FulfilmentStatus)
    : 'all';
  const filteredOrders =
    statusFilter === 'all' ? orders : orders.filter((o) => o.fulfilment_status === statusFilter);

  const stats = computeStats(orders);
  const defaultAddress = addresses.find((a) => a.is_default) ?? addresses[0] ?? null;

  const dateFormatter = new Intl.DateTimeFormat(`${htmlLang(locale)}-u-nu-latn`, {
    dateStyle: 'medium',
  });
  const money = (minor: number, currency: string, countryCode: string) =>
    formatMoney(
      minor,
      {
        code: countryCode as CountryCode,
        currency,
        currencyExponent: exponentByCountry.get(countryCode) ?? 2,
        fxRateFromOmr: 1,
        roundingStepMinor: 1,
      } satisfies CountryPricing,
      locale,
    );

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-8 px-4 py-10 md:py-14">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-semibold">{t('title')}</h1>
          {profile && (
            <p className="text-muted-foreground mt-1 text-sm">
              {t('memberSince', { date: dateFormatter.format(new Date(profile.created_at)) })}
            </p>
          )}
        </div>
        <form action={logout.bind(null, locale)}>
          <Button type="submit" variant="outline">
            {t('signOut')}
          </Button>
        </form>
      </header>

      <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
        <div className="flex flex-col gap-8">
          {/* Profile */}
          <section className="rounded-lg border p-6">
            <h2 className="mb-4 text-lg font-semibold">{t('profile.title')}</h2>
            <ProfileForm
              locale={locale}
              email={user.email ?? ''}
              fullName={profile?.full_name ?? null}
              phone={profile?.phone ?? null}
            />
          </section>

          {/* Addresses */}
          <section className="rounded-lg border p-6">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-lg font-semibold">{tAddresses('title')}</h2>
              <Button asChild variant="outline" size="sm">
                <Link href="/account/addresses">{tAddresses('edit')}</Link>
              </Button>
            </div>
            {defaultAddress ? (
              <div className="text-sm">
                <div className="flex items-center gap-2 font-medium">
                  {defaultAddress.full_name}
                  <Badge variant="secondary">{tAddresses('default')}</Badge>
                </div>
                <p className="text-muted-foreground mt-0.5">
                  {defaultAddress.line1}
                  {defaultAddress.area ? `, ${defaultAddress.area}` : ''}, {defaultAddress.city}
                </p>
                {addresses.length > 1 && (
                  <p className="text-muted-foreground mt-1 text-xs">+{addresses.length - 1} more</p>
                )}
              </div>
            ) : (
              <p className="text-muted-foreground text-sm">{tAddresses('empty')}</p>
            )}
          </section>

          {/* Orders */}
          <section className="rounded-lg border p-6">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <h2 className="flex items-center gap-2 text-lg font-semibold">
                <ShoppingBag className="size-5" />
                {t('orders.title')}
              </h2>
              <Button asChild variant="outline" size="sm">
                <Link href="/products">{t('orders.continueShopping')}</Link>
              </Button>
            </div>

            <div className="mb-4 flex flex-wrap gap-2">
              {(['all', ...FULFILMENT_STATUSES] as const).map((s) => (
                <Link
                  key={s}
                  href={{ pathname: '/account', query: s === 'all' ? {} : { status: s } }}
                  className={cn(
                    'rounded-full border px-3 py-1 text-xs transition-colors',
                    statusFilter === s
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border hover:bg-accent',
                  )}
                >
                  {s === 'all' ? t('orders.filterAll') : tStatus(s)}
                </Link>
              ))}
            </div>

            {filteredOrders.length === 0 ? (
              <div className="grid place-items-center gap-2 rounded-md border border-dashed px-4 py-10 text-center">
                <ShoppingBag className="text-muted-foreground size-8" />
                <p className="text-muted-foreground text-sm">
                  {statusFilter === 'all' ? t('orders.empty') : t('orders.emptyFiltered')}
                </p>
              </div>
            ) : (
              <ul className="flex flex-col gap-3">
                {filteredOrders.map((o) => (
                  <li key={o.id}>
                    <Link
                      href={`/checkout/confirmation/${o.order_number}`}
                      className="hover:bg-accent/40 flex flex-wrap items-center justify-between gap-3 rounded-md border px-3 py-3"
                    >
                      <div className="flex flex-col gap-0.5">
                        <span className="font-mono text-xs font-semibold">{o.order_number}</span>
                        <span className="text-muted-foreground text-xs">
                          {dateFormatter.format(new Date(o.created_at))}
                        </span>
                      </div>
                      <span
                        className={cn(
                          'rounded-full border px-2 py-0.5 text-xs',
                          STATUS_BADGE[o.fulfilment_status],
                        )}
                      >
                        {tStatus(o.fulfilment_status)}
                      </span>
                      <span className="text-sm font-medium tabular-nums">
                        {money(o.total_minor, o.currency, o.country_code)}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <DeleteAccount locale={locale} />
        </div>

        <aside className="flex flex-col gap-6">
          <section className="rounded-lg border p-6">
            <h2 className="mb-4 text-sm font-semibold">{t('stats.title')}</h2>
            <ul className="grid grid-cols-2 gap-4 text-sm">
              <li>
                <p className="text-muted-foreground text-xs uppercase">{t('stats.totalOrders')}</p>
                <p className="text-2xl font-bold tabular-nums">{stats.total}</p>
              </li>
              <li>
                <p className="text-muted-foreground text-xs uppercase">{t('stats.active')}</p>
                <p className="text-2xl font-bold tabular-nums">{stats.active}</p>
              </li>
              <li>
                <p className="text-muted-foreground text-xs uppercase">{t('stats.delivered')}</p>
                <p className="text-2xl font-bold tabular-nums">{stats.delivered}</p>
              </li>
              <li className="col-span-2">
                <p className="text-muted-foreground text-xs uppercase">{t('stats.spent')}</p>
                {stats.spentByCurrency.size === 0 ? (
                  <p className="text-2xl font-bold tabular-nums">—</p>
                ) : (
                  <ul className="flex flex-col gap-0.5">
                    {[...stats.spentByCurrency.entries()].map(([currency, minor]) => {
                      const countryCode =
                        orders.find((o) => o.currency === currency)?.country_code ?? '';
                      return (
                        <li key={currency} className="text-lg font-bold tabular-nums">
                          {money(minor, currency, countryCode)}
                        </li>
                      );
                    })}
                  </ul>
                )}
              </li>
            </ul>
          </section>

          {adminAccess.isAdmin && (
            <section className="rounded-lg border p-6">
              <h2 className="mb-4 text-sm font-semibold">{t('admin.goToDashboard')}</h2>
              <Button asChild variant="outline" className="w-full">
                {/* next/link, not next-intl's `Link` — /admin lives outside src/app/[locale], no locale prefix to add. */}
                <NextLink href="/admin">
                  <LayoutDashboard />
                  {t('admin.goToDashboard')}
                </NextLink>
              </Button>
            </section>
          )}
        </aside>
      </div>
    </div>
  );
}
