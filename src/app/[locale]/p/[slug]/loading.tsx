import { Skeleton } from '@/components/ui/skeleton';

export default function ContentPageLoading() {
  return (
    <div className="flex flex-col">
      <Skeleton className="h-[260px] w-full sm:h-[340px] md:h-[420px]" />

      <article className="mx-auto flex w-full max-w-3xl flex-col gap-3 px-4 py-12">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-2/3" />
      </article>
    </div>
  );
}
