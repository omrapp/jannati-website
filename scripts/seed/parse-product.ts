/**
 * Parses one scraped darbeauty product page.
 *
 * Every page embeds the full Shopify product object in an inline script — the
 * richest source available, carrying variants, stock, compare-at prices, tags
 * and the image list in one payload. Two themes are in play: one assigns it
 * directly (`this.product = {...}`), the other wraps it
 * (`JSON.parse(JSON.stringify({...}))`). Rather than match either wrapper, this
 * locates the object by a field only the product payload has and decodes from
 * its opening brace, which covers both.
 *
 * Reads only. Nothing here writes to `darbeauty.com/`.
 */

import type { ParsedImage, ParsedProduct, ParsedVariant } from './types.ts';

/** A field present in the product payload and nowhere else on the page. */
const PAYLOAD_MARKER = '"compare_at_price_varies"';
const OBJECT_START = '{"id"';

/**
 * Shopify serialises money as two-decimal minor units whatever the currency, so
 * 6.400 OMR arrives as `640`. OMR has three decimals, hence the factor of ten.
 */
const SHOPIFY_TO_BAISA = 10;

type ShopifyVariant = {
  id: number;
  sku?: string | null;
  barcode?: string | null;
  public_title?: string | null;
  title?: string | null;
  price: number;
  compare_at_price?: number | null;
  available?: boolean;
  featured_image?: { src?: string } | string | null;
};

type ShopifyProduct = {
  id: number;
  handle: string;
  title: string;
  description?: string | null;
  content?: string | null;
  vendor?: string | null;
  type?: string | null;
  tags?: string[];
  published_at?: string | null;
  variants: ShopifyVariant[];
  images?: string[];
};

export class ProductParseError extends Error {}

/** Strips the CDN query string the scrape preserves in local filenames. */
export function imageFileName(url: string): string {
  const withoutQuery = url.split('?')[0];

  return withoutQuery.slice(withoutQuery.lastIndexOf('/') + 1);
}

function imageFolder(url: string): ParsedImage['folder'] {
  return url.includes('/cdn/shop/products/') ? 'products' : 'files';
}

/**
 * Shopify money field -> OMR baisa.
 *
 * Anything that is not a finite number fails the page. Left unchecked it would
 * become `NaN`, which `JSON.stringify` writes as `null` — a free product in the
 * catalogue with nothing in `failures` to say so.
 */
function toBaisa(shopifyMinor: unknown, field: string): number {
  if (typeof shopifyMinor !== 'number' || !Number.isFinite(shopifyMinor)) {
    throw new ProductParseError(`variant ${field} is not a number: ${String(shopifyMinor)}`);
  }

  return Math.round(shopifyMinor) * SHOPIFY_TO_BAISA;
}

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Pulls the embedded Shopify product object out of the page, or throws. */
function extractPayload(html: string): ShopifyProduct {
  const marker = html.indexOf(PAYLOAD_MARKER);
  const start = marker >= 0 ? html.lastIndexOf(OBJECT_START, marker) : html.indexOf(OBJECT_START);

  if (start < 0) {
    throw new ProductParseError('no product json found on the page');
  }

  // The object is followed by the rest of the script, so the JSON has to be
  // decoded by walking braces rather than by matching to the end of the tag.
  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let i = start; i < html.length; i += 1) {
    const char = html[i];

    if (escaped) {
      escaped = false;
      continue;
    }
    if (char === '\\') {
      escaped = true;
      continue;
    }
    if (char === '"') {
      inString = !inString;
      continue;
    }
    if (inString) continue;

    if (char === '{') depth += 1;
    if (char === '}') {
      depth -= 1;

      if (depth === 0) {
        const raw = html.slice(start, i + 1);

        try {
          return JSON.parse(raw) as ShopifyProduct;
        } catch (error) {
          throw new ProductParseError(
            `product json did not parse: ${(error as Error).message.slice(0, 80)}`,
          );
        }
      }
    }
  }

  throw new ProductParseError('product json was truncated');
}

/**
 * Gallery images in display order.
 *
 * `data-media-id` blocks give the gallery as the shopper sees it, and the
 * payload's `images` array covers pages whose gallery markup differs. Variant
 * images are appended so shade photography is not lost.
 */
function collectImages(html: string, payload: ShopifyProduct): ParsedImage[] {
  const ordered: string[] = [];

  for (const match of html.matchAll(/data-media-id="\d+"[\s\S]{0,900}?src="([^"]+)"/g)) {
    ordered.push(match[1]);
  }

  ordered.push(...(payload.images ?? []));

  for (const variant of payload.variants) {
    const image = variant.featured_image;
    const src = typeof image === 'string' ? image : image?.src;

    if (src) ordered.push(src);
  }

  const seen = new Set<string>();
  const images: ParsedImage[] = [];

  for (const url of ordered) {
    const file = imageFileName(url);
    const folder = imageFolder(url);
    // Keyed on folder too: `files/a.webp` and `products/a.webp` are different
    // assets, and deduping on the name alone would drop one of them.
    const key = `${folder}/${file}`;

    if (!file || seen.has(key)) continue;
    seen.add(key);
    images.push({ file, folder, position: images.length + 1 });
  }

  return images;
}

function parseVariants(payload: ShopifyProduct): ParsedVariant[] {
  return payload.variants.map((variant, index) => ({
    sourceId: variant.id,
    sku: variant.sku?.trim() || null,
    barcode: variant.barcode?.trim() || null,
    titleAr: variant.public_title?.trim() || null,
    basePriceMinor: toBaisa(variant.price, 'price'),
    compareAtMinor:
      variant.compare_at_price != null && variant.compare_at_price > variant.price
        ? toBaisa(variant.compare_at_price, 'compare_at_price')
        : null,
    inStock: variant.available === true,
    position: index + 1,
  }));
}

/** Parses an Arabic storefront product page. Throws `ProductParseError`. */
export function parseProductPage(html: string): ParsedProduct {
  const payload = extractPayload(html);

  if (!payload.handle || !payload.variants?.length) {
    throw new ProductParseError('product json is missing a handle or variants');
  }

  return {
    handle: payload.handle,
    nameAr: payload.title.trim(),
    nameEn: null,
    descriptionAr: stripHtml(payload.description ?? payload.content ?? ''),
    descriptionEn: null,
    vendor: payload.vendor?.trim() || null,
    typeAr: payload.type?.trim() || null,
    tags: payload.tags ?? [],
    publishedAt: payload.published_at ?? null,
    variants: parseVariants(payload),
    images: collectImages(html, payload),
    categorySlugs: [],
    brandSlug: null,
  };
}

/**
 * Parses an English storefront page. Only 67 of these exist, so a page that
 * cannot be read is unremarkable — the translation step fills the gap.
 */
export function parseEnglishProductPage(
  html: string,
): { handle: string; nameEn: string; descriptionEn: string } | null {
  let payload: ShopifyProduct;

  try {
    payload = extractPayload(html);
  } catch {
    return null;
  }

  if (!payload.handle || !payload.title) return null;

  return {
    handle: payload.handle,
    nameEn: payload.title.trim(),
    descriptionEn: stripHtml(payload.description ?? payload.content ?? ''),
  };
}
