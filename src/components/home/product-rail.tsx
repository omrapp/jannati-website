import { ProductCard } from '@/components/commerce/product-card';
import { Link } from '@/i18n/navigation';
import type { ProductSummary } from '@/lib/catalog/mappers';

/**
 * One home-page product section (New Arrivals / Best Sellers / Recommended).
 * Reuses `ProductCard` from the `/products` grid rather than a new card
 * component — same image/price/badge shape shoppers already recognize.
 * Renders nothing when empty, per the home rebuild's empty-state rule —
 * an empty heading with no products under it would look broken, not "empty".
 */
export function ProductRail({
  heading,
  viewAllHref,
  viewAllLabel,
  products,
}: {
  heading: string;
  viewAllHref: string;
  viewAllLabel: string;
  products: ProductSummary[];
}) {
  if (products.length === 0) return null;

  return (
    <section className="flex flex-col gap-4">
      <div className="flex items-baseline justify-between">
        <h2 className="font-display text-xl font-semibold sm:text-2xl">{heading}</h2>
        <Link href={viewAllHref} className="text-primary text-sm font-medium hover:underline">
          {viewAllLabel}
        </Link>
      </div>
      <div className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 lg:grid-cols-4">
        {products.map((product) => (
          <ProductCard key={product.handle} product={product} />
        ))}
      </div>
    </section>
  );
}
