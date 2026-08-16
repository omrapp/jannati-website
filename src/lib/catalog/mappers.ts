/**
 * Turns catalog rows into what a page renders: one language resolved, one
 * currency applied, one image URL built.
 *
 * Pure on purpose — the queries in `queries.ts` fetch, these decide. Language
 * fallback and price conversion are the two things most likely to go quietly
 * wrong, so they are unit tested here rather than inspected in a browser.
 */

import { parseLocale, type Locale } from '@/i18n/config';
import { convertFromOmr, formatMoney } from '@/lib/commerce/money';
import type { CountryPricing } from '@/lib/commerce/types';
import { env } from '@/lib/env';
import type { Database } from '@/lib/supabase/types';

const BUCKET = 'product-images';

type Tables = Database['public']['Tables'];

/** The pricing columns of a country row; the rest of the row is not needed. */
export type CountryRow = Pick<
  Tables['countries']['Row'],
  'code' | 'currency' | 'currency_exponent' | 'fx_rate_from_omr' | 'rounding_step_minor'
>;

export type BrandJoin = Pick<Tables['brands']['Row'], 'slug' | 'name_en' | 'name_ar' | 'logo_path'>;

export type CategoryJoin = Pick<Tables['categories']['Row'], 'slug' | 'name_ar' | 'name_en'>;

type VariantJoin = Pick<
  Tables['product_variants']['Row'],
  | 'id'
  | 'sku'
  | 'title_ar'
  | 'title_en'
  | 'base_price_minor'
  | 'compare_at_minor'
  | 'stock_qty'
  | 'position'
>;

type ImageJoin = Pick<
  Tables['product_images']['Row'],
  'storage_path' | 'alt_ar' | 'alt_en' | 'position'
>;

export type ProductJoin = Pick<
  Tables['products']['Row'],
  'id' | 'handle' | 'name_ar' | 'name_en' | 'description_ar' | 'description_en'
> & {
  brands: BrandJoin | null;
  product_variants: VariantJoin[];
  product_images: ImageJoin[];
};

export type ProductImage = { path: string; url: string; alt: string | null; position: number };

export type ProductSummary = {
  id: string;
  handle: string;
  name: string;
  brand: { slug: string; name: string } | null;
  brandName: string | null;
  /** OMR baisa, so a caller can re-price without another query. */
  basePriceMinor: number | null;
  /** Minor units of the shopper's currency. */
  priceMinor: number | null;
  price: string | null;
  compareAtPrice: string | null;
  inStock: boolean;
  image: ProductImage | null;
};

export type ProductVariant = {
  id: string;
  sku: string | null;
  title: string | null;
  basePriceMinor: number;
  priceMinor: number;
  price: string;
  compareAtPrice: string | null;
  inStock: boolean;
};

export type ProductDetail = ProductSummary & {
  description: string | null;
  images: ProductImage[];
  variants: ProductVariant[];
};

export type BrandSummary = { slug: string; name: string; logoUrl: string | null };

export type CategorySummary = { slug: string; name: string };

/** Storage is a public bucket, so an object URL can be built without a request. */
export function publicImageUrl(path: string): string {
  return `${env.supabaseUrl}/storage/v1/object/public/${BUCKET}/${path}`;
}

export function toCountryPricing(country: CountryRow): CountryPricing {
  return {
    code: country.code as CountryPricing['code'],
    currency: country.currency,
    currencyExponent: country.currency_exponent,
    fxRateFromOmr: country.fx_rate_from_omr,
    roundingStepMinor: country.rounding_step_minor,
  };
}

/**
 * English falls back to Arabic, never the other way round: most products have
 * no English copy until the translation pass runs, and an Arabic name on an
 * English page beats a blank one.
 */
export function text(ar: string | null, en: string | null, locale: Locale): string | null {
  const { language } = parseLocale(locale);

  return language === 'en' ? (en ?? ar) : (ar ?? en);
}

function toImage(image: ImageJoin, locale: Locale): ProductImage {
  return {
    path: image.storage_path,
    url: publicImageUrl(image.storage_path),
    alt: text(image.alt_ar, image.alt_en, locale),
    position: image.position,
  };
}

function byPosition<Row extends { position: number }>(rows: Row[]): Row[] {
  return [...rows].sort((left, right) => left.position - right.position);
}

export function toProductSummary(
  product: ProductJoin,
  country: CountryRow,
  locale: Locale,
): ProductSummary {
  const pricing = toCountryPricing(country);
  const variants = byPosition(product.product_variants);
  const images = byPosition(product.product_images);
  // The first variant is the one the listing prices, and the one the detail
  // page preselects.
  const lead = variants[0] ?? null;
  const brand = product.brands;
  const brandName = brand ? (text(brand.name_ar, brand.name_en, locale) ?? brand.name_en) : null;

  const compareAt =
    lead?.compare_at_minor != null && lead.compare_at_minor > lead.base_price_minor
      ? formatMoney(convertFromOmr(lead.compare_at_minor, pricing), pricing, locale)
      : null;

  return {
    id: product.id,
    handle: product.handle,
    // name_ar is not nullable, so a name always resolves.
    name: text(product.name_ar, product.name_en, locale) as string,
    brand: brand ? { slug: brand.slug, name: brandName as string } : null,
    brandName,
    basePriceMinor: lead ? lead.base_price_minor : null,
    priceMinor: lead ? convertFromOmr(lead.base_price_minor, pricing) : null,
    price: lead
      ? formatMoney(convertFromOmr(lead.base_price_minor, pricing), pricing, locale)
      : null,
    compareAtPrice: compareAt,
    inStock: variants.some((variant) => variant.stock_qty > 0),
    image: images[0] ? toImage(images[0], locale) : null,
  };
}

export function toProductDetail(
  product: ProductJoin,
  country: CountryRow,
  locale: Locale,
): ProductDetail {
  const pricing = toCountryPricing(country);

  return {
    ...toProductSummary(product, country, locale),
    description: text(product.description_ar, product.description_en, locale),
    images: byPosition(product.product_images).map((image) => toImage(image, locale)),
    variants: byPosition(product.product_variants).map((variant) => ({
      id: variant.id,
      sku: variant.sku,
      title: text(variant.title_ar, variant.title_en, locale),
      basePriceMinor: variant.base_price_minor,
      priceMinor: convertFromOmr(variant.base_price_minor, pricing),
      price: formatMoney(convertFromOmr(variant.base_price_minor, pricing), pricing, locale),
      compareAtPrice:
        variant.compare_at_minor != null && variant.compare_at_minor > variant.base_price_minor
          ? formatMoney(convertFromOmr(variant.compare_at_minor, pricing), pricing, locale)
          : null,
      inStock: variant.stock_qty > 0,
    })),
  };
}

export function toBrandSummary(brand: BrandJoin, locale: Locale): BrandSummary {
  return {
    slug: brand.slug,
    // name_en is not nullable on brands, so this always resolves.
    name: (text(brand.name_ar, brand.name_en, locale) ?? brand.name_en) as string,
    logoUrl: brand.logo_path ? publicImageUrl(brand.logo_path) : null,
  };
}

export function toCategorySummary(category: CategoryJoin, locale: Locale): CategorySummary {
  return {
    slug: category.slug,
    // name_ar is not nullable on categories.
    name: text(category.name_ar, category.name_en, locale) as string,
  };
}
