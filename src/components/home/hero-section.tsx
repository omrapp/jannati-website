import { HeroCarousel, type HeroSlide } from '@/components/home/hero-carousel';
import { Button } from '@/components/ui/button';
import { parseLocale, type Locale } from '@/i18n/config';
import { Link } from '@/i18n/navigation';
import { listActiveBanners, publicBannerUrl } from '@/lib/admin/banners';
import { createClient } from '@/lib/supabase/server';

/**
 * Home hero, split out so it can sit in its own `<Suspense>` boundary.
 * `listActiveBanners` is cookie-bound (`createClient()`), so unlike the
 * catalog queries it can't go through `unstable_cache` — it was previously
 * awaited alongside 4 unrelated `listProducts`/`listBrands` calls in one
 * `Promise.all`, so the hero (the page's LCP element) waited on all five
 * before painting. Isolating it here lets it render as soon as its own
 * fetch resolves, independent of the rails and brand strip.
 */
export async function HeroSection({
  locale,
  heroTitle,
  heroSubtitle,
  shopNowLabel,
  exploreBrandsLabel,
}: {
  locale: Locale;
  heroTitle: string;
  heroSubtitle: string;
  shopNowLabel: string;
  exploreBrandsLabel: string;
}) {
  const { language } = parseLocale(locale);
  const banners = await listActiveBanners(await createClient());

  const slides: HeroSlide[] = banners.map((banner) => ({
    id: banner.id,
    src: publicBannerUrl(banner.image_path),
    alt: (language === 'ar' ? banner.title_ar : banner.title_en) ?? heroTitle,
    link: banner.link,
  }));

  if (slides.length > 0) {
    return <HeroCarousel slides={slides} />;
  }

  return (
    <section className="from-secondary/60 to-background -mx-4 bg-gradient-to-b md:mx-0 md:rounded-lg">
      <div className="mx-auto flex max-w-7xl flex-col items-start gap-6 px-4 py-20 md:py-28">
        <h1 className="font-display max-w-2xl text-4xl font-semibold text-balance md:text-6xl">
          {heroTitle}
        </h1>
        <p className="text-muted-foreground max-w-xl text-lg">{heroSubtitle}</p>
        <div className="flex flex-wrap gap-3">
          <Button size="lg" asChild>
            <Link href="/products">{shopNowLabel}</Link>
          </Button>
          <Button size="lg" variant="outline" asChild>
            <Link href="/brands">{exploreBrandsLabel}</Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
