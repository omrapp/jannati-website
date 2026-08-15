/**
 * Admin product image management (Task 3.3). Uses the service-role client
 * for every write, not the cookie-bound one — `storage_buckets.sql`'s own
 * comment already settled this ("the seed uploader and the admin panel use
 * the service role"), since Storage writes need it regardless (there is no
 * insert/update/delete policy on `storage.objects`, on purpose, same as the
 * seed pipeline). Because the service-role client bypasses RLS entirely,
 * `checkAdminAccess()` in the caller — not a database policy — is the actual
 * security boundary for these functions. Every exported function here must
 * be called from a server action that checks it first.
 */

import type { SupabaseClient } from '@supabase/supabase-js';

import type { Database, Tables } from '@/lib/supabase/types';

type AdminClient = SupabaseClient<Database>;

const BUCKET = 'product-images';

export type ProductImage = Tables<'product_images'>;

function sanitizeFilename(name: string): string {
  const dot = name.lastIndexOf('.');
  const extension = dot >= 0 ? name.slice(dot).toLowerCase() : '';
  const base = (dot >= 0 ? name.slice(0, dot) : name)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

  return `${base || 'image'}${extension}`;
}

/** Product `id`-keyed, not handle-keyed like the seed pipeline's `storagePath` —
 * simpler than ASCII-folding a possibly-Arabic handle, and this is a
 * different code path (admin uploads, not the one-off seed loader) so
 * nothing depends on the two conventions matching. */
function storagePath(productId: string, filename: string): string {
  return `products/${productId}/${crypto.randomUUID()}-${sanitizeFilename(filename)}`;
}

export async function listProductImages(
  admin: AdminClient,
  productId: string,
): Promise<ProductImage[]> {
  const { data, error } = await admin
    .from('product_images')
    .select('*')
    .eq('product_id', productId)
    .order('position', { ascending: true });

  if (error) throw new Error(`listing product images: ${error.message}`);
  return data;
}

export async function uploadProductImage(
  admin: AdminClient,
  productId: string,
  file: File,
): Promise<ProductImage> {
  const existing = await listProductImages(admin, productId);
  const path = storagePath(productId, file.name);

  const { error: uploadError } = await admin.storage
    .from(BUCKET)
    .upload(path, file, { contentType: file.type || 'application/octet-stream' });
  if (uploadError) throw new Error(`uploading image: ${uploadError.message}`);

  const nextPosition = existing.length > 0 ? Math.max(...existing.map((i) => i.position)) + 1 : 1;

  const { data, error } = await admin
    .from('product_images')
    .insert({ product_id: productId, storage_path: path, position: nextPosition })
    .select('*')
    .single();
  if (error) {
    // Row insert failed after the object landed — remove the now-orphaned
    // object rather than leaving a Storage file no `product_images` row
    // points at.
    await admin.storage.from(BUCKET).remove([path]);
    throw new Error(`recording uploaded image: ${error.message}`);
  }

  return data;
}

export async function deleteProductImage(admin: AdminClient, imageId: string): Promise<void> {
  const { data: image, error: readError } = await admin
    .from('product_images')
    .select('storage_path')
    .eq('id', imageId)
    .maybeSingle();
  if (readError) throw new Error(`reading image: ${readError.message}`);
  if (!image) return;

  const { error: deleteRowError } = await admin.from('product_images').delete().eq('id', imageId);
  if (deleteRowError) throw new Error(`deleting image row: ${deleteRowError.message}`);

  // Row first, object second: if the object delete fails, the result is an
  // orphaned Storage file (harmless, unlinked) rather than a `product_images`
  // row pointing at nothing.
  await admin.storage.from(BUCKET).remove([image.storage_path]);
}

export async function updateProductImage(
  admin: AdminClient,
  imageId: string,
  input: { altAr: string | null; altEn: string | null },
): Promise<void> {
  const { error } = await admin
    .from('product_images')
    .update({ alt_ar: input.altAr, alt_en: input.altEn })
    .eq('id', imageId);
  if (error) throw new Error(`updating image alt text: ${error.message}`);
}

/** Full-replace of the position ordering for one product's images, in the order given. */
export async function reorderProductImages(
  admin: AdminClient,
  productId: string,
  orderedImageIds: string[],
): Promise<void> {
  await Promise.all(
    orderedImageIds.map((id, index) =>
      admin
        .from('product_images')
        .update({ position: index + 1 })
        .eq('id', id)
        .eq('product_id', productId),
    ),
  );
}
