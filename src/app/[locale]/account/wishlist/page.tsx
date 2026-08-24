import { notFound } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';

import { WishlistGrid } from '@/components/commerce/wishlist-grid';
import { isLocale } from '@/i18n/config';
import { redirect } from '@/i18n/navigation';
import { getProductsByIds } from '@/lib/catalog/queries';
import { listWishlistProductIds } from '@/lib/commerce/wishlist';
import { createClient, getAuthUser } from '@/lib/supabase/server';

/**
 * Same auth gate as `/account/addresses` — no guest wishlist, so a
 * signed-out visitor is bounced to login rather than shown an empty page.
 */
export default async function WishlistPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  setRequestLocale(locale);

  const user = await getAuthUser();
  if (!user) {
    return redirect({
      href: { pathname: '/auth/login', query: { next: '/account/wishlist' } },
      locale,
    });
  }

  const t = await getTranslations('wishlist');
  const client = await createClient();
  const productIds = await listWishlistProductIds(client, user.id);
  const products = await getProductsByIds(productIds, locale);

  // `getProductsByIds` doesn't order its results — reassert the saved order
  // (most recently added first) that `productIds` already carries.
  const order = new Map(productIds.map((id, index) => [id, index]));
  const ordered = [...products].sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0));

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-12">
      <h1 className="text-xl font-semibold">{t('title')}</h1>
      <WishlistGrid products={ordered} />
    </div>
  );
}
