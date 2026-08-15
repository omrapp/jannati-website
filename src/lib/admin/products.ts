/**
 * Admin product CRUD (Task 3.2). Every write here relies on the
 * `is_admin()`-gated RLS policies from `20260815000004_admin_catalog_write_policies.sql`
 * — this file passes through the cookie-bound client, same as `addresses.ts`,
 * not the service-role client, so a non-admin calling these directly (there
 * is no route to do so, but defense in depth) gets RLS's rejection, not a
 * bypass.
 *
 * Prices cross this boundary as major-unit decimal strings (what staff
 * types, e.g. "6.400") and are converted with `majorDecimalToMinor` from
 * `money.ts` — the same OMR-minor-unit rule as everywhere else in the app,
 * just entered by a human instead of computed.
 */

import type { SupabaseClient } from '@supabase/supabase-js';

import { majorDecimalToMinor, OMR_EXPONENT } from '@/lib/commerce/money';
import type { Database, Tables } from '@/lib/supabase/types';

type Client = SupabaseClient<Database>;

export type ProductStatus = Database['public']['Enums']['product_status'];

export type ProductListItem = {
  id: string;
  handle: string;
  nameAr: string;
  nameEn: string | null;
  status: ProductStatus;
  brandName: string | null;
  variantCount: number;
  minPriceMinor: number | null;
};

export type ProductWithVariants = {
  product: Tables<'products'>;
  variants: Tables<'product_variants'>[];
  categoryIds: string[];
};

export type VariantInput = {
  /** Absent for a new variant; present to update (or, if missing from the
   * submitted set on an update, to delete) an existing one. */
  id?: string;
  sku: string | null;
  titleAr: string | null;
  titleEn: string | null;
  priceMajor: string;
  compareAtMajor: string | null;
  stockQty: number;
  position: number;
};

export type ProductInput = {
  handle: string;
  nameAr: string;
  nameEn: string | null;
  descriptionAr: string | null;
  descriptionEn: string | null;
  brandId: string | null;
  status: ProductStatus;
  categoryIds: string[];
  variants: VariantInput[];
};

/** Rejects anything `majorDecimalToMinor` can't parse — a bad price never silently becomes 0. */
function parsePriceMinor(major: string, field: string): number {
  const minor = majorDecimalToMinor(major, OMR_EXPONENT);
  if (minor === null) throw new Error(`invalid ${field}: "${major}"`);
  return minor;
}

const PAGE_SIZE = 25;

/**
 * Deliberately not one query with embedded `brands(...)`/`product_variants(...)`
 * resources: `products_brand_id_fkey`'s generated `isOneToOne` is `false`
 * (correct — many products share a brand), which makes supabase-js infer the
 * embed as an array, not the single related row a scalar `brand_id` FK
 * actually returns. Three flat queries avoid that mismatch entirely instead
 * of fighting the generated types with a cast.
 */
