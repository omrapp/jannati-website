import { ProductGridSkeleton } from '@/components/commerce/product-grid-skeleton';
import { Skeleton } from '@/components/ui/skeleton';

/**
 * Streaming fallback for `ProductRail`. `ProductRail` uses the same
 * `grid-cols-2 sm:grid-cols-3 lg:grid-cols-4` card grid as `/products`
 * (both render `ProductCard`), so the cards reuse `ProductGridSkeleton`
 * rather than duplicating that shape — this just adds the heading/"view
 * all" row `ProductRail` renders above it, so nothing shifts once real
 * products swap in.
 */
export function ProductRailSkeleton({ count = 8 }: { count?: number }) {
  return (
    <section className="flex flex-col gap-4 sm:gap-6">
      <div className="flex items-baseline justify-between">
        <Skeleton className="h-8 w-40 sm:h-9 sm:w-56" />
        <Skeleton className="h-5 w-16" />
      </div>
      <ProductGridSkeleton count={count} />
    </section>
  );
}
