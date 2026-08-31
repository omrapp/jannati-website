import { Skeleton } from '@/components/ui/skeleton';

export default function BrandsLoading() {
  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-10 px-4 py-10">
      <header className="flex flex-col gap-1">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-4 w-24" />
      </header>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        {Array.from({ length: 10 }, (_, index) => (
          <Skeleton key={index} className="h-28 w-full rounded-lg" />
        ))}
      </div>
    </div>
  );
}