export async function listProducts(
  client: Client,
  options: { search?: string; status?: ProductStatus; page?: number } = {},
): Promise<{ items: ProductListItem[]; total: number }> {
  const page = options.page ?? 1;
  const from = (page - 1) * PAGE_SIZE;

  let query = client
    .from('products')
    .select('id, handle, name_ar, name_en, status, brand_id', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(from, from + PAGE_SIZE - 1);

  if (options.status) query = query.eq('status', options.status);
  if (options.search) {
    const term = options.search;
    query = query.or(`name_ar.ilike.%${term}%,name_en.ilike.%${term}%,handle.ilike.%${term}%`);
  }

  const { data: products, error, count } = await query;
  if (error) throw new Error(`listing products: ${error.message}`);

  const productIds = products.map((p) => p.id);
  const brandIds = [...new Set(products.map((p) => p.brand_id).filter((id): id is string => id !== null))];

  const [{ data: brands, error: brandsError }, { data: variants, error: variantsError }] =
    await Promise.all([
      brandIds.length > 0
        ? client.from('brands').select('id, name_en').in('id', brandIds)
        : Promise.resolve({ data: [] as { id: string; name_en: string }[], error: null }),
      productIds.length > 0
        ? client.from('product_variants').select('product_id, base_price_minor').in('product_id', productIds)
        : Promise.resolve({ data: [] as { product_id: string; base_price_minor: number }[], error: null }),
    ]);
  if (brandsError) throw new Error(`reading brands: ${brandsError.message}`);
  if (variantsError) throw new Error(`reading variant prices: ${variantsError.message}`);

  const brandNameById = new Map((brands ?? []).map((b) => [b.id, b.name_en]));
  const pricesByProduct = new Map<string, number[]>();
  for (const v of variants ?? []) {
    const list = pricesByProduct.get(v.product_id) ?? [];
    list.push(v.base_price_minor);
    pricesByProduct.set(v.product_id, list);
  }

  const items: ProductListItem[] = products.map((p) => {
    const prices = pricesByProduct.get(p.id) ?? [];
    return {
      id: p.id,
      handle: p.handle,
      nameAr: p.name_ar,
      nameEn: p.name_en,
      status: p.status,
      brandName: p.brand_id ? (brandNameById.get(p.brand_id) ?? null) : null,
      variantCount: prices.length,
      minPriceMinor: prices.length > 0 ? Math.min(...prices) : null,
    };
  });

  return { items, total: count ?? 0 };
}

export async function getProductForEdit(
  client: Client,
  id: string,
): Promise<ProductWithVariants | null> {
  const { data: product, error: productError } = await client
    .from('products')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (productError) throw new Error(`reading product: ${productError.message}`);
  if (!product) return null;

  const [{ data: variants, error: variantsError }, { data: categories, error: categoriesError }] =
    await Promise.all([
      client
        .from('product_variants')
        .select('*')
        .eq('product_id', id)
        .order('position', { ascending: true }),
      client.from('product_categories').select('category_id').eq('product_id', id),
    ]);
  if (variantsError) throw new Error(`reading variants: ${variantsError.message}`);
  if (categoriesError) throw new Error(`reading category memberships: ${categoriesError.message}`);

  return {
    product,
    variants: variants ?? [],
    categoryIds: (categories ?? []).map((c) => c.category_id),
  };
}

function toProductRow(input: ProductInput) {
  return {
    handle: input.handle,
    name_ar: input.nameAr,
    name_en: input.nameEn,
    description_ar: input.descriptionAr,
    description_en: input.descriptionEn,
    brand_id: input.brandId,
    status: input.status,
  };
}

/** Full-replace: deletes memberships not in `categoryIds`, inserts the rest. Simple, not incremental — admin forms submit the whole set every time. */
async function replaceCategoryMemberships(
  client: Client,
  productId: string,
  categoryIds: string[],
): Promise<void> {
  const { error: deleteError } = await client
    .from('product_categories')
    .delete()
    .eq('product_id', productId);
  if (deleteError) throw new Error(`clearing category memberships: ${deleteError.message}`);

  if (categoryIds.length === 0) return;

  const { error: insertError } = await client
    .from('product_categories')
    .insert(categoryIds.map((categoryId, position) => ({ product_id: productId, category_id: categoryId, position })));
  if (insertError) throw new Error(`setting category memberships: ${insertError.message}`);
}

/**
 * Full-replace for variants too: any existing variant whose `id` isn't in
 * the submitted set is deleted (the form is the source of truth for "which
 * variants exist"), the rest are upserted. Not one atomic transaction —
 * same "process dies mid-write leaves a recoverable, not corrupt, state"
 * posture as `setDefaultAddress`; a partial save here is a product a staff
 * member re-opens and re-saves, not a customer-facing inconsistency.
 */
async function replaceVariants(
  client: Client,
  productId: string,
  variants: VariantInput[],
): Promise<void> {
  const { data: existing, error: existingError } = await client
    .from('product_variants')
    .select('id')
    .eq('product_id', productId);
  if (existingError) throw new Error(`reading existing variants: ${existingError.message}`);

  const submittedIds = new Set(variants.filter((v) => v.id).map((v) => v.id));
  const toDelete = (existing ?? []).filter((v) => !submittedIds.has(v.id)).map((v) => v.id);

  if (toDelete.length > 0) {
    const { error: deleteError } = await client.from('product_variants').delete().in('id', toDelete);
    if (deleteError) throw new Error(`deleting removed variants: ${deleteError.message}`);
  }

  if (variants.length === 0) return;

  const rows = variants.map((v) => ({
    ...(v.id ? { id: v.id } : {}),
    product_id: productId,
    sku: v.sku,
    title_ar: v.titleAr,
    title_en: v.titleEn,
    base_price_minor: parsePriceMinor(v.priceMajor, 'variant price'),
    compare_at_minor: v.compareAtMajor ? parsePriceMinor(v.compareAtMajor, 'variant compare-at price') : null,
    stock_qty: v.stockQty,
    position: v.position,
  }));

  const { error: upsertError } = await client.from('product_variants').upsert(rows);
  if (upsertError) throw new Error(`saving variants: ${upsertError.message}`);
}

export async function createProduct(client: Client, input: ProductInput): Promise<string> {
  const { data, error } = await client.from('products').insert(toProductRow(input)).select('id').single();
  if (error) throw new Error(`creating product: ${error.message}`);

  await replaceVariants(client, data.id, input.variants);
  await replaceCategoryMemberships(client, data.id, input.categoryIds);

  return data.id;
}

export async function updateProduct(client: Client, id: string, input: ProductInput): Promise<void> {
  const { error } = await client.from('products').update(toProductRow(input)).eq('id', id);
  if (error) throw new Error(`updating product: ${error.message}`);

  await replaceVariants(client, id, input.variants);
  await replaceCategoryMemberships(client, id, input.categoryIds);
}
