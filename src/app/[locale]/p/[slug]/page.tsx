import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { getPublishedContentPage } from '@/lib/admin/content-pages';
import { getSiteSettings } from '@/lib/admin/site-settings';
import { isLocale, parseLocale, type Locale } from '@/i18n/config';
import { localeAlternates } from '@/lib/seo/alternates';
import { createClient } from '@/lib/supabase/server';

/**
 * `terms-of-service`'s seeded body carries `{{legal_entity_name}}` /
 * `{{registration_number}}` tokens (see `scripts/seed/content-pages.ts`)
 * instead of a hardcoded company name, so the admin-editable
 * `site_settings` fields (Task 5) can fill them in without a reseed. Only
 * fetched for that one slug — every other content page has no tokens and
 * shouldn't pay for the extra query.
 */
async function applyLegalTokens(
  body: string,
  slug: string,
  language: 'ar' | 'en',
  client: Awaited<ReturnType<typeof createClient>>,
): Promise<string> {
  if (slug !== 'terms-of-service') return body;

  const settings = await getSiteSettings(client);
  const legalEntityName =
    (language === 'ar' ? settings.legal_entity_name_ar : settings.legal_entity_name_en) ||
    (language === 'ar' ? '[الاسم القانوني للشركة]' : '[legal entity name]');
  const registrationNumber =
    settings.registration_number ||
    (language === 'ar' ? '[رقم السجل التجاري]' : '[registration number]');

  return body
    .replaceAll('{{legal_entity_name}}', legalEntityName)
    .replaceAll('{{registration_number}}', registrationNumber);
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}): Promise<Metadata> {
  const { locale, slug } = await params;
  if (!isLocale(locale)) return {};

  const client = await createClient();
  const page = await getPublishedContentPage(client, slug);
  if (!page) return {};

  const { language } = parseLocale(locale);
  const title = (language === 'ar' ? page.title_ar : page.title_en) || page.title_ar;
  const body = (language === 'ar' ? page.body_ar : page.body_en) || page.body_ar;
  const resolvedBody = await applyLegalTokens(body, slug, language, client);

  return {
    title,
    description: resolvedBody.slice(0, 160),
    alternates: localeAlternates(locale, `/p/${slug}`),
  };
}

export default async function ContentPage({
  params,
}: {
  params: Promise<{ locale: Locale; slug: string }>;
}) {
  const { locale, slug } = await params;
  const client = await createClient();
  const page = await getPublishedContentPage(client, slug);
  if (!page) notFound();

  const { language } = parseLocale(locale);
  const title = (language === 'ar' ? page.title_ar : page.title_en) || page.title_ar;
  const body = (language === 'ar' ? page.body_ar : page.body_en) || page.body_ar;
  const resolvedBody = await applyLegalTokens(body, slug, language, client);

  return (
    <article className="mx-auto flex max-w-2xl flex-col gap-4 py-8">
      <h1 className="text-2xl font-semibold">{title}</h1>
      <div className="text-muted-foreground whitespace-pre-wrap">{resolvedBody}</div>
    </article>
  );
}
