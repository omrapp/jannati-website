/**
 * Product structured data for search engines.
 *
 * Google reads the price as a plain decimal in the offer's own currency, so the
 * numbers here come from the already-converted variant prices rather than the
 * OMR base — a shopper on `/en-ae` and the rich result they clicked have to
 * agree. Kept pure and tested because a malformed offer costs the listing
 * silently: nothing breaks on screen, the product just stops being eligible.
 */

import { minorToDecimalString } from '@/lib/commerce/money';

import type { ProductDetail } from './mappers';
import { stripHtml } from './text';

const IN_STOCK = 'https://schema.org/InStock';
const OUT_OF_STOCK = 'https://schema.org/OutOfStock';

/**
 * `JSON.stringify` leaves `<` alone, so a product name containing a closing
 * script tag would end the element and inject markup into the page. Escaping
 * the characters that can open a tag or an entity keeps the JSON valid — a
 * parser reads `<` as `<` — while making the string inert in HTML.
 * U+2028 and U+2029 are legal in JSON but terminate a JavaScript line.
 */
export function jsonLdScript(data: Record<string, unknown>): string {
  return JSON.stringify(data).replace(
    /[<>&\u2028\u2029]/g,
    (character) => `\\u${character.charCodeAt(0).toString(16).padStart(4, '0')}`,
  );
}

export type JsonLdOptions = {
  /** Canonical URL of this product in the active locale. */
  url: string;
  currency: string;
  currencyExponent: number;
};

export function productJsonLd(
  product: ProductDetail,
  options: JsonLdOptions,
): Record<string, unknown> {
  const { url, currency, currencyExponent } = options;
  const price = (minor: number) => minorToDecimalString(minor, currencyExponent);
  const availability = product.variants.some((variant) => variant.inStock)
    ? IN_STOCK
    : OUT_OF_STOCK;

  const data: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    url,
  };

  // Absent is not the same as null here: an empty key is a validation warning,
  // and most of the catalog has no English copy yet. The description is
  // flattened to plain text — schema.org wants text, and the seeded copy
  // carries scrape debris.
  if (product.description) data.description = stripHtml(product.description);
  if (product.brand) data.brand = { '@type': 'Brand', name: product.brand.name };
  if (product.images.length > 0) data.image = product.images.map((image) => image.url);

  const [lead] = product.variants;

  if (!lead) return data;

  if (product.variants.length === 1) {
    data.offers = {
      '@type': 'Offer',
      url,
      price: price(lead.priceMinor),
      priceCurrency: currency,
      availability,
      ...(lead.sku ? { sku: lead.sku } : {}),
    };

    return data;
  }

  const prices = product.variants.map((variant) => variant.priceMinor);

  data.offers = {
    '@type': 'AggregateOffer',
    url,
    lowPrice: price(Math.min(...prices)),
    highPrice: price(Math.max(...prices)),
    priceCurrency: currency,
    offerCount: product.variants.length,
    availability,
  };

  return data;
}
