'use server';

import { redirect } from 'next/navigation';
import { z } from 'zod';

import { checkAdminAccess } from '@/lib/admin/auth';
import { createCategory, updateCategory, type CategoryInput } from '@/lib/admin/taxonomy';
import { createClient } from '@/lib/supabase/server';

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

export const idleCategoryFormState: CategoryFormState = { status: 'idle' };

function emptyToNull(value: FormDataEntryValue | null): string | null {
  const s = typeof value === 'string' ? value.trim() : '';
  return s.length > 0 ? s : null;
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
    const client = await createClient();
    if (categoryId) {
      await updateCategory(client, categoryId, input);
    } else {
      await createCategory(client, input);
    }
  } catch (err) {
    return { status: 'error', message: err instanceof Error ? err.message : 'Save failed.' };
  }

  redirect('/admin/categories');
}
