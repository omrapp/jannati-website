import { Skeleton } from '@/components/ui/skeleton';

/**
 * Streaming fallback for `ProductGrid`. Mirrors its grid columns
 * (`grid-cols-2 sm:grid-cols-3 lg:grid-cols-4`) and each `ProductCard`'s
 * aspect-square image so the real grid doesn't shift layout when it
 * replaces this skeleton.
 */
export function ProductGridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 lg:grid-cols-4">
      {Array.from({ length: count }, (_, index) => (
        <div key={index} className="flex flex-col gap-3">
          <Skeleton className="aspect-square w-full rounded-lg" />
          <div className="flex flex-col gap-2">
            <Skeleton className="h-3 w-2/3" />
            <Skeleton className="h-4 w-1/2" />
          </div>
        </div>
      ))}
    </div>
  );
}
