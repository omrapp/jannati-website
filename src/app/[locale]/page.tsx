import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';

import { BrandStrip } from '@/components/home/brand-strip';
import { CategoryGrid } from '@/components/home/category-grid';
import { HeroCarousel, type HeroSlide } from '@/components/home/hero-carousel';
import { NewsletterStrip } from '@/components/home/newsletter-strip';
import { ProductRail } from '@/components/home/product-rail';
import { Button } from '@/components/ui/button';
import { Reveal } from '@/components/ui/reveal';
import { isLocale, parseLocale, type Locale } from '@/i18n/config';
import { Link } from '@/i18n/navigation';
import { listActiveBanners, publicBannerUrl } from '@/lib/admin/banners';
import { listBrands, listCategories, listProducts } from '@/lib/catalog/queries';
import { localeAlternates } from '@/lib/seo/alternates';
import { createClient } from '@/lib/supabase/server';

const RAIL_SIZE = 8;
const BRAND_STRIP_SIZE = 20;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};

  // Title/description fall through to the layout default ("Jannati — The
  // World of Beauty in One Place"), already the right copy for the home page.
  return { alternates: localeAlternates(locale, '') };
}

export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  setRequestLocale(locale);
  const t = await getTranslations('home');
  const { language } = parseLocale(locale as Locale);

  const [banners, newArrivals, bestSellers, recommended, categories, brands] = await Promise.all([
    listActiveBanners(await createClient()),
    listProducts({ locale: locale as Locale, sort: 'new', pageSize: RAIL_SIZE }),
    listProducts({ locale: locale as Locale, sort: 'best-selling', pageSize: RAIL_SIZE }),
    // No recommendation engine yet — a curated pull is just "the next page
    // of the default (newest-first) listing", so it doesn't repeat New
    // Arrivals' first page.
    listProducts({ locale: locale as Locale, page: 2, pageSize: RAIL_SIZE }),
    listCategories(locale as Locale),
    listBrands(locale as Locale),
  ]);

  // Home strip is a teaser, not the full directory — cap it and only show
  // brands with a logo (a name-only tile reads as a placeholder at a glance);
  // the "view all" link below takes shoppers to `/brands` for the rest.
  const brandsWithLogos = brands
    .filter((brand) => brand.logoUrl !== null)
    .slice(0, BRAND_STRIP_SIZE);

  const slides: HeroSlide[] = banners.map((banner) => ({
    id: banner.id,
    src: publicBannerUrl(banner.image_path),
    alt: (language === 'ar' ? banner.title_ar : banner.title_en) ?? t('heroTitle'),
    link: banner.link,
  }));

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-16 px-4 py-10 md:py-14">
      {slides.length > 0 ? (
        <HeroCarousel slides={slides} />
      ) : (
        <section className="from-secondary/60 to-background -mx-4 bg-gradient-to-b md:mx-0 md:rounded-lg">
          <div className="mx-auto flex max-w-7xl flex-col items-start gap-6 px-4 py-20 md:py-28">
            <h1 className="font-display max-w-2xl text-4xl font-semibold text-balance md:text-6xl">
              {t('heroTitle')}
            </h1>
            <p className="text-muted-foreground max-w-xl text-lg">{t('heroSubtitle')}</p>
            <div className="flex flex-wrap gap-3">
              <Button size="lg" asChild>
                <Link href="/products">{t('shopNow')}</Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link href="/brands">{t('exploreBrands')}</Link>
              </Button>
            </div>
          </div>
        </section>
      )}

      <Reveal>
        <ProductRail
          heading={t('newArrivals')}
          viewAllHref="/products?sort=new"
          viewAllLabel={t('viewAll')}
          products={newArrivals.items}
        />
      </Reveal>

      <Reveal>
        <CategoryGrid heading={t('shopByCategory')} categories={categories} />
      </Reveal>

      <Reveal>
        <ProductRail
          heading={t('recommended')}
          viewAllHref="/products"
          viewAllLabel={t('viewAll')}
          products={recommended.items}
        />
      </Reveal>

      <Reveal>
        <ProductRail
          heading={t('bestSellers')}
          viewAllHref="/products?sort=best-selling"
          viewAllLabel={t('viewAll')}
          products={bestSellers.items}
        />
      </Reveal>

      <Reveal>
        <BrandStrip
          heading={t('shopByBrand')}
          viewAllHref="/brands"
          viewAllLabel={t('viewAll')}
          brands={brandsWithLogos}
        />
      </Reveal>

      <Reveal>
        <NewsletterStrip
          title={t('newsletterTitle')}
          subtitle={t('newsletterSubtitle')}
          placeholder={t('newsletterPlaceholder')}
          comingSoon={t('newsletterComingSoon')}
        />
      </Reveal>
    </div>
  );
}
