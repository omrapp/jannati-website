import { describe, expect, it } from 'vitest';

import {
  brandRows,
  categoryRows,
  chunk,
  imageRows,
  membershipRows,
  nullDuplicateSkus,
  productRows,
  splitForUpsert,
  unsafeHandles,
  variantRows,
} from '../scripts/seed/load-plan';
import type { ParsedProduct } from '../scripts/seed/types';

function product(overrides: Partial<ParsedProduct> = {}): ParsedProduct {
  return {
    handle: 'abib-hand-creme',
    nameAr: 'كريم اليد',
    nameEn: null,
    descriptionAr: 'وصف',
    descriptionEn: null,
    vendor: 'Abib',
    typeAr: null,
    tags: ['hand', 'creme'],
    publishedAt: '2025-11-28T10:00:00Z',
    variants: [
      {
        sourceId: 1,
        sku: 'AB-01',
        barcode: null,
        titleAr: null,
        basePriceMinor: 6400,
        compareAtMinor: 8000,
        inStock: true,
        position: 1,
      },
    ],
    images: [
      { file: 'a.webp', folder: 'files', position: 1, storagePath: 'abib-hand-creme/01-a.webp' },
    ],
    categorySlugs: ['hand-care'],
    brandSlug: 'abib',
    ...overrides,
  };
}

describe('brandRows', () => {
  it('maps a brand to its table columns', () => {
    expect(
      brandRows([{ slug: 'abib', nameEn: 'Abib', nameAr: 'أبيب', logoFile: 'abib.png' }]),
    ).toEqual([{ slug: 'abib', name_en: 'Abib', name_ar: 'أبيب', logo_path: 'brands/abib.png' }]);
  });

  it('leaves the logo path null when the scrape held no logo', () => {
    expect(
      brandRows([{ slug: 'x', nameEn: 'X', nameAr: null, logoFile: null }])[0].logo_path,
    ).toBeNull();
  });
});

describe('categoryRows', () => {
  it('maps a category without carrying its product list into the row', () => {
    const rows = categoryRows([
      { slug: 'hand-care', nameAr: 'العناية باليدين', nameEn: null, productHandles: ['a', 'b'] },
    ]);

    expect(rows).toEqual([{ slug: 'hand-care', name_ar: 'العناية باليدين', name_en: null }]);
  });
});

describe('productRows', () => {
  it('resolves the brand slug to its id and seeds the product as active', () => {
    const [row] = productRows([product()], new Map([['abib', 'brand-uuid']]));

    expect(row).toEqual({
      handle: 'abib-hand-creme',
      brand_id: 'brand-uuid',
      name_ar: 'كريم اليد',
      name_en: null,
      description_ar: 'وصف',
      description_en: null,
      en_translation_status: 'missing',
      status: 'active',
      published_at: '2025-11-28T10:00:00Z',
      tags: ['hand', 'creme'],
    });
  });

  it('marks English copy as machine translated once it exists', () => {
    const [row] = productRows([product({ descriptionEn: 'A hand creme' })], new Map());

    expect(row.en_translation_status).toBe('machine');
  });

  it('keeps the product loadable when its brand is unknown', () => {
    const [row] = productRows([product({ brandSlug: 'nope' })], new Map());

    expect(row.brand_id).toBeNull();
  });
});

describe('variantRows', () => {
  it('maps price, stock and position for a product id', () => {
    expect(variantRows(product(), 'product-uuid')).toEqual([
      {
        product_id: 'product-uuid',
        sku: 'AB-01',
        barcode: null,
        title_ar: null,
        base_price_minor: 6400,
        compare_at_minor: 8000,
        stock_qty: 10,
        position: 1,
      },
    ]);
  });

  it('gives an out of stock variant a zero quantity', () => {
    const out = product({ variants: [{ ...product().variants[0], inStock: false }] });

    expect(variantRows(out, 'p')[0].stock_qty).toBe(0);
  });

  it('drops a compare-at price that is not above the price', () => {
    // The column rejects it, and a strike-through equal to the price is noise.
    const flat = product({ variants: [{ ...product().variants[0], compareAtMinor: 6400 }] });

    expect(variantRows(flat, 'p')[0].compare_at_minor).toBeNull();
  });
});

