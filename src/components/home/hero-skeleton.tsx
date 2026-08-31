import { Skeleton } from '@/components/ui/skeleton';

/**
 * Streaming fallback for `HeroSection` while its own `listActiveBanners`
 * fetch resolves. Mirrors the no-banner fallback's gradient section and
 * `py-20 md:py-28` padding — the common case, and the one the confirmed
 * LCP measurement (3.91s, hero `<h1>`) came from — so swapping in the real
 * content doesn't shift layout. When banners *are* active the real
 * `HeroCarousel` renders at a different (shorter, `aspect-[16/9]`) height,
 * which still causes some shift — unavoidable without knowing banner state
 * ahead of the fetch.
 */
export function HeroSkeleton() {
  return (
    <section className="from-secondary/60 to-background -mx-4 bg-gradient-to-b md:mx-0 md:rounded-lg">
      <div className="mx-auto flex max-w-7xl flex-col items-start gap-6 px-4 py-20 md:py-28">
        <Skeleton className="h-10 w-3/4 max-w-2xl md:h-14 md:max-w-xl" />
        <Skeleton className="h-6 w-1/2 max-w-xl" />
        <div className="flex flex-wrap gap-3">
          <Skeleton className="h-11 w-32 rounded-md" />
          <Skeleton className="h-11 w-36 rounded-md" />
        </div>
      </div>
    </section>
  );
}
