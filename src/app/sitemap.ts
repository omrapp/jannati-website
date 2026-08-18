import type { MetadataRoute } from 'next';

import { defaultLocale, locales } from '@/i18n/config';
import { listContentPages } from '@/lib/admin/content-pages';
import { listCategories, listProducts } from '@/lib/catalog/queries';
import { env } from '@/lib/env';
import { createClient } from '@/lib/supabase/server';

/**
 * Handles and slugs aren't translated per locale — one lookup in the
 * default locale is enough to learn every URL that needs an entry per
 * locale below. `listProducts`'s `pageSize` is capped at 60 (see
 * `queries.ts`), so this pages through rather than asking for everything
 * in one call.
 */
async function listAllProductHandles(): Promise<string[]> {
  const handles: string[] = [];
  let page = 1;
  let pageCount = 1;

  do {
    const result = await listProducts({ locale: defaultLocale, page, pageSize: 60 });
    handles.push(...result.items.map((item) => item.handle));
    pageCount = result.pageCount;
    page += 1;
  } while (page <= pageCount);

  return handles;
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [handles, categories, supabase] = await Promise.all([
    listAllProductHandles(),
    listCategories(defaultLocale),
    createClient(),
  ]);

  const contentPages = await listContentPages(supabase);
  const publishedSlugs = contentPages.filter((page) => page.published).map((page) => page.slug);

  const paths = [
    '',
    ...handles.map((handle) => `/products/${encodeURIComponent(handle)}`),
    ...categories.map((category) => `/collections/${category.slug}`),
    ...publishedSlugs.map((slug) => `/p/${slug}`),
  ];

  return paths.flatMap((path) => locales.map((locale) => ({ url: `${env.siteUrl}/${locale}${path}` })));
}
