import { Skeleton } from '@/components/ui/skeleton';

export default function ContactLoading() {
  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-10 px-4 py-16">
      <div className="mx-auto flex max-w-xl flex-col items-center gap-3 text-center">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-full" />
      </div>
      <Skeleton className="h-96 w-full rounded-lg" />
    </div>
  );
}
