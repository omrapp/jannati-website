import { ProductRail } from '@/components/home/product-rail';
import type { Locale } from '@/i18n/config';
import { listProducts, type ListProductsOptions } from '@/lib/catalog/queries';

/**
 * Data-fetching wrapper around `ProductRail`, one per home-page rail. Each
 * instance sits in its own `<Suspense>` boundary in `page.tsx` so New
 * Arrivals / Recommended / Best Sellers stream in independently instead of
 * gating each other (or the hero) behind a shared `Promise.all`.
 * `listProducts` is already `unstable_cache`-wrapped, so three independent
 * calls here cost the same as the one combined call did before.
 */
export async function ProductRailSection({
  locale,
  sort,
  page,
  pageSize,
  heading,
  viewAllHref,
  viewAllLabel,
  priority = false,
}: {
  locale: Locale;
  sort?: ListProductsOptions['sort'];
  page?: number;
  pageSize: number;
  heading: string;
  viewAllHref: string;
  viewAllLabel: string;
  priority?: boolean;
}) {
  const { items } = await listProducts({ locale, sort, page, pageSize });

  return (
    <ProductRail
      heading={heading}
      viewAllHref={viewAllHref}
      viewAllLabel={viewAllLabel}
      products={items}
      priority={priority}
    />
  );
}
