import { Skeleton } from '@/components/ui/skeleton';

export default function AddressesLoading() {
  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6 px-4 py-12">
      <Skeleton className="h-8 w-40" />
      <Skeleton className="h-32 w-full rounded-lg" />
      <Skeleton className="h-32 w-full rounded-lg" />
    </div>
  );
}
