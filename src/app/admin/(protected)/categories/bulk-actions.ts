'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';

import { checkAdminAccess } from '@/lib/admin/auth';
import { bulkSetCategoryArchived } from '@/lib/admin/taxonomy';
import { createClient } from '@/lib/supabase/server';

const idsSchema = z.array(z.uuid()).min(1);

export async function bulkArchiveCategories(ids: string[]): Promise<void> {
  const access = await checkAdminAccess();
  if (!access.isAdmin) throw new Error('Not authorized.');

  const parsed = idsSchema.parse(ids);

  const client = await createClient();
  await bulkSetCategoryArchived(client, parsed, true);
  revalidatePath('/admin/categories');
}

export async function bulkRestoreCategories(ids: string[]): Promise<void> {
  const access = await checkAdminAccess();
  if (!access.isAdmin) throw new Error('Not authorized.');

  const parsed = idsSchema.parse(ids);

  const client = await createClient();
  await bulkSetCategoryArchived(client, parsed, false);
  revalidatePath('/admin/categories');
}
