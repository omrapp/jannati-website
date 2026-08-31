import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { Suspense } from 'react';

import { BrandStripSection } from '@/components/home/brand-strip-section';
import { BrandStripSkeleton } from '@/components/home/brand-strip-skeleton';
import { HeroSection } from '@/components/home/hero-section';
import { HeroSkeleton } from '@/components/home/hero-skeleton';
import { NewsletterStrip } from '@/components/home/newsletter-strip';
import { ProductRailSection } from '@/components/home/product-rail-section';
import { ProductRailSkeleton } from '@/components/home/product-rail-skeleton';
import { PromoBanner } from '@/components/home/promo-banner';
import { isLocale, type Locale } from '@/i18n/config';
import { localeAlternates } from '@/lib/seo/alternates';

const RAIL_SIZE = 8;

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

  // Hero, each product rail, and the brand strip each carry their own data
  // fetch and their own `<Suspense>` boundary — previously all five awaited
  // together in one `Promise.all` before anything (including the hero, the
  // page's LCP element) could render. Splitting them lets the hero paint as
  // soon as its own fetch resolves, and lets the rails/brand strip stream in
  // independently rather than gating each other.
  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-16 px-4 py-10 md:py-14">
      <Suspense fallback={<HeroSkeleton />}>
        <HeroSection
          locale={locale as Locale}
          heroTitle={t('heroTitle')}
          heroSubtitle={t('heroSubtitle')}
          shopNowLabel={t('shopNow')}
          exploreBrandsLabel={t('exploreBrands')}
        />
      </Suspense>

      <Suspense fallback={<ProductRailSkeleton count={RAIL_SIZE} />}>
        <ProductRailSection
          locale={locale as Locale}
          sort="new"
          pageSize={RAIL_SIZE}
          heading={t('newArrivals')}
          viewAllHref="/products?sort=new"
          viewAllLabel={t('viewAll')}
          priority
        />
      </Suspense>

      <PromoBanner
        heading={t('promoNewHeading')}
        subheading={t('promoNewSubheading')}
        ctaLabel={t('promoNewCta')}
        ctaHref="/products?sort=new"
        tone="secondary"
      />

      <Suspense fallback={<ProductRailSkeleton count={RAIL_SIZE} />}>
        <ProductRailSection
          locale={locale as Locale}
          // No recommendation engine yet — a curated pull is just "the next
          // page of the default (newest-first) listing", so it doesn't
          // repeat New Arrivals' first page.
          page={2}
          pageSize={RAIL_SIZE}
          heading={t('recommended')}
          viewAllHref="/products"
          viewAllLabel={t('viewAll')}
        />
      </Suspense>

      <PromoBanner
        heading={t('promoCollectionsHeading')}
        subheading={t('promoCollectionsSubheading')}
        ctaLabel={t('promoCollectionsCta')}
        ctaHref="/collections"
        tone="primary"
      />

      <Suspense fallback={<ProductRailSkeleton count={RAIL_SIZE} />}>
        <ProductRailSection
          locale={locale as Locale}
          sort="best-selling"
          pageSize={RAIL_SIZE}
          heading={t('bestSellers')}
          viewAllHref="/products?sort=best-selling"
          viewAllLabel={t('viewAll')}
        />
      </Suspense>

      <Suspense fallback={<BrandStripSkeleton />}>
        <BrandStripSection
          locale={locale as Locale}
          heading={t('shopByBrand')}
          viewAllHref="/brands"
          viewAllLabel={t('viewAll')}
        />
      </Suspense>

      <NewsletterStrip
        title={t('newsletterTitle')}
        subtitle={t('newsletterSubtitle')}
        placeholder={t('newsletterPlaceholder')}
        comingSoon={t('newsletterComingSoon')}
      />
    </div>
  );
}
