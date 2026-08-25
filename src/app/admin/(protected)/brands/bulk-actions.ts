'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';

import { checkAdminAccess } from '@/lib/admin/auth';
import { bulkSetBrandArchived } from '@/lib/admin/taxonomy';
import { createClient } from '@/lib/supabase/server';

const idsSchema = z.array(z.uuid()).min(1);

export async function bulkArchiveBrands(ids: string[]): Promise<void> {
  const access = await checkAdminAccess();
  if (!access.isAdmin) throw new Error('Not authorized.');

  const parsed = idsSchema.parse(ids);

  const client = await createClient();
  await bulkSetBrandArchived(client, parsed, true);
  revalidatePath('/admin/brands');
}

export async function bulkRestoreBrands(ids: string[]): Promise<void> {
  const access = await checkAdminAccess();
  if (!access.isAdmin) throw new Error('Not authorized.');

  const parsed = idsSchema.parse(ids);

  const client = await createClient();
  await bulkSetBrandArchived(client, parsed, false);
  revalidatePath('/admin/brands');
}
