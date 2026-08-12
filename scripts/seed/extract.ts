/**
 * Turns the darbeauty scrape into `data/catalog.json`.
 *
 * Offline and read-only: no network, no database, no API spend. Run it as often
 * as you like. A page that cannot be parsed is recorded in `failures` and the
 * run continues, so one malformed page never costs a whole extraction.
 *
 *   npm run seed:extract
 */

import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { parseBrandsPage, parseCollectionPage } from './parse-collection.ts';
import { parseEnglishProductPage, parseProductPage } from './parse-product.ts';
import { brandSlug } from './slug.ts';
import type { Catalog, ParsedBrand, ParsedCategory, ParsedProduct } from './types.ts';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const scrapeRoot = join(repoRoot, 'darbeauty.com', 'darbeauty.com');
const outputPath = join(repoRoot, 'data', 'catalog.json');

function read(...segments: string[]): string {
  return readFileSync(join(scrapeRoot, ...segments), 'utf8');
}

function htmlFiles(directory: string): string[] {
  try {
    return readdirSync(join(scrapeRoot, directory)).filter((file) => file.endsWith('.html'));
  } catch {
    return [];
  }
}

/** `medicube?page=2.html` -> `medicube`. Pagination is baked into filenames. */
function collectionSlug(file: string): string {
  return file.replace(/\.html$/, '').split('?')[0];
}

function extractBrands(): ParsedBrand[] {
  return parseBrandsPage(read('pages', 'brands.html')).map((brand) => ({
    slug: brand.slug,
    nameEn: brand.nameEn,
    nameAr: null,
    logoFile: brand.logoFile,
  }));
}

/** Every collection, merged across its `?page=N` continuations. */
function extractCollections(): Map<string, ParsedCategory> {
  const collections = new Map<string, ParsedCategory>();

  for (const file of htmlFiles('collections').sort()) {
    const slug = collectionSlug(file);
    const page = parseCollectionPage(read('collections', file));
    const existing = collections.get(slug);

    if (!existing) {
      collections.set(slug, {
        slug,
        nameAr: page.nameAr,
        nameEn: null,
        productHandles: [...page.productHandles],
      });
      continue;
    }

    for (const handle of page.productHandles) {
      if (!existing.productHandles.includes(handle)) existing.productHandles.push(handle);
    }
  }

  // The English storefront gives each collection a translated title.
  for (const file of htmlFiles('en/collections')) {
    const collection = collections.get(collectionSlug(file));

    if (collection) collection.nameEn = parseCollectionPage(read('en/collections', file)).nameAr;
  }

  return collections;
}

function extractProducts(failures: Catalog['failures']): Map<string, ParsedProduct> {
  const products = new Map<string, ParsedProduct>();

  for (const file of htmlFiles('products').sort()) {
    try {
      const product = parseProductPage(read('products', file));

      products.set(product.handle, product);
    } catch (error) {
      failures.push({ file: `products/${file}`, reason: (error as Error).message });
    }
  }

  for (const file of htmlFiles('en/products')) {
    const english = parseEnglishProductPage(read('en/products', file));
    const product = english ? products.get(english.handle) : undefined;

    if (english && product) {
      product.nameEn = english.nameEn;
      product.descriptionEn = english.descriptionEn;
    }
  }

  return products;
}

function main(): void {
  const failures: Catalog['failures'] = [];
  const brands = extractBrands();
  const brandSlugs = new Set(brands.map((brand) => brand.slug));
  const collections = extractCollections();
  const products = extractProducts(failures);

  // A collection linked from the brands index is a brand; everything else is a
  // category. Membership of a brand collection is what assigns a product's brand.
  const categories: ParsedCategory[] = [];

  for (const collection of collections.values()) {
    if (brandSlugs.has(collection.slug)) {
      const brand = brands.find((candidate) => candidate.slug === collection.slug);

      if (brand) brand.nameAr = collection.nameAr || null;

      for (const handle of collection.productHandles) {
        const product = products.get(handle);

        if (product) product.brandSlug = collection.slug;
      }

      continue;
    }

    categories.push(collection);

    for (const handle of collection.productHandles) {
      products.get(handle)?.categorySlugs.push(collection.slug);
    }
  }

  // Only 55 brands have a card on the brands index, but every product names its
  // vendor. Anything left unassigned gets a brand derived from that vendor, so
  // no product lands in the catalogue brandless.
  for (const product of products.values()) {
    if (product.brandSlug || !product.vendor) continue;

    const slug = brandSlug(product.vendor);

    if (!slug) continue;
    if (!brandSlugs.has(slug)) {
      brandSlugs.add(slug);
      brands.push({ slug, nameEn: product.vendor, nameAr: null, logoFile: null });
    }

    product.brandSlug = slug;
  }

  brands.sort((a, b) => a.slug.localeCompare(b.slug));

  const all = [...products.values()];
  const catalog: Catalog = {
    extractedAt: new Date().toISOString(),
    source: 'darbeauty.com static scrape',
    counts: {
      products: all.length,
      variants: all.reduce((total, product) => total + product.variants.length, 0),
      images: all.reduce((total, product) => total + product.images.length, 0),
      brands: brands.length,
      categories: categories.length,
      failed: failures.length,
    },
    failures,
    brands,
    categories,
    products: all,
  };

  mkdirSync(dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, `${JSON.stringify(catalog, null, 2)}\n`, 'utf8');

  const withoutBrand = all.filter((product) => !product.brandSlug).length;
  const withoutCategory = all.filter((product) => product.categorySlugs.length === 0).length;
  const withoutEnglish = all.filter((product) => !product.descriptionEn).length;

  console.log(`catalog written to ${outputPath}`);
  console.table(catalog.counts);
  console.log(`products with no brand:    ${withoutBrand}`);
  console.log(`products in no category:   ${withoutCategory}`);
  console.log(`products needing English:  ${withoutEnglish}`);

  for (const failure of failures) {
    console.warn(`  failed: ${failure.file} — ${failure.reason}`);
  }
}

main();
