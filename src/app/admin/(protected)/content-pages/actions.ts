'use server';

import { redirect } from 'next/navigation';
import { z } from 'zod';

import { checkAdminAccess } from '@/lib/admin/auth';
import {
  createContentPage,
  updateContentPage,
  type ContentPageInput,
} from '@/lib/admin/content-pages';
import { createClient } from '@/lib/supabase/server';

// Same slug shape as brands/categories — kept in sync by hand with the
// `content_pages_slug_check` constraint in the migration.
const SLUG_RE = /^[a-z0-9-]+$/;

const contentPageSchema = z.object({
  titleAr: z.string().trim().min(1),
  titleEn: z.string().trim().min(1).nullable(),
  bodyAr: z.string().trim().min(1),
  bodyEn: z.string().trim().min(1).nullable(),
  heroImageUrl: z.string().trim().url().nullable(),
  published: z.boolean(),
});

export type ContentPageFormState = { status: 'idle' | 'error'; message?: string };

function emptyToNull(value: FormDataEntryValue | null): string | null {
  const s = typeof value === 'string' ? value.trim() : '';
  return s.length > 0 ? s : null;
}

export async function saveContentPage(
  pageId: string | null,
  _prevState: ContentPageFormState,
  formData: FormData,
): Promise<ContentPageFormState> {
  const access = await checkAdminAccess();
  if (!access.isAdmin) return { status: 'error', message: 'Not authorized.' };

  const parsed = contentPageSchema.safeParse({
    titleAr: formData.get('titleAr'),
    titleEn: emptyToNull(formData.get('titleEn')),
    bodyAr: formData.get('bodyAr'),
    bodyEn: emptyToNull(formData.get('bodyEn')),
    heroImageUrl: emptyToNull(formData.get('heroImageUrl')),
    published: formData.get('published') === 'on',
  });
  if (!parsed.success) {
    return { status: 'error', message: parsed.error.issues[0]?.message ?? 'Invalid input.' };
  }

  const input: ContentPageInput = parsed.data;

  try {
    const client = await createClient();
    if (pageId) {
      await updateContentPage(client, pageId, input);
    } else {
      // Slug only ever comes from the create form — `saveContentPage`'s
      // `pageId === null` branch is the only path that can set one, so an
      // edit can never smuggle a slug change through this action.
      const slug = formData.get('slug');
      const slugParsed = z
        .string()
        .regex(SLUG_RE, 'lowercase letters, numbers, hyphens only')
        .safeParse(slug);
      if (!slugParsed.success)
        return { status: 'error', message: slugParsed.error.issues[0].message };
      await createContentPage(client, slugParsed.data, input);
    }
  } catch (err) {
    return { status: 'error', message: err instanceof Error ? err.message : 'Save failed.' };
  }

  redirect('/admin/content-pages');
}
