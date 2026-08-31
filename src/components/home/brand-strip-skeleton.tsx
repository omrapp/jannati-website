import { Skeleton } from '@/components/ui/skeleton';

/**
 * Streaming fallback for `BrandStripSection`. Mirrors its heading/"view
 * all" row (same markup as `ProductRailSkeleton`'s) plus a row of tile-sized
 * placeholders matching `BrandTile`'s `h-14 min-w-28` so the strip doesn't
 * shift once real brands swap in.
 */
export function BrandStripSkeleton() {
  return (
    <section className="flex flex-col gap-4 sm:gap-6">
      <div className="flex items-baseline justify-between">
        <Skeleton className="h-8 w-40 sm:h-9 sm:w-56" />
        <Skeleton className="h-5 w-16" />
      </div>
      <div className="flex items-center gap-6 overflow-hidden">
        {Array.from({ length: 8 }, (_, index) => (
          <Skeleton key={index} className="h-14 min-w-28 shrink-0 rounded-md" />
        ))}
      </div>
    </section>
  );
}
