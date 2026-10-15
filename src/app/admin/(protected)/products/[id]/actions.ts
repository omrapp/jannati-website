'use server';

import { revalidatePath } from 'next/cache';

import { checkAdminAccess } from '@/lib/admin/auth';
import {
  deleteProductImage,
  reorderProductImages,
  updateProductImage,
  uploadProductImage,
} from '@/lib/admin/images';
import { createAdminClient } from '@/lib/supabase/admin';

export type ImageFormState = { status: 'idle' | 'error'; message?: string };

const MAX_BYTES = 8 * 1024 * 1024;
const ALLOWED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

export async function uploadProductImageAction(
  productId: string,
  _prevState: ImageFormState,
  formData: FormData,
): Promise<ImageFormState> {
  const access = await checkAdminAccess();
  if (!access.isAdmin) return { status: 'error', message: 'Not authorized.' };

  const file = formData.get('file');
  if (!(file instanceof File) || file.size === 0) {
    return { status: 'error', message: 'Choose an image file.' };
  }
  if (!ALLOWED_TYPES.has(file.type)) {
    return { status: 'error', message: 'Only JPEG, PNG, or WebP images are allowed.' };
  }
  if (file.size > MAX_BYTES) {
    return { status: 'error', message: 'Image must be 8MB or smaller.' };
  }

  try {
    await uploadProductImage(createAdminClient(), productId, file);
  } catch (err) {
    return { status: 'error', message: err instanceof Error ? err.message : 'Upload failed.' };
  }

  revalidatePath(`/admin/products/${productId}`);
  return { status: 'idle' };
}

export async function deleteProductImageAction(productId: string, imageId: string): Promise<void> {
  const access = await checkAdminAccess();
  if (!access.isAdmin) throw new Error('Not authorized.');

  await deleteProductImage(createAdminClient(), imageId);
  revalidatePath(`/admin/products/${productId}`);
}

export async function updateProductImageAltAction(
  productId: string,
  imageId: string,
  input: { altAr: string | null; altEn: string | null },
): Promise<void> {
  const access = await checkAdminAccess();
  if (!access.isAdmin) throw new Error('Not authorized.');

  await updateProductImage(createAdminClient(), imageId, input);
  revalidatePath(`/admin/products/${productId}`);
}

export async function reorderProductImagesAction(
  productId: string,
  orderedImageIds: string[],
): Promise<void> {
  const access = await checkAdminAccess();
  if (!access.isAdmin) throw new Error('Not authorized.');

  await reorderProductImages(createAdminClient(), productId, orderedImageIds);
  revalidatePath(`/admin/products/${productId}`);
}