describe('imageRows', () => {
  it('maps uploaded images to their storage keys', () => {
    expect(imageRows(product(), 'product-uuid')).toEqual([
      {
        product_id: 'product-uuid',
        storage_path: 'abib-hand-creme/01-a.webp',
        position: 1,
        alt_ar: 'كريم اليد',
        alt_en: null,
      },
    ]);
  });

  it('skips images the uploader never placed in Storage', () => {
    // storage_path is not nullable; an unuploaded image is simply not a row yet.
    const pending = product({ images: [{ file: 'a.webp', folder: 'files', position: 1 }] });

    expect(imageRows(pending, 'p')).toEqual([]);
  });
});

describe('membershipRows', () => {
  it('pairs a product with the categories it was found in', () => {
    const rows = membershipRows(product(), 'product-uuid', new Map([['hand-care', 'cat-uuid']]));

    expect(rows).toEqual([{ product_id: 'product-uuid', category_id: 'cat-uuid', position: 0 }]);
  });

  it('ignores a category slug that never made it into the database', () => {
    expect(membershipRows(product(), 'p', new Map())).toEqual([]);
  });
});

describe('nullDuplicateSkus', () => {
  function variant(sku: string | null, productId: string) {
    return { ...variantRows(product(), productId)[0], sku };
  }

  it('keeps the first use of a sku and blanks the rest', () => {
    // sku is unique across the whole table, and three products in the source
    // catalog share one. Nulls are distinct, so the later ones simply lose it.
    const result = nullDuplicateSkus([
      variant('D0206', 'p1'),
      variant('D0206', 'p2'),
      variant('AB-01', 'p3'),
    ]);

    expect(result.rows.map((row) => row.sku)).toEqual(['D0206', null, 'AB-01']);
    expect(result.collisions).toEqual(['D0206']);
  });

  it('leaves variants that never had a sku alone', () => {
    const result = nullDuplicateSkus([variant(null, 'p1'), variant(null, 'p2')]);

    expect(result.rows.map((row) => row.sku)).toEqual([null, null]);
    expect(result.collisions).toEqual([]);
  });
});

describe('unsafeHandles', () => {
  it('accepts an Arabic handle — the storefront serves Arabic URLs', () => {
    expect(unsafeHandles([product({ handle: 'كريم-اليد-50مل' })])).toEqual([]);
  });

  it('rejects handles that would not survive being put in a URL path', () => {
    expect(
      unsafeHandles([
        product({ handle: 'Has-Uppercase' }),
        product({ handle: 'has space' }),
        product({ handle: 'has/slash' }),
        product({ handle: 'centellian24-360º-shot' }),
      ]),
    ).toEqual(['Has-Uppercase', 'has space', 'has/slash']);
  });
});

describe('splitForUpsert', () => {
  const rows = [
    { handle: 'a', name_ar: 'أ', status: 'active' },
    { handle: 'b', name_ar: 'ب', status: 'active' },
  ];

  it('separates rows the database has never seen from ones it has', () => {
    const split = splitForUpsert(rows, 'handle', new Set(['b']), []);

    expect(split.inserts).toEqual([rows[0]]);
    expect(split.updates).toEqual([rows[1]]);
  });

  it('strips staff-owned columns from updates so a re-run cannot reset them', () => {
    const split = splitForUpsert(rows, 'handle', new Set(['a', 'b']), ['status']);

    expect(split.inserts).toEqual([]);
    expect(split.updates).toEqual([
      { handle: 'a', name_ar: 'أ' },
      { handle: 'b', name_ar: 'ب' },
    ]);
  });

  it('leaves inserts untouched — a new row still needs its status', () => {
    const split = splitForUpsert(rows, 'handle', new Set(), ['status']);

    expect(split.inserts).toEqual(rows);
  });
});

describe('chunk', () => {
  it('splits a list into batches of at most the given size', () => {
    expect(chunk([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]]);
  });

  it('returns nothing for an empty list', () => {
    expect(chunk([], 100)).toEqual([]);
  });
});
