import { Skeleton } from '@/components/ui/skeleton';

export default function ResetConfirmLoading() {
  return (
    <div className="mx-auto flex max-w-sm flex-col gap-8 px-4 py-16">
      <Skeleton className="h-8 w-32" />
      <div className="flex flex-col gap-4">
        <Skeleton className="h-11 w-full rounded-lg" />
        <Skeleton className="h-11 w-full rounded-lg" />
      </div>
    </div>
  );
}
