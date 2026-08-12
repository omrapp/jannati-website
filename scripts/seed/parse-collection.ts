/**
 * Parses the scraped collection pages and the brands index.
 *
 * darbeauty makes no structural distinction between a brand and a category —
 * both are Shopify collections. The only reliable discriminator is
 * `pages/brands.html`: the ~104 collections it links to are brands, and every
 * other collection is a category.
 */

import { imageFileName } from './parse-product.ts';

export type ParsedCollectionPage = {
  nameAr: string;
  productHandles: string[];
  /** Highest `?page=N` this page links to; 1 when the collection fits on one. */
  lastPage: number;
};

export type ParsedBrandLink = {
  slug: string;
  nameEn: string;
  logoFile: string | null;
};

function collectionTitle(html: string): string {
  const match = html.match(/<title>([\s\S]*?)<\/title>/);
  const raw = match ? match[1] : '';

  // Titles carry the shop's SEO suffix: "منتجات أبيب (Abib) ... | داربيوتي".
  return raw.split('|')[0].replace(/\s+/g, ' ').trim();
}

export function parseCollectionPage(html: string): ParsedCollectionPage {
  const handles: string[] = [];
  const seen = new Set<string>();

  for (const match of html.matchAll(/href="\/products\/([a-z0-9-]+)"/g)) {
    if (seen.has(match[1])) continue;
    seen.add(match[1]);
    handles.push(match[1]);
  }

  let lastPage = 1;

  for (const match of html.matchAll(/href="\/collections\/[a-z0-9-]+\?page=(\d+)"/g)) {
    lastPage = Math.max(lastPage, Number(match[1]));
  }

  return { nameAr: collectionTitle(html), productHandles: handles, lastPage };
}

/**
 * Brands, in the order the index lists them.
 *
 * A brand is an anchor with `class="vendor-logo"`; its `title` is the brand's
 * English name, which appears nowhere else in the Arabic storefront. The page
 * also carries ordinary navigation links to category collections, so matching
 * on `/collections/` alone would classify half the categories as brands. Each
 * brand is listed twice — once under "trending", once in the A-Z grid.
 */
export function parseBrandsPage(html: string): ParsedBrandLink[] {
  const brands: ParsedBrandLink[] = [];
  const seen = new Set<string>();

  for (const match of html.matchAll(/<a\b([^>]*)>\s*(?:<img([^>]*)>)?/g)) {
    const anchor = match[1];

    if (!anchor.includes('vendor-logo')) continue;

    const slug = anchor.match(/href="\/collections\/([a-z0-9-]+)"/)?.[1];

    if (!slug || seen.has(slug)) continue;
    seen.add(slug);

    const img = match[2] ?? '';
    const title = anchor.match(/title="([^"]*)"/)?.[1]?.trim();
    const alt = img.match(/alt="([^"]*)"/)?.[1]?.trim();
    const src = img.match(/src="([^"]+)"/)?.[1];

    brands.push({
      slug,
      nameEn: title || alt || slug,
      logoFile: src ? imageFileName(src) : null,
    });
  }

  return brands;
}
