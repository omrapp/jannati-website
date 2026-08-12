/**
 * Pure catalog.json -> table row mapping for `npm run seed:load`.
 *
 * Kept apart from the loader so every mapping decision — how stock is seeded,
 * which columns a re-run is allowed to overwrite — is unit tested without a
 * database. The loader itself only sequences these rows and talks to Supabase.
 */

import type { ParsedBrand, ParsedCategory, ParsedProduct } from './types.ts';

/**
 * Stock the source never exposes: the scrape only says in or out of stock.
 * Seeded once on insert and never touched again, so staff counts survive a
 * re-run.
 */
const SEED_STOCK_QTY = 10;

export type BrandRow = {
  slug: string;
  name_en: string;
  name_ar: string | null;
  logo_path: string | null;
};

export type CategoryRow = {
  slug: string;
  name_ar: string;
  name_en: string | null;
};

export type ProductRow = {
  handle: string;
  brand_id: string | null;
  name_ar: string;
  name_en: string | null;
  description_ar: string;
  description_en: string | null;
  en_translation_status: 'missing' | 'machine' | 'human';
  status: 'draft' | 'active' | 'archived';
  published_at: string | null;
  tags: string[];
};

export type VariantRow = {
  product_id: string;
  sku: string | null;
  barcode: string | null;
  title_ar: string | null;
  base_price_minor: number;
  compare_at_minor: number | null;
  stock_qty: number;
  position: number;
};

export type ImageRow = {
  product_id: string;
  storage_path: string;
  position: number;
  alt_ar: string | null;
  alt_en: string | null;
};

export type MembershipRow = {
  product_id: string;
  category_id: string;
  position: number;
};

export function brandRows(brands: ParsedBrand[]): BrandRow[] {
  return brands.map((brand) => ({
    slug: brand.slug,
    name_en: brand.nameEn,
    name_ar: brand.nameAr,
    // Brand logos share the product bucket under their own prefix.
    logo_path: brand.logoFile ? `brands/${brand.logoFile}` : null,
  }));
}

export function categoryRows(categories: ParsedCategory[]): CategoryRow[] {
  return categories.map((category) => ({
    slug: category.slug,
    name_ar: category.nameAr,
    name_en: category.nameEn,
  }));
}

export function productRows(
  products: ParsedProduct[],
  brandIdBySlug: Map<string, string>,
): ProductRow[] {
  return products.map((product) => ({
    handle: product.handle,
    // An unmatched brand must not cost us the product; staff can attach it later.
    brand_id: (product.brandSlug && brandIdBySlug.get(product.brandSlug)) || null,
    name_ar: product.nameAr,
    name_en: product.nameEn,
    description_ar: product.descriptionAr,
    description_en: product.descriptionEn,
    en_translation_status: product.descriptionEn ? 'machine' : 'missing',
    // The scrape only holds published products, so they go live as active.
    status: 'active',
    published_at: product.publishedAt,
    tags: product.tags,
  }));
}

export function variantRows(product: ParsedProduct, productId: string): VariantRow[] {
  return product.variants.map((variant) => ({
    product_id: productId,
    sku: variant.sku,
    barcode: variant.barcode,
    title_ar: variant.titleAr,
    base_price_minor: variant.basePriceMinor,
    compare_at_minor:
      variant.compareAtMinor != null && variant.compareAtMinor > variant.basePriceMinor
        ? variant.compareAtMinor
        : null,
    stock_qty: variant.inStock ? SEED_STOCK_QTY : 0,
    position: variant.position,
  }));
}

export function imageRows(product: ParsedProduct, productId: string): ImageRow[] {
  return product.images
    .filter((image) => Boolean(image.storagePath))
    .map((image) => ({
      product_id: productId,
      storage_path: image.storagePath as string,
      position: image.position,
      // The source carries no alt text; the product name beats an empty alt.
      alt_ar: product.nameAr,
      alt_en: product.nameEn,
    }));
}

export function membershipRows(
  product: ParsedProduct,
  productId: string,
  categoryIdBySlug: Map<string, string>,
): MembershipRow[] {
  return product.categorySlugs
    .map((slug, index) => ({ id: categoryIdBySlug.get(slug), index }))
    .filter((entry): entry is { id: string; index: number } => Boolean(entry.id))
    .map((entry) => ({
      product_id: productId,
      category_id: entry.id,
      position: entry.index,
    }));
}

/**
 * `product_variants.sku` is unique across the whole table, not per product, and
 * the source catalog reuses a handful of codes across unrelated products. The
 * first variant keeps the code; the rest go in without one, which the column
 * allows because nulls are distinct. Collisions are returned so they can be
 * reported and fixed at the source.
 */
export function nullDuplicateSkus(rows: VariantRow[]): {
  rows: VariantRow[];
  collisions: string[];
} {
  const seen = new Set<string>();
  const collisions = new Set<string>();

  const deduped = rows.map((row) => {
    if (!row.sku) return row;

    if (seen.has(row.sku)) {
      collisions.add(row.sku);
      return { ...row, sku: null };
    }

    seen.add(row.sku);
    return row;
  });

  return { rows: deduped, collisions: [...collisions] };
}

/**
 * Handles that could not be served as a URL path segment. Arabic handles are
 * fine and expected — the storefront is Arabic first — so this only rejects
 * what a path cannot carry unescaped.
 */
export function unsafeHandles(products: ParsedProduct[]): string[] {
  return products
    .filter((product) => !/^[^A-Z\s/?#%]+$/u.test(product.handle))
    .map((p) => p.handle);
}

export type UpsertSplit<Row> = {
  inserts: Row[];
  updates: Partial<Row>[];
};

/**
 * Splits rows against the keys already in the database, dropping `protected`
 * columns from the updates. Those columns are seeded once and then belong to
 * staff — re-running the loader must not undo a de-listing or a stock count.
 */
export function splitForUpsert<Row extends Record<string, unknown>>(
  rows: Row[],
  key: keyof Row & string,
  existing: Set<string>,
  protectedColumns: (keyof Row & string)[],
): UpsertSplit<Row> {
  const inserts: Row[] = [];
  const updates: Partial<Row>[] = [];

  for (const row of rows) {
    if (!existing.has(String(row[key]))) {
      inserts.push(row);
      continue;
    }

    const update = { ...row };
    for (const column of protectedColumns) delete update[column];
    updates.push(update);
  }

  return { inserts, updates };
}

export function chunk<Item>(items: Item[], size: number): Item[][] {
  const batches: Item[][] = [];

  for (let index = 0; index < items.length; index += size) {
    batches.push(items.slice(index, index + size));
  }

  return batches;
}
