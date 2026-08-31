import { Skeleton } from '@/components/ui/skeleton';

export default function OrderLookupLoading() {
  return (
    <div className="mx-auto flex max-w-sm flex-col gap-8 px-4 py-16">
      <Skeleton className="h-8 w-40" />
      <Skeleton className="h-11 w-full rounded-lg" />
      <Skeleton className="h-11 w-full rounded-lg" />
      <Skeleton className="h-11 w-full rounded-lg" />
    </div>
  );
}
