import { BrandStrip } from '@/components/home/brand-strip';
import type { Locale } from '@/i18n/config';
import { listBrands } from '@/lib/catalog/queries';

// Home strip is a teaser, not the full directory — cap it and only show
// brands with a logo (a name-only tile reads as a placeholder at a glance);
// the "view all" link takes shoppers to `/brands` for the rest.
const BRAND_STRIP_SIZE = 20;

/**
 * Data-fetching wrapper around `BrandStrip`, split out so its `listBrands`
 * call sits in its own `<Suspense>` boundary in `page.tsx` instead of
 * gating the hero or the product rails behind a shared `Promise.all`.
 */
export async function BrandStripSection({
  locale,
  heading,
  viewAllHref,
  viewAllLabel,
}: {
  locale: Locale;
  heading: string;
  viewAllHref: string;
  viewAllLabel: string;
}) {
  const brands = await listBrands(locale);
  const brandsWithLogos = brands
    .filter((brand) => brand.logoUrl !== null)
    .slice(0, BRAND_STRIP_SIZE);

  return (
    <BrandStrip
      heading={heading}
      viewAllHref={viewAllHref}
      viewAllLabel={viewAllLabel}
      brands={brandsWithLogos}
    />
  );
}
