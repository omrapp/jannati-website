import { ProductGridSkeleton } from '@/components/commerce/product-grid-skeleton';
import { Skeleton } from '@/components/ui/skeleton';

export default function WishlistLoading() {
  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-12">
      <Skeleton className="h-6 w-32" />
      <ProductGridSkeleton />
    </div>
  );
}
