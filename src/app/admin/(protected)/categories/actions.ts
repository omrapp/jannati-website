'use server';

import { redirect } from 'next/navigation';
import { z } from 'zod';

import { checkAdminAccess } from '@/lib/admin/auth';
import {
  createCategory,
  deleteCategoryImage,
  getCategory,
  updateCategory,
  uploadCategoryImage,
  type CategoryInput,
} from '@/lib/admin/taxonomy';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';

// Same limits as `uploadProductImageAction`/`saveBanner` — one admin-facing
// image-upload policy, not three independently-drifting ones.
const MAX_BYTES = 8 * 1024 * 1024;
const ALLOWED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

// Matches the `categories_slug_check` constraint in the catalog migration.
const SLUG_RE = /^[a-z0-9-]+$/;

const categorySchema = z.object({
  slug: z.string().regex(SLUG_RE, 'lowercase letters, numbers, hyphens only'),
  parentId: z.uuid().nullable(),
  nameAr: z.string().trim().min(1),
  nameEn: z.string().trim().min(1).nullable(),
  descriptionAr: z.string().trim().min(1).nullable(),
  descriptionEn: z.string().trim().min(1).nullable(),
  sortOrder: z.number().int(),
});

export type CategoryFormState = { status: 'idle' | 'error'; message?: string };

function emptyToNull(value: FormDataEntryValue | null): string | null {
  const s = typeof value === 'string' ? value.trim() : '';
  return s.length > 0 ? s : null;
}

/** Unlike a banner, a category image is optional either way — a category
 * can exist with no photo yet (falls back to a styled placeholder tile). */
function validateImage(file: FormDataEntryValue | null): File | null {
  if (!(file instanceof File) || file.size === 0) return null;
  if (!ALLOWED_TYPES.has(file.type)) throw new Error('Only JPEG, PNG, or WebP images are allowed.');
  if (file.size > MAX_BYTES) throw new Error('Image must be 8MB or smaller.');
  return file;
}

export async function saveCategory(
  categoryId: string | null,
  _prevState: CategoryFormState,
  formData: FormData,
): Promise<CategoryFormState> {
  const access = await checkAdminAccess();
  if (!access.isAdmin) return { status: 'error', message: 'Not authorized.' };

  const parsed = categorySchema.safeParse({
    slug: formData.get('slug'),
    parentId: emptyToNull(formData.get('parentId')),
    nameAr: formData.get('nameAr'),
    nameEn: emptyToNull(formData.get('nameEn')),
    descriptionAr: emptyToNull(formData.get('descriptionAr')),
    descriptionEn: emptyToNull(formData.get('descriptionEn')),
    sortOrder: Number(formData.get('sortOrder') ?? 0),
  });
  if (!parsed.success) {
    return { status: 'error', message: parsed.error.issues[0]?.message ?? 'Invalid input.' };
  }

  const input: CategoryInput = parsed.data;

  try {
    const image = validateImage(formData.get('image'));
    const client = await createClient();

    if (categoryId) {
      if (image) {
        // Storage write needs the service-role client; the row update stays
        // on the cookie-bound `client` so its RLS write policy still gates it.
        const admin = createAdminClient();
        const existing = await getCategory(client, categoryId);
        const imagePath = await uploadCategoryImage(admin, image);
        await updateCategory(client, categoryId, input, imagePath);
        // Row committed to the new image first — only drop the old object
        // once nothing points at it anymore, same ordering as `updateBanner`.
        if (existing?.image_path) await deleteCategoryImage(admin, existing.image_path);
      } else {
        await updateCategory(client, categoryId, input);
      }
    } else {
      const imagePath = image ? await uploadCategoryImage(createAdminClient(), image) : null;
      await createCategory(client, input, imagePath);
    }
  } catch (err) {
    return { status: 'error', message: err instanceof Error ? err.message : 'Save failed.' };
  }

  redirect('/admin/categories');
}
