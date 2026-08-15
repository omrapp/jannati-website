/**
 * Admin brand & category CRUD (Task 3.4). Cookie-bound client, same posture
 * as `products.ts` — RLS's `20260815000006_admin_brands_categories_write_policies.sql`
 * is the real gate, this just passes the request through as the signed-in
 * admin rather than escalating with the service-role client.
 */

import type { SupabaseClient } from '@supabase/supabase-js';

import type { Database, Tables } from '@/lib/supabase/types';

type Client = SupabaseClient<Database>;

/** Postgres unique-violation code — see the race note in `cart.ts`. Here it's
 * not a race, just a slug someone already used; caught to give staff a
 * plain-English message instead of the raw constraint error. */
const UNIQUE_VIOLATION = '23505';

export type Brand = Tables<'brands'>;
export type Category = Tables<'categories'>;

export type BrandInput = {
  slug: string;
  nameEn: string;
  nameAr: string | null;
  descriptionAr: string | null;
  descriptionEn: string | null;
  logoPath: string | null;
  sortOrder: number;
};

export type CategoryInput = {
  slug: string;
  parentId: string | null;
  nameAr: string;
  nameEn: string | null;
  descriptionAr: string | null;
  descriptionEn: string | null;
  sortOrder: number;
};

export async function listBrands(client: Client): Promise<Brand[]> {
  const { data, error } = await client.from('brands').select('*').order('sort_order').order('name_en');
  if (error) throw new Error(`listing brands: ${error.message}`);
  return data;
}

export async function getBrand(client: Client, id: string): Promise<Brand | null> {
  const { data, error } = await client.from('brands').select('*').eq('id', id).maybeSingle();
  if (error) throw new Error(`reading brand: ${error.message}`);
  return data;
}

function toBrandRow(input: BrandInput) {
  return {
    slug: input.slug,
    name_en: input.nameEn,
    name_ar: input.nameAr,
    description_ar: input.descriptionAr,
    description_en: input.descriptionEn,
    logo_path: input.logoPath,
    sort_order: input.sortOrder,
  };
}

export async function createBrand(client: Client, input: BrandInput): Promise<string> {
  const { data, error } = await client.from('brands').insert(toBrandRow(input)).select('id').single();
  if (error) {
    if (error.code === UNIQUE_VIOLATION) throw new Error(`Slug "${input.slug}" is already in use.`);
    throw new Error(`creating brand: ${error.message}`);
  }
  return data.id;
}

export async function updateBrand(client: Client, id: string, input: BrandInput): Promise<void> {
  const { error } = await client.from('brands').update(toBrandRow(input)).eq('id', id);
  if (error) {
    if (error.code === UNIQUE_VIOLATION) throw new Error(`Slug "${input.slug}" is already in use.`);
    throw new Error(`updating brand: ${error.message}`);
  }
}

export async function listCategories(client: Client): Promise<Category[]> {
  const { data, error } = await client.from('categories').select('*').order('sort_order').order('name_ar');
  if (error) throw new Error(`listing categories: ${error.message}`);
  return data;
}

export async function getCategory(client: Client, id: string): Promise<Category | null> {
  const { data, error } = await client.from('categories').select('*').eq('id', id).maybeSingle();
  if (error) throw new Error(`reading category: ${error.message}`);
  return data;
}

function toCategoryRow(input: CategoryInput) {
  return {
    slug: input.slug,
    parent_id: input.parentId,
    name_ar: input.nameAr,
    name_en: input.nameEn,
    description_ar: input.descriptionAr,
    description_en: input.descriptionEn,
    sort_order: input.sortOrder,
  };
}

export async function createCategory(client: Client, input: CategoryInput): Promise<string> {
  const { data, error } = await client.from('categories').insert(toCategoryRow(input)).select('id').single();
  if (error) {
    if (error.code === UNIQUE_VIOLATION) throw new Error(`Slug "${input.slug}" is already in use.`);
    throw new Error(`creating category: ${error.message}`);
  }
  return data.id;
}

/** Walks the proposed parent's ancestor chain looking for `id` — a plain
 * self-parent check alone would still let a grandparent loop back through a
 * deeper cycle, which the category tree UI can't render (infinite parent
 * pointers). */
async function parentOf(client: Client, categoryId: string): Promise<string | null> {
  const { data, error } = await client
    .from('categories')
    .select('parent_id')
    .eq('id', categoryId)
    .maybeSingle();
  if (error) throw new Error(`checking category ancestry: ${error.message}`);
  return data?.parent_id ?? null;
}

async function wouldCreateCycle(client: Client, id: string, proposedParentId: string): Promise<boolean> {
  let current: string | null = proposedParentId;
  while (current !== null) {
    if (current === id) return true;
    current = await parentOf(client, current);
  }
  return false;
}

export async function updateCategory(client: Client, id: string, input: CategoryInput): Promise<void> {
  if (input.parentId === id) throw new Error('A category cannot be its own parent.');
  if (input.parentId && (await wouldCreateCycle(client, id, input.parentId))) {
    throw new Error('That parent is a descendant of this category — would create a cycle.');
  }

  const { error } = await client.from('categories').update(toCategoryRow(input)).eq('id', id);
  if (error) {
    if (error.code === UNIQUE_VIOLATION) throw new Error(`Slug "${input.slug}" is already in use.`);
    throw new Error(`updating category: ${error.message}`);
  }
}
