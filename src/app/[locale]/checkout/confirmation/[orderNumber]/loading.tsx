import { Skeleton } from '@/components/ui/skeleton';

export default function CheckoutConfirmationLoading() {
  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-4 px-4 py-12">
      <Skeleton className="h-8 w-64" />
      <Skeleton className="h-4 w-40" />
      <Skeleton className="h-48 w-full rounded-lg" />
    </div>
  );
}
