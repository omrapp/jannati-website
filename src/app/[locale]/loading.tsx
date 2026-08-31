import { ProductGridSkeleton } from '@/components/commerce/product-grid-skeleton';
import { Skeleton } from '@/components/ui/skeleton';

export default function HomeLoading() {
  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-16 px-4 py-10 md:py-14">
      <Skeleton className="aspect-[16/9] w-full rounded-lg sm:aspect-[21/8]" />

      <div className="flex flex-col gap-4 sm:gap-6">
        <div className="flex items-baseline justify-between">
          <Skeleton className="h-8 w-40" />
          <Skeleton className="h-4 w-16" />
        </div>
        <ProductGridSkeleton count={4} />
      </div>
    </div>
  );
}
