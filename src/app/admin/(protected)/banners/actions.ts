'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';

import { checkAdminAccess } from '@/lib/admin/auth';
import { createBanner, deleteBanner, reorderBanners, updateBanner, type BannerInput } from '@/lib/admin/banners';
import { createAdminClient } from '@/lib/supabase/admin';

// Same limits as `uploadProductImageAction` — one admin-facing image-upload
// policy, not two independently-drifting ones.
const MAX_BYTES = 8 * 1024 * 1024;
const ALLOWED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

const bannerSchema = z.object({
  link: z.string().trim().min(1).nullable(),
  titleAr: z.string().trim().min(1).nullable(),
  titleEn: z.string().trim().min(1).nullable(),
  sortOrder: z.coerce.number().int(),
  active: z.boolean(),
});

export type BannerFormState = { status: 'idle' | 'error'; message?: string };

function emptyToNull(value: FormDataEntryValue | null): string | null {
  const s = typeof value === 'string' ? value.trim() : '';
  return s.length > 0 ? s : null;
}

function validateImage(file: FormDataEntryValue | null, required: boolean): File | null {
  if (!(file instanceof File) || file.size === 0) {
    if (required) throw new Error('Choose an image file.');
    return null;
  }
  if (!ALLOWED_TYPES.has(file.type)) throw new Error('Only JPEG, PNG, or WebP images are allowed.');
  if (file.size > MAX_BYTES) throw new Error('Image must be 8MB or smaller.');
  return file;
}

export async function saveBanner(
  bannerId: string | null,
  _prevState: BannerFormState,
  formData: FormData,
): Promise<BannerFormState> {
  const access = await checkAdminAccess();
  if (!access.isAdmin) return { status: 'error', message: 'Not authorized.' };

  const parsed = bannerSchema.safeParse({
    link: emptyToNull(formData.get('link')),
    titleAr: emptyToNull(formData.get('titleAr')),
    titleEn: emptyToNull(formData.get('titleEn')),
    sortOrder: Number(formData.get('sortOrder') ?? 0),
    active: formData.get('active') === 'on',
  });
  if (!parsed.success) {
    return { status: 'error', message: parsed.error.issues[0]?.message ?? 'Invalid input.' };
  }

  const input: BannerInput = parsed.data;

  try {
    const image = validateImage(formData.get('image'), bannerId === null);
    const admin = createAdminClient();
    if (bannerId) {
      await updateBanner(admin, bannerId, input, image);
    } else {
      // `validateImage(..., true)` above already guarantees non-null here.
      await createBanner(admin, image as File, input);
    }
  } catch (err) {
    return { status: 'error', message: err instanceof Error ? err.message : 'Save failed.' };
  }

  redirect('/admin/banners');
}

export async function deleteBannerAction(bannerId: string): Promise<void> {
  const access = await checkAdminAccess();
  if (!access.isAdmin) throw new Error('Not authorized.');

  await deleteBanner(createAdminClient(), bannerId);
  redirect('/admin/banners');
}

export async function reorderBannersAction(orderedIds: string[]): Promise<void> {
  const access = await checkAdminAccess();
  if (!access.isAdmin) throw new Error('Not authorized.');

  await reorderBanners(createAdminClient(), orderedIds);
  revalidatePath('/admin/banners');
}
