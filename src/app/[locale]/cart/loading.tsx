import { Skeleton } from '@/components/ui/skeleton';

export default function CartLoading() {
  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-8 px-4 py-10 lg:flex-row lg:items-start">
      <div className="flex flex-1 flex-col gap-4">
        <Skeleton className="h-8 w-32" />
        {Array.from({ length: 3 }, (_, index) => (
          <div key={index} className="flex gap-4">
            <Skeleton className="size-20 shrink-0 rounded-lg" />
            <div className="flex flex-1 flex-col gap-2">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-1/3" />
            </div>
          </div>
        ))}
      </div>

      <Skeleton className="h-64 w-full rounded-lg lg:w-80" />
    </div>
  );
}
