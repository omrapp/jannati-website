'use server';

import { redirect } from 'next/navigation';
import { z } from 'zod';

import { createProduct, updateProduct, type ProductInput } from '@/lib/admin/products';
import { checkAdminAccess } from '@/lib/admin/auth';
import { createClient } from '@/lib/supabase/server';

const variantSchema = z.object({
  id: z.uuid().optional(),
  sku: z.string().trim().min(1).nullable(),
  titleAr: z.string().trim().min(1).nullable(),
  titleEn: z.string().trim().min(1).nullable(),
  priceMajor: z.string().min(1),
  compareAtMajor: z.string().min(1).nullable(),
  stockQty: z.number().int().min(0),
  position: z.number().int().min(1),
});

const productSchema = z.object({
  handle: z.string().regex(/^[^A-Z\s/?#%]+$/, 'lowercase, no spaces or slashes'),
  nameAr: z.string().trim().min(1),
  nameEn: z.string().trim().min(1).nullable(),
  descriptionAr: z.string().trim().min(1).nullable(),
  descriptionEn: z.string().trim().min(1).nullable(),
  brandId: z.uuid().nullable(),
  status: z.enum(['draft', 'active', 'archived']),
  categoryIds: z.array(z.uuid()),
  variants: z.array(variantSchema).min(1, 'at least one variant is required'),
});

export type ProductFormState = { status: 'idle' | 'error'; message?: string };

export const idleProductFormState: ProductFormState = { status: 'idle' };

function emptyToNull(value: FormDataEntryValue | null): string | null {
  const s = typeof value === 'string' ? value.trim() : '';
  return s.length > 0 ? s : null;
}

/**
 * `productId: null` creates, otherwise updates. `variants` and `categoryIds`
 * arrive as JSON in hidden fields — `product-form.tsx` manages both as React
 * state (add/remove variant rows, toggle category checkboxes), and a plain
 * `FormData` has no native way to carry a variable-length array of objects.
 */
export async function saveProduct(
  productId: string | null,
  _prevState: ProductFormState,
  formData: FormData,
): Promise<ProductFormState> {
  const access = await checkAdminAccess();
  if (!access.isAdmin) return { status: 'error', message: 'Not authorized.' };

  let variants: unknown;
  let categoryIds: unknown;
  try {
    variants = JSON.parse(String(formData.get('variantsJson') ?? '[]'));
    categoryIds = JSON.parse(String(formData.get('categoryIdsJson') ?? '[]'));
  } catch {
    return { status: 'error', message: 'Malformed form submission.' };
  }

  const parsed = productSchema.safeParse({
    handle: formData.get('handle'),
    nameAr: formData.get('nameAr'),
    nameEn: emptyToNull(formData.get('nameEn')),
    descriptionAr: emptyToNull(formData.get('descriptionAr')),
    descriptionEn: emptyToNull(formData.get('descriptionEn')),
    brandId: emptyToNull(formData.get('brandId')),
    status: formData.get('status'),
    categoryIds,
    variants,
  });
  if (!parsed.success) {
    return { status: 'error', message: parsed.error.issues[0]?.message ?? 'Invalid input.' };
  }

  const input: ProductInput = parsed.data;

  try {
    const client = await createClient();
    if (productId) {
      await updateProduct(client, productId, input);
    } else {
      await createProduct(client, input);
    }
  } catch (err) {
    return { status: 'error', message: err instanceof Error ? err.message : 'Save failed.' };
  }

  redirect('/admin/products');
}
