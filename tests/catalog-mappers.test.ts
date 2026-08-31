import { describe, expect, it } from 'vitest';

import {
  publicImageUrl,
  toBrandSummary,
  toCategorySummary,
  toCountryPricing,
  toProductDetail,
  toProductSummary,
  type BrandJoin,
  type CategoryJoin,
  type CountryRow,
  type ProductJoin,
} from '@/lib/catalog/mappers';

/**
 * Intl puts a non-breaking space between the currency and the amount, and adds
 * direction marks around Arabic prices. Neither is worth pinning in an
 * assertion — `tests/money.test.ts` covers the formatting itself.
 */
function plain(value: string | null): string | null {
  return value?.replace(/[ ‎‏]/g, ' ').trim() ?? null;
}

const om: CountryRow = {
  code: 'om',
  currency: 'OMR',
  currency_exponent: 3,
  fx_rate_from_omr: 1,
  rounding_step_minor: 1,
};

const ae: CountryRow = {
  code: 'ae',
  currency: 'AED',
  currency_exponent: 2,
  fx_rate_from_omr: 9.55,
  rounding_step_minor: 25,
};

function row(overrides: Partial<ProductJoin> = {}): ProductJoin {
  return {
    id: 'a1c1a1c1-0000-0000-0000-000000000001',
    handle: 'abib-hand-creme',
    name_ar: 'كريم اليد',
    name_en: 'Abib Hand Creme',
    description_ar: 'وصف عربي',
    description_en: 'English copy',
    brands: { slug: 'abib', name_en: 'Abib', name_ar: 'أبيب', logo_path: null },
    product_variants: [
      {
        id: 'v1',
        sku: 'AB-01',
        title_ar: null,
        title_en: null,
        base_price_minor: 6400,
        compare_at_minor: 8000,
        stock_qty: 3,
        position: 1,
      },
    ],
    product_images: [
      { storage_path: 'abib-hand-creme/01-a.webp', alt_ar: 'كريم', alt_en: null, position: 1 },
    ],
    ...overrides,
  };
}

describe('toCountryPricing', () => {
  it('narrows a country row to the fields the money functions need', () => {
    expect(toCountryPricing(ae)).toEqual({
      code: 'ae',
      currency: 'AED',
      currencyExponent: 2,
      fxRateFromOmr: 9.55,
      roundingStepMinor: 25,
    });
  });
});

describe('toProductSummary', () => {
  it('reads Arabic fields for an Arabic locale', () => {
    const summary = toProductSummary(row(), om, 'ar-om');

    expect(summary.name).toBe('كريم اليد');
    expect(summary.brandName).toBe('أبيب');
  });

  it('reads English fields for an English locale', () => {
    expect(toProductSummary(row(), om, 'en-om').name).toBe('Abib Hand Creme');
  });

  it('falls back to Arabic when a product has no English copy yet', () => {
    // 958 of 1025 products are in this state until the translation pass runs.
    const summary = toProductSummary(row({ name_en: null }), om, 'en-om');

    expect(summary.name).toBe('كريم اليد');
  });

  it('prices in the local currency with that currency decimal places', () => {
    const summary = toProductSummary(row(), ae, 'en-ae');

    // 6.400 OMR at 9.55 rounded up to the next 25 fils.
    expect(plain(summary.price)).toBe('AED 61.25');
    expect(summary.priceMinor).toBe(6125);
  });

  it('keeps the base price in baisa so callers never re-derive it', () => {
    expect(toProductSummary(row(), om, 'ar-om').basePriceMinor).toBe(6400);
  });

  it('shows a compare-at price only while it is above the price', () => {
    expect(plain(toProductSummary(row(), om, 'en-om').compareAtPrice)).toBe('OMR 8.000');
    expect(toProductSummary(row({ product_variants: [] }), om, 'ar-om').compareAtPrice).toBeNull();
  });

  it('prices from the first variant when a product has several', () => {
    const many = row({
      product_variants: [
        { ...row().product_variants[0], position: 2, base_price_minor: 9000, id: 'v2' },
        { ...row().product_variants[0], position: 1 },
      ],
    });

    expect(toProductSummary(many, om, 'ar-om').basePriceMinor).toBe(6400);
  });

  it('is out of stock only when every variant is', () => {
    const empty = row({
      product_variants: [{ ...row().product_variants[0], stock_qty: 0 }],
    });

    expect(toProductSummary(row(), om, 'ar-om').inStock).toBe(true);
    expect(toProductSummary(empty, om, 'ar-om').inStock).toBe(false);
  });

  it('carries the first image, and copes with a product that has none', () => {
    expect(toProductSummary(row(), om, 'ar-om').image?.path).toBe('abib-hand-creme/01-a.webp');
    expect(toProductSummary(row({ product_images: [] }), om, 'ar-om').image).toBeNull();
  });

  it('leaves a product without variants priceless rather than free', () => {
    // A zero price would be sellable; null tells the storefront to hide it.
    const summary = toProductSummary(row({ product_variants: [] }), om, 'ar-om');

    expect(summary.basePriceMinor).toBeNull();
    expect(summary.price).toBeNull();
  });
});

describe('toProductDetail', () => {
  it('adds the description and every image and variant', () => {
    const detail = toProductDetail(row(), ae, 'en-ae');

    expect(detail.description).toBe('English copy');
    expect(detail.images).toHaveLength(1);
    expect(detail.variants).toHaveLength(1);
    expect({ ...detail.variants[0], price: plain(detail.variants[0].price) }).toEqual({
      id: 'v1',
      sku: 'AB-01',
      title: null,
      basePriceMinor: 6400,
      priceMinor: 6125,
      price: 'AED 61.25',
      compareAtPrice: detail.variants[0].compareAtPrice,
      inStock: true,
    });
    expect(plain(detail.variants[0].compareAtPrice)).toBe('AED 76.50');
  });

  it('orders images and variants by position, whatever the query returned', () => {
    const shuffled = row({
      product_images: [
        { storage_path: 'b.webp', alt_ar: null, alt_en: null, position: 2 },
        { storage_path: 'a.webp', alt_ar: null, alt_en: null, position: 1 },
      ],
    });

    expect(toProductDetail(shuffled, om, 'ar-om').images.map((image) => image.path)).toEqual([
      'a.webp',
      'b.webp',
    ]);
  });
});

describe('toBrandSummary and toCategorySummary', () => {
  const brand: BrandJoin = {
    slug: 'abib',
    name_en: 'Abib',
    name_ar: 'أبيب',
    logo_path: 'brands/abib.png',
  };

  it('resolves the brand name for the locale and keeps the slug', () => {
    expect(toBrandSummary(brand, 'ar-om')).toEqual({
      slug: 'abib',
      name: 'أبيب',
      logoUrl: publicImageUrl('brands/abib.png'),
    });
  });

  it('falls back to the English brand name, which is always present', () => {
    expect(toBrandSummary({ ...brand, name_ar: null }, 'ar-om').name).toBe('Abib');
  });

  it('resolves a category name for the locale', () => {
    const category: CategoryJoin = {
      id: 'cat-1',
      slug: 'hand-care',
      parent_id: null,
      name_ar: 'العناية باليدين',
      name_en: null,
      image_path: null,
    };

    expect(toCategorySummary(category, 'en-om')).toEqual({
      id: 'cat-1',
      slug: 'hand-care',
      parentId: null,
      name: 'العناية باليدين',
      imageUrl: null,
    });
  });
});
