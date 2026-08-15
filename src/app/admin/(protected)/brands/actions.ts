'use server';

import { redirect } from 'next/navigation';
import { z } from 'zod';

import { checkAdminAccess } from '@/lib/admin/auth';
import { createBrand, updateBrand, type BrandInput } from '@/lib/admin/taxonomy';
import { createClient } from '@/lib/supabase/server';

// Matches the `brands_slug_check` constraint in the catalog migration — kept
// in sync by hand since there's no single source both sides can read.
const SLUG_RE = /^[a-z0-9-]+$/;

const brandSchema = z.object({
  slug: z.string().regex(SLUG_RE, 'lowercase letters, numbers, hyphens only'),
  nameEn: z.string().trim().min(1),
  nameAr: z.string().trim().min(1).nullable(),
  descriptionAr: z.string().trim().min(1).nullable(),
  descriptionEn: z.string().trim().min(1).nullable(),
  logoPath: z.string().trim().min(1).nullable(),
  sortOrder: z.number().int(),
});

export type BrandFormState = { status: 'idle' | 'error'; message?: string };

export const idleBrandFormState: BrandFormState = { status: 'idle' };

function emptyToNull(value: FormDataEntryValue | null): string | null {
  const s = typeof value === 'string' ? value.trim() : '';
  return s.length > 0 ? s : null;
}

export async function saveBrand(
  brandId: string | null,
  _prevState: BrandFormState,
  formData: FormData,
): Promise<BrandFormState> {
  const access = await checkAdminAccess();
  if (!access.isAdmin) return { status: 'error', message: 'Not authorized.' };

  const parsed = brandSchema.safeParse({
    slug: formData.get('slug'),
    nameEn: formData.get('nameEn'),
    nameAr: emptyToNull(formData.get('nameAr')),
    descriptionAr: emptyToNull(formData.get('descriptionAr')),
    descriptionEn: emptyToNull(formData.get('descriptionEn')),
    logoPath: emptyToNull(formData.get('logoPath')),
    sortOrder: Number(formData.get('sortOrder') ?? 0),
  });
  if (!parsed.success) {
    return { status: 'error', message: parsed.error.issues[0]?.message ?? 'Invalid input.' };
  }

  const input: BrandInput = parsed.data;

  try {
    const client = await createClient();
    if (brandId) {
      await updateBrand(client, brandId, input);
    } else {
      await createBrand(client, input);
    }
  } catch (err) {
    return { status: 'error', message: err instanceof Error ? err.message : 'Save failed.' };
  }

  redirect('/admin/brands');
}
