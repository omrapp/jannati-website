import { Skeleton } from '@/components/ui/skeleton';

export default function CollectionsLoading() {
  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-8 px-4 py-10">
      <header className="flex flex-col gap-1">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-24" />
      </header>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 md:grid-cols-4">
        {Array.from({ length: 8 }, (_, index) => (
          <Skeleton key={index} className="aspect-[4/5] w-full rounded-lg" />
        ))}
      </div>
    </div>
  );
}
