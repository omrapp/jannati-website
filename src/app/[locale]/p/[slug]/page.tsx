import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { getPublishedContentPage } from '@/lib/admin/content-pages';
import { isLocale, parseLocale, type Locale } from '@/i18n/config';
import { localeAlternates } from '@/lib/seo/alternates';
import { createClient } from '@/lib/supabase/server';

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

  return {
    title,
    description: body.slice(0, 160),
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

  return (
    <article className="mx-auto flex max-w-2xl flex-col gap-4 py-8">
      <h1 className="text-2xl font-semibold">{title}</h1>
      <div className="whitespace-pre-wrap text-muted-foreground">{body}</div>
    </article>
  );
}
