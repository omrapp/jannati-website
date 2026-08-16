'use server';

import { revalidatePath } from 'next/cache';

import { checkAdminAccess } from '@/lib/admin/auth';
import { setReviewStatus } from '@/lib/admin/reviews';
import { createClient } from '@/lib/supabase/server';

export async function approveReviewAction(reviewId: string): Promise<void> {
  const access = await checkAdminAccess();
  if (!access.isAdmin) throw new Error('Not authorized.');

  await setReviewStatus(await createClient(), reviewId, 'approved');
  revalidatePath('/admin/reviews');
}

export async function rejectReviewAction(reviewId: string): Promise<void> {
  const access = await checkAdminAccess();
  if (!access.isAdmin) throw new Error('Not authorized.');

  await setReviewStatus(await createClient(), reviewId, 'rejected');
  revalidatePath('/admin/reviews');
}
