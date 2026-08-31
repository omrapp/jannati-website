import { ProductGridSkeleton } from '@/components/commerce/product-grid-skeleton';
import { Skeleton } from '@/components/ui/skeleton';

export default function ProductsLoading() {
  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-8 px-4 py-10">
      <header className="flex flex-col gap-1">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-24" />
      </header>

      <div className="flex items-center gap-3">
        <Skeleton className="h-9 w-28" />
        <Skeleton className="h-9 w-28" />
      </div>

      <ProductGridSkeleton />
    </div>
  );
}
