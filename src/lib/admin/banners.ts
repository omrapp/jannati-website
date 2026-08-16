/**
 * Admin banner CRUD (Task 3.8). Service-role client for every write, same
 * reasoning as `images.ts`: the `banners` Storage bucket has no
 * insert/update/delete policy on `storage.objects`, on purpose, so an image
 * write needs the service role regardless of what the `banners` table's own
 * (nonexistent, by design — see the migration) RLS would allow.
 * `checkAdminAccess()` in the calling server action is the actual gate.
 */

import type { SupabaseClient } from '@supabase/supabase-js';

import { env } from '@/lib/env';
import type { Database } from '@/lib/supabase/types';

export type Banner = {
  id: string;
  image_path: string;
  link: string | null;
  title_ar: string | null;
  title_en: string | null;
  sort_order: number;
  active: boolean;
  created_at: string;
  updated_at: string;
};

/**
 * `banners` doesn't exist in `Database` yet — same typegen gap as
 * `content_pages` (see that file). Delete once the real migration lands in
 * generated types.
 */
type DatabaseWithBanners = Database & {
  public: Database['public'] & {
    Tables: Database['public']['Tables'] & {
      banners: {
        Row: Banner;
        Insert: Partial<Banner> & Pick<Banner, 'image_path'>;
        Update: Partial<Banner>;
        Relationships: [];
      };
    };
  };
};

type AdminClient = SupabaseClient<Database>;

function withBanners(admin: AdminClient): SupabaseClient<DatabaseWithBanners> {
  return admin as unknown as SupabaseClient<DatabaseWithBanners>;
}

const BUCKET = 'banners';

/** Storage is a public bucket, same as `publicImageUrl` in `catalog/mappers.ts`. */
export function publicBannerUrl(path: string): string {
  return `${env.supabaseUrl}/storage/v1/object/public/${BUCKET}/${path}`;
}

export type BannerInput = {
  link: string | null;
  titleAr: string | null;
  titleEn: string | null;
  sortOrder: number;
  active: boolean;
};

function sanitizeFilename(name: string): string {
  const dot = name.lastIndexOf('.');
  const extension = dot >= 0 ? name.slice(dot).toLowerCase() : '';
  const base = (dot >= 0 ? name.slice(0, dot) : name)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

  return `${base || 'banner'}${extension}`;
}

function storagePath(filename: string): string {
  return `${crypto.randomUUID()}-${sanitizeFilename(filename)}`;
}

export async function listBanners(admin: AdminClient): Promise<Banner[]> {
  const { data, error } = await withBanners(admin).from('banners').select('*').order('sort_order');
  if (error) throw new Error(`listing banners: ${error.message}`);
  return data;
}

export async function getBanner(admin: AdminClient, id: string): Promise<Banner | null> {
  const { data, error } = await withBanners(admin).from('banners').select('*').eq('id', id).maybeSingle();
  if (error) throw new Error(`reading banner: ${error.message}`);
  return data;
}

export async function createBanner(admin: AdminClient, image: File, input: BannerInput): Promise<string> {
  const path = storagePath(image.name);

  const { error: uploadError } = await admin.storage
    .from(BUCKET)
    .upload(path, image, { contentType: image.type || 'application/octet-stream' });
  if (uploadError) throw new Error(`uploading banner image: ${uploadError.message}`);

  const { data, error } = await withBanners(admin)
    .from('banners')
    .insert({
      image_path: path,
      link: input.link,
      title_ar: input.titleAr,
      title_en: input.titleEn,
      sort_order: input.sortOrder,
      active: input.active,
    })
    .select('id')
    .single();
  if (error) {
    // Same "row failed after the object landed" cleanup as `images.ts`.
    await admin.storage.from(BUCKET).remove([path]);
    throw new Error(`creating banner: ${error.message}`);
  }
  return data.id;
}

/** `image` is optional on update — replacing the image is a deliberate
 * staff action, not required every time a link or title changes. */
export async function updateBanner(
  admin: AdminClient,
  id: string,
  input: BannerInput,
  image: File | null,
): Promise<void> {
  let imagePath: string | null = null;
  let previousPath: string | null = null;

  if (image) {
    const { data: existing, error: readError } = await withBanners(admin)
      .from('banners')
      .select('image_path')
      .eq('id', id)
      .maybeSingle();
    if (readError) throw new Error(`reading banner: ${readError.message}`);
    previousPath = existing?.image_path ?? null;

    imagePath = storagePath(image.name);
    const { error: uploadError } = await admin.storage
      .from(BUCKET)
      .upload(imagePath, image, { contentType: image.type || 'application/octet-stream' });
    if (uploadError) throw new Error(`uploading banner image: ${uploadError.message}`);
  }

  const { error } = await withBanners(admin)
    .from('banners')
    .update({
      ...(imagePath ? { image_path: imagePath } : {}),
      link: input.link,
      title_ar: input.titleAr,
      title_en: input.titleEn,
      sort_order: input.sortOrder,
      active: input.active,
    })
    .eq('id', id);
  if (error) {
    if (imagePath) await admin.storage.from(BUCKET).remove([imagePath]);
    throw new Error(`updating banner: ${error.message}`);
  }

  // Row committed to the new image first: only drop the old object once
  // nothing points at it anymore, same ordering as `deleteProductImage`.
  if (previousPath) await admin.storage.from(BUCKET).remove([previousPath]);
}

/** Full-replace of `sort_order` for every banner, in the order given — same
 * shape as `reorderProductImages`. */
export async function reorderBanners(admin: AdminClient, orderedIds: string[]): Promise<void> {
  await Promise.all(
    orderedIds.map((id, index) => withBanners(admin).from('banners').update({ sort_order: index }).eq('id', id)),
  );
}

export async function deleteBanner(admin: AdminClient, id: string): Promise<void> {
  const { data: banner, error: readError } = await withBanners(admin)
    .from('banners')
    .select('image_path')
    .eq('id', id)
    .maybeSingle();
  if (readError) throw new Error(`reading banner: ${readError.message}`);
  if (!banner) return;

  const { error: deleteRowError } = await withBanners(admin).from('banners').delete().eq('id', id);
  if (deleteRowError) throw new Error(`deleting banner row: ${deleteRowError.message}`);

  await admin.storage.from(BUCKET).remove([banner.image_path]);
}
