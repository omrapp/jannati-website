import { Skeleton } from '@/components/ui/skeleton';

export default function ProductDetailLoading() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <div className="grid gap-10 lg:grid-cols-2">
        <div className="flex flex-col gap-4">
          <Skeleton className="aspect-square w-full rounded-xl" />
          <div className="flex flex-wrap gap-3">
            {Array.from({ length: 4 }, (_, index) => (
              <Skeleton key={index} className="size-16 rounded-lg" />
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-6">
          <header className="flex flex-col gap-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-9 w-3/4" />
          </header>

          <Skeleton className="h-10 w-full max-w-xs" />
          <Skeleton className="h-11 w-40 rounded-full" />

          <div className="flex flex-col gap-2">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-2/3" />
          </div>
        </div>
      </div>
    </div>
  );
}
