import { describe, expect, it } from 'vitest';

import { jsonLdScript, productJsonLd } from '@/lib/catalog/json-ld';
import type { ProductDetail } from '@/lib/catalog/mappers';

const image = (path: string, position: number) => ({
  path,
  url: `https://cdn.test/${path}`,
  alt: null,
  position,
});

const variant = (id: string, priceMinor: number, inStock: boolean) => ({
  id,
  sku: `SKU-${id}`,
  title: id,
  basePriceMinor: priceMinor,
  priceMinor,
  price: 'x',
  compareAtPrice: null,
  inStock,
});

function product(overrides: Partial<ProductDetail> = {}): ProductDetail {
  return {
    handle: 'abib-hand-creme',
    name: 'كريم اليد',
    brand: { slug: 'abib', name: 'Abib' },
    brandName: 'Abib',
    basePriceMinor: 6400,
    priceMinor: 6400,
    price: 'x',
    compareAtPrice: null,
    inStock: true,
    image: image('a.jpg', 0),
    description: 'وصف المنتج',
    images: [image('a.jpg', 0), image('b.jpg', 1)],
    variants: [variant('one', 6400, true)],
    ...overrides,
  };
}

const omr = {
  url: 'https://jannati.test/ar-om/products/abib-hand-creme',
  currency: 'OMR' as const,
  currencyExponent: 3,
};

describe('productJsonLd', () => {
  it('describes the product with its resolved name, description and images', () => {
    const data = productJsonLd(product(), omr);

    expect(data['@context']).toBe('https://schema.org');
    expect(data['@type']).toBe('Product');
    expect(data.name).toBe('كريم اليد');
    expect(data.description).toBe('وصف المنتج');
    expect(data.image).toEqual(['https://cdn.test/a.jpg', 'https://cdn.test/b.jpg']);
    expect(data.brand).toEqual({ '@type': 'Brand', name: 'Abib' });
  });

  it('prices a single-variant product as one offer in the country currency', () => {
    const data = productJsonLd(product(), omr);

    expect(data.offers).toEqual({
      '@type': 'Offer',
      url: omr.url,
      price: '6.400',
      priceCurrency: 'OMR',
      availability: 'https://schema.org/InStock',
      sku: 'SKU-one',
    });
  });

  it('uses the currency exponent of the active country, not OMR', () => {
    const data = productJsonLd(product({ variants: [variant('one', 6125, true)] }), {
      url: omr.url,
      currency: 'AED',
      currencyExponent: 2,
    });

    expect((data.offers as { price: string }).price).toBe('61.25');
    expect((data.offers as { priceCurrency: string }).priceCurrency).toBe('AED');
  });

  it('marks a product out of stock when no variant has stock', () => {
    const data = productJsonLd(
      product({ variants: [variant('one', 6400, false)], inStock: false }),
      omr,
    );

    expect((data.offers as { availability: string }).availability).toBe(
      'https://schema.org/OutOfStock',
    );
  });

  it('emits an AggregateOffer spanning the price range of several variants', () => {
    const data = productJsonLd(
      product({
        variants: [
          variant('one', 6400, false),
          variant('two', 4500, true),
          variant('three', 9000, false),
        ],
      }),
      omr,
    );

    expect(data.offers).toEqual({
      '@type': 'AggregateOffer',
      url: omr.url,
      lowPrice: '4.500',
      highPrice: '9.000',
      priceCurrency: 'OMR',
      offerCount: 3,
      availability: 'https://schema.org/InStock',
    });
  });

  it('omits keys with nothing behind them rather than emitting nulls', () => {
    const data = productJsonLd(
      product({ description: null, brand: null, brandName: null, images: [] }),
      omr,
    );

    expect(data).not.toHaveProperty('description');
    expect(data).not.toHaveProperty('brand');
    expect(data).not.toHaveProperty('image');
  });

  it('drops the offers entirely for a product with no variants', () => {
    const data = productJsonLd(product({ variants: [], inStock: false }), omr);

    expect(data).not.toHaveProperty('offers');
  });

  it('collapses an equal-priced range to the same low and high price', () => {
    const data = productJsonLd(
      product({ variants: [variant('one', 6400, true), variant('two', 6400, true)] }),
      omr,
    );

    expect(data.offers).toMatchObject({ lowPrice: '6.400', highPrice: '6.400' });
  });

  it('prices a zero-exponent currency without a decimal point', () => {
    const data = productJsonLd(product({ variants: [variant('one', 1660, true)] }), {
      url: omr.url,
      currency: 'JPY',
      currencyExponent: 0,
    });

    expect((data.offers as { price: string }).price).toBe('1660');
  });

  it('flattens description markup into plain text', () => {
    const data = productJsonLd(
      product({ description: '<p>Key&nbsp;benefits</p><ul><li>Hydrates</li></ul>' }),
      omr,
    );

    expect(data.description).toBe('Key benefits Hydrates');
  });
});

describe('jsonLdScript', () => {
  it('escapes markup so a product name cannot close the script element', () => {
    const data = productJsonLd(
      product({ name: 'Serum </script><img src=x onerror=alert(1)>' }),
      omr,
    );

    const script = jsonLdScript(data);

    expect(script).not.toContain('</script>');
    expect(script).not.toContain('<');
    expect(script).not.toContain('>');
    expect(script).not.toContain('&');
  });

  it('stays valid JSON with the original values intact after escaping', () => {
    const name = 'Serum </script> & <b>bold</b>';
    const parsed = JSON.parse(jsonLdScript(productJsonLd(product({ name }), omr))) as {
      name: string;
    };

    expect(parsed.name).toBe(name);
  });
});
