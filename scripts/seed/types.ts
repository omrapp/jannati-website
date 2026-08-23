/**
 * The contract between extraction and loading.
 *
 * `npm run seed:extract` writes this shape to `data/catalog.json`; the
 * translate, image and load steps each read and extend it. Keeping it a plain
 * file means the extractor can be tested with no database, and a failed load
 * never means re-parsing 1000 pages.
 *
 * Money is in OMR minor units (baisa) throughout, matching the database.
 */

export type ParsedVariant = {
  /** Shopify variant id — kept only to spot duplicates while seeding. */
  sourceId: number;
  sku: string | null;
  barcode: string | null;
  /** Variant label, e.g. a shade name. Null for single-variant products. */
  titleAr: string | null;
  basePriceMinor: number;
  compareAtMinor: number | null;
  inStock: boolean;
  position: number;
};

export type ParsedImage = {
  /** Filename as stored in the scrape, without the CDN query string. */
  file: string;
  /** Which `cdn/shop/<folder>` directory holds it. */
  folder: 'files' | 'products';
  position: number;
  /** Key in the Storage bucket, written by `npm run seed:images`. */
  storagePath?: string | null;
  /**
   * Full darbeauty.com URL the image was linked from (normalised to an
   * absolute `https://` URL). Optional so catalog.json snapshots taken
   * before this field existed still parse — only present after a re-run of
   * `npm run seed:extract`. Used by `fetch-missing-images.ts` to pull files
   * the scrape linked to but never mirrored locally.
   */
  sourceUrl?: string;
};

export type ParsedProduct = {
  handle: string;
  nameAr: string;
  nameEn: string | null;
  descriptionAr: string;
  descriptionEn: string | null;
  /** Brand as the source names it, e.g. `Abib`. Resolved to a slug later. */
  vendor: string | null;
  /** Shopify product type, in Arabic, e.g. `كريم لليدين`. */
  typeAr: string | null;
  tags: string[];
  publishedAt: string | null;
  variants: ParsedVariant[];
  images: ParsedImage[];
  /** Collection slugs this product appears in. Filled in by the extractor. */
  categorySlugs: string[];
  brandSlug: string | null;
};

export type ParsedBrand = {
  slug: string;
  nameEn: string;
  nameAr: string | null;
  logoFile: string | null;
};

export type ParsedCategory = {
  slug: string;
  nameAr: string;
  nameEn: string | null;
  productHandles: string[];
};

export type Catalog = {
  extractedAt: string;
  source: string;
  counts: {
    products: number;
    variants: number;
    images: number;
    brands: number;
    categories: number;
    failed: number;
  };
  failures: { file: string; reason: string }[];
  brands: ParsedBrand[];
  categories: ParsedCategory[];
  products: ParsedProduct[];
};
