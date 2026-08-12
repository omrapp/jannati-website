import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { parseBrandsPage, parseCollectionPage } from '../scripts/seed/parse-collection';
import {
  imageFileName,
  parseEnglishProductPage,
  parseProductPage,
} from '../scripts/seed/parse-product';
import { brandSlug } from '../scripts/seed/slug';

const fixtures = join(dirname(fileURLToPath(import.meta.url)), 'fixtures');

function fixture(name: string): string {
  return readFileSync(join(fixtures, `${name}.html`), 'utf8');
}

describe('parseProductPage', () => {
  it('reads a single-variant product', () => {
    const product = parseProductPage(fixture('product-single-variant'));

    expect(product.handle).toBe('abib-hand-creme-type-g');
    expect(product.nameAr).toBe('كريم يدين تايب جي من أبيب – 50مل');
    expect(product.descriptionAr).toContain('كريم كوري');
    expect(product.vendor).toBe('Abib');
    expect(product.typeAr).toBe('كريم لليدين');
    expect(product.tags).toContain('hand cream');
  });

  it('converts Shopify two-decimal prices into OMR baisa', () => {
    // Shopify stores 6.400 OMR as 640 — its money fields are always
    // two-decimal, regardless of the currency's real exponent.
    const product = parseProductPage(fixture('product-single-variant'));

    expect(product.variants[0].basePriceMinor).toBe(6400);
    expect(product.variants[0].compareAtMinor).toBe(8000);
  });

  it('captures every variant with its own stock state', () => {
    const product = parseProductPage(fixture('product-multi-variant'));

    expect(product.variants).toHaveLength(2);
    expect(product.variants[0]).toMatchObject({
      sku: 'NON0101937',
      titleAr: 'MP01',
      basePriceMinor: 3360,
      compareAtMinor: 5000,
      inStock: false,
      position: 1,
    });
    expect(product.variants[1]).toMatchObject({
      sku: 'NON0205836',
      compareAtMinor: null,
      inStock: true,
      position: 2,
    });
  });

  it('collects gallery images in order, including variant images', () => {
    const single = parseProductPage(fixture('product-single-variant'));
    expect(single.images.map((image) => image.file)).toEqual([
      'abib-hand-creme-type-g_DarBeauty.webp',
      'abib-hand-creme-type-g_DarBeauty_03.webp',
    ]);

    const multi = parseProductPage(fixture('product-multi-variant'));
    expect(multi.images.map((image) => image.file)).toContain('LollisMP01-DarBeauty.jpg');
  });

  it('records the CDN folder each image lives in', () => {
    // The scrape splits imagery across cdn/shop/files and cdn/shop/products;
    // the uploader needs to know which folder to read from.
    expect(parseProductPage(fixture('product-single-variant')).images[0].folder).toBe('files');
    expect(parseProductPage(fixture('product-multi-variant')).images[0].folder).toBe('products');
  });

  it('throws a described error when a page carries no product payload', () => {
    expect(() => parseProductPage(fixture('product-unparseable'))).toThrowError(/no product json/i);
  });
});

describe('parseEnglishProductPage', () => {
  it('takes the English name and description', () => {
    const english = parseEnglishProductPage(fixture('product-english'));

    expect(english).toMatchObject({ handle: 'abib-hand-creme-type-g' });
    expect(english?.nameEn).toBe('Abib Hand Creme Type G - 50ml');
    expect(english?.descriptionEn).toContain('nourishing Korean hand cream');
  });

  it('returns null rather than throwing when the page has no payload', () => {
    expect(parseEnglishProductPage(fixture('product-unparseable'))).toBeNull();
  });
});

describe('parseCollectionPage', () => {
  it('reads the Arabic title and de-duplicates product handles', () => {
    const collection = parseCollectionPage(fixture('collection'));

    expect(collection.nameAr).toBe('لوشن الجسم');
    expect(collection.productHandles).toEqual([
      'acm-sedacalm-soothing-anti-itch-cream',
      'advanced-clinicals-collagen-body-cream',
    ]);
  });

  it('reports the highest paginated page it links to', () => {
    expect(parseCollectionPage(fixture('collection')).lastPage).toBe(2);
  });
});

describe('parseBrandsPage', () => {
  it('lists each brand once with its English name and logo', () => {
    const brands = parseBrandsPage(fixture('brands'));

    expect(brands).toHaveLength(2);
    expect(brands[0]).toMatchObject({ slug: 'abib', nameEn: 'Abib', logoFile: 'Abib.png' });
  });

  it('ignores navigation links to category collections', () => {
    // The page links to categories in its nav. Matching on `/collections/`
    // alone would file half the categories as brands.
    const slugs = parseBrandsPage(fixture('brands')).map((brand) => brand.slug);

    expect(slugs).not.toContain('body-lotion');
    expect(slugs).not.toContain('about');
  });
});

describe('imageFileName', () => {
  it('strips the CDN query string that the scrape keeps in filenames', () => {
    expect(imageFileName('//darbeauty.com/cdn/shop/files/a_b-c.webp?v=1&width=400')).toBe(
      'a_b-c.webp',
    );
  });
});

describe('brandSlug', () => {
  it('derives a collection-style slug from a vendor name', () => {
    expect(brandSlug('Abib')).toBe('abib');
    expect(brandSlug('AXIS-Y')).toBe('axis-y');
    expect(brandSlug('Dr. Jart+')).toBe('dr-jart');
  });

  it('returns null for a vendor with no sluggable characters', () => {
    // Arabic-only or punctuation-only vendors cannot produce a URL slug, and a
    // brand keyed on an empty string would collide across products.
    expect(brandSlug('—')).toBeNull();
    expect(brandSlug('أبيب')).toBeNull();
    expect(brandSlug('')).toBeNull();
  });
});

/** Minimal page carrying one inline variant, for the malformed-payload cases. */
function pageWithVariants(variants: string, images = '[]'): string {
  return `<html><body><script>this.product = {"id":1,"handle":"x","title":"منتج","vendor":"V","compare_at_price_varies":false,"images":${images},"variants":[${variants}]};</script></body></html>`;
}

describe('malformed payloads', () => {
  it('fails the page rather than emitting a variant with an unusable price', () => {
    // A NaN price would survive JSON.stringify as null and reach the loader as
    // a free product, with nothing recorded in `failures`.
    expect(() => parseProductPage(pageWithVariants('{"id":9,"available":true}'))).toThrowError(
      /price/i,
    );
    expect(() =>
      parseProductPage(pageWithVariants('{"id":9,"price":"640","available":true}')),
    ).toThrowError(/price/i);
  });

  it('keeps same-named files that live in different CDN folders', () => {
    const images =
      '["\\/\\/darbeauty.com\\/cdn\\/shop\\/files\\/a.webp","\\/\\/darbeauty.com\\/cdn\\/shop\\/products\\/a.webp"]';
    const product = parseProductPage(
      pageWithVariants('{"id":9,"price":640,"available":true}', images),
    );

    expect(product.images.map((image) => image.folder)).toEqual(['files', 'products']);
  });
});
