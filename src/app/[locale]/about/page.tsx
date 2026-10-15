import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';

import { AboutHero } from '@/components/about/about-hero';
import { AboutJourney } from '@/components/about/about-journey';
import { AboutStory } from '@/components/about/about-story';
import { AboutTeam } from '@/components/about/about-team';
import { AboutValues } from '@/components/about/about-values';
import { PromoBanner } from '@/components/home/promo-banner';
import { isLocale } from '@/i18n/config';
import { localeAlternates } from '@/lib/seo/alternates';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const t = await getTranslations({ locale, namespace: 'about' });
  return {
    title: t('heading'),
    description: t('subheading'),
    alternates: localeAlternates(locale, '/about'),
  };
}

/**
 * Fully static — no `content_pages`/`site_settings` fetch, unlike
 * `/p/[slug]`. The generic CMS `about-us` page still exists at `/p/about-us`
 * for that slug's own sake, but the storefront's About nav link now points
 * here: a real, sectioned page (hero/stats, story, mission/vision/values,
 * journey, team, CTA) instead of a title+body article.
 */
export default async function AboutPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  setRequestLocale(locale);
  const t = await getTranslations('about');

  return (
    <div className="flex flex-col">
      <AboutHero
        heading={t('heading')}
        subheading={t('subheading')}
        stats={[
          { value: t('statYearsValue'), label: t('statYearsLabel') },
          { value: t('statCountriesValue'), label: t('statCountriesLabel') },
          { value: t('statAuthorizedValue'), label: t('statAuthorizedLabel') },
        ]}
      />

      <div className="mx-auto flex w-full max-w-6xl flex-col gap-24 px-4 py-20">
        <AboutStory
          heading={t('storyHeading')}
          body={t('storyBody')}
          quote={t('quote')}
          quoteAttribution={t('quoteAttribution')}
        />

        <AboutValues
          missionTitle={t('missionTitle')}
          missionBody={t('missionBody')}
          visionTitle={t('visionTitle')}
          visionBody={t('visionBody')}
          valuesTitle={t('valuesTitle')}
          valuesBody={t('valuesBody')}
          details={[
            { title: t('valueSourcingTitle'), description: t('valueSourcingDescription') },
            { title: t('valuePricingTitle'), description: t('valuePricingDescription') },
            { title: t('valueShippingTitle'), description: t('valueShippingDescription') },
            { title: t('valueSupportTitle'), description: t('valueSupportDescription') },
          ]}
        />

        <AboutJourney
          heading={t('journeyHeading')}
          subheading={t('journeySubheading')}
          steps={[
            { title: t('journeyDiscoverTitle'), description: t('journeyDiscoverDescription') },
            { title: t('journeyOrderTitle'), description: t('journeyOrderDescription') },
            { title: t('journeyShipTitle'), description: t('journeyShipDescription') },
            { title: t('journeySupportTitle'), description: t('journeySupportDescription') },
          ]}
        />

        <AboutTeam
          heading={t('teamHeading')}
          subheading={t('teamSubheading')}
          roles={[
            { title: t('teamSourcingTitle'), description: t('teamSourcingDescription') },
            { title: t('teamCareTitle'), description: t('teamCareDescription') },
            { title: t('teamLogisticsTitle'), description: t('teamLogisticsDescription') },
          ]}
        />

        <PromoBanner
          heading={t('ctaHeading')}
          subheading={t('ctaSubheading')}
          ctaLabel={t('ctaLabel')}
          ctaHref="/products"
          tone="primary"
        />
      </div>
    </div>
  );
}
