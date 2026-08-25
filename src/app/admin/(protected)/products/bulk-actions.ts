'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';

import { checkAdminAccess } from '@/lib/admin/auth';
import { bulkSetProductStatus } from '@/lib/admin/products';
import { createClient } from '@/lib/supabase/server';

const idsSchema = z.array(z.uuid()).min(1);

export async function bulkArchiveProducts(ids: string[]): Promise<void> {
  const access = await checkAdminAccess();
  if (!access.isAdmin) throw new Error('Not authorized.');

  const parsed = idsSchema.parse(ids);

  const client = await createClient();
  await bulkSetProductStatus(client, parsed, 'archived');
  revalidatePath('/admin/products');
}

export async function bulkRestoreProducts(ids: string[]): Promise<void> {
  const access = await checkAdminAccess();
  if (!access.isAdmin) throw new Error('Not authorized.');

  const parsed = idsSchema.parse(ids);

  const client = await createClient();
  await bulkSetProductStatus(client, parsed, 'active');
  revalidatePath('/admin/products');
}
