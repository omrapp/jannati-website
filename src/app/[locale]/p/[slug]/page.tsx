import type { Metadata } from 'next';
import Image from 'next/image';
import { notFound } from 'next/navigation';

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { getPublishedContentPage } from '@/lib/admin/content-pages';
import { getSiteSettings } from '@/lib/admin/site-settings';
import { isLocale, parseLocale, type Locale } from '@/i18n/config';
import { parseQaPairs, QA_SLUGS } from '@/lib/content/qa';
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
    <div className="flex flex-col">
      {page.hero_image_url ? (
        <div className="relative h-[260px] w-full overflow-hidden sm:h-[340px] md:h-[420px]">
          <Image
            src={page.hero_image_url}
            alt={title}
            fill
            priority
            sizes="100vw"
            className="object-cover"
          />
          <div className="from-background/90 via-background/30 absolute inset-0 bg-gradient-to-t to-transparent" />
          <div className="absolute inset-0 flex items-end">
            <div className="mx-auto flex w-full max-w-2xl flex-col gap-3 px-4 pb-10">
              <span className="bg-primary h-1 w-14 rounded-full" />
              <h1 className="font-display text-3xl font-semibold md:text-5xl">{title}</h1>
            </div>
          </div>
        </div>
      ) : (
        <div className="mx-auto flex w-full max-w-2xl flex-col items-center gap-3 px-4 pt-16 pb-4 text-center">
          <span className="bg-primary h-1 w-14 rounded-full" />
          <h1 className="font-display text-3xl font-semibold md:text-4xl">{title}</h1>
        </div>
      )}

      {QA_SLUGS.has(slug) ? (
        <article className="mx-auto flex w-full max-w-3xl flex-col px-4 py-12">
          <Accordion type="multiple" className="flex flex-col">
            {parseQaPairs(resolvedBody).map((pair, index) => (
              // Body content, not a stable id — the question text itself is
              // the only thing that identifies a pair here.
              <AccordionItem key={index} value={String(index)}>
                <AccordionTrigger>{pair.question}</AccordionTrigger>
                <AccordionContent className="whitespace-pre-wrap">{pair.answer}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </article>
      ) : (
        <article className="mx-auto flex w-full max-w-2xl flex-col gap-4 px-4 py-12">
          <div className="text-muted-foreground text-base leading-relaxed whitespace-pre-wrap">
            {resolvedBody}
          </div>
        </article>
      )}
    </div>
  );
}
