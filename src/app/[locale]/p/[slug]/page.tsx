import { notFound } from 'next/navigation';

import { getPublishedContentPage } from '@/lib/admin/content-pages';
import { parseLocale, type Locale } from '@/i18n/config';
import { createClient } from '@/lib/supabase/server';

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
