import { describe, expect, it } from 'vitest';

import { planUploads, storagePath, widestCopy } from '../scripts/seed/image-plan';
import type { ParsedProduct } from '../scripts/seed/types';

/** The scrape keeps every rendition as its own query-suffixed filename. */
const renditions = [
  'abib-hand_DarBeauty.webp?v=1764340237&width=200',
  'abib-hand_DarBeauty.webp?v=1764340237&width=1080',
  'abib-hand_DarBeauty.webp?v=1764340237&width=400',
  'other_DarBeauty.webp?v=1&width=300',
];

function product(overrides: Partial<ParsedProduct> = {}): ParsedProduct {
  return {
    handle: 'abib-hand-creme-type-g',
    nameAr: 'كريم',
    nameEn: null,
    descriptionAr: '',
    descriptionEn: null,
    vendor: 'Abib',
    typeAr: null,
    tags: [],
    publishedAt: null,
    variants: [],
    images: [{ file: 'abib-hand_DarBeauty.webp', folder: 'files', position: 1 }],
    categorySlugs: [],
    brandSlug: 'abib',
    ...overrides,
  };
}

describe('widestCopy', () => {
  it('picks the largest width for a base filename', () => {
    expect(widestCopy('abib-hand_DarBeauty.webp', renditions)).toBe(
      'abib-hand_DarBeauty.webp?v=1764340237&width=1080',
    );
  });

  it('accepts a copy carrying no width at all', () => {
    // A handful of assets were mirrored without the width parameter.
    expect(widestCopy('logo.png', ['logo.png'])).toBe('logo.png');
  });

  it('returns null when the scrape holds no copy of the file', () => {
    expect(widestCopy('missing.webp', renditions)).toBeNull();
  });
});

describe('storagePath', () => {
  it('derives a stable path from the product handle and image position', () => {
    expect(storagePath('abib-hand-creme-type-g', 2, 'abib-hand_DarBeauty.webp')).toBe(
      'abib-hand-creme-type-g/02-abib-hand_darbeauty.webp',
    );
  });

  it('strips characters that would need escaping in a storage key', () => {
    expect(storagePath('x', 1, 'a b&c(1).JPG')).toBe('x/01-a-b-c-1.jpg');
  });
});

describe('planUploads', () => {
  it('pairs every catalog image with the widest local copy', () => {
    const plan = planUploads([product()], { files: renditions, products: [] });

    expect(plan.missing).toEqual([]);
    expect(plan.uploads).toEqual([
      {
        handle: 'abib-hand-creme-type-g',
        position: 1,
        folder: 'files',
        localFile: 'abib-hand_DarBeauty.webp?v=1764340237&width=1080',
        storagePath: 'abib-hand-creme-type-g/01-abib-hand_darbeauty.webp',
      },
    ]);
  });

  it('reports images the scrape never mirrored instead of dropping them', () => {
    const orphan = product({
      images: [{ file: 'nowhere.webp', folder: 'products', position: 1 }],
    });
    const plan = planUploads([orphan], { files: renditions, products: [] });

    expect(plan.uploads).toEqual([]);
    expect(plan.missing).toEqual([
      { handle: 'abib-hand-creme-type-g', file: 'nowhere.webp', folder: 'products' },
    ]);
  });

  it('uploads a file shared by two products once per product path', () => {
    // Two products can reference the same asset; each still needs its own key
    // so deleting one product's imagery cannot blank the other's.
    const second = product({ handle: 'other-product' });
    const plan = planUploads([product(), second], { files: renditions, products: [] });

    expect(plan.uploads.map((upload) => upload.storagePath)).toEqual([
      'abib-hand-creme-type-g/01-abib-hand_darbeauty.webp',
      'other-product/01-abib-hand_darbeauty.webp',
    ]);
  });
});
