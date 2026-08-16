'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

import { checkAdminAccess } from '@/lib/admin/auth';
import { transitionFulfilmentStatus, updateTracking } from '@/lib/admin/orders';
import { FULFILMENT_STATUSES, type FulfilmentStatus } from '@/lib/commerce/fulfilment';
import { createAdminClient } from '@/lib/supabase/admin';

function emptyToNull(value: FormDataEntryValue | null): string | null {
  const s = typeof value === 'string' ? value.trim() : '';
  return s.length > 0 ? s : null;
}

export async function transitionFulfilmentStatusAction(
  orderId: string,
  status: FulfilmentStatus,
  formData: FormData,
): Promise<void> {
  const access = await checkAdminAccess();
  if (!access.isAdmin) throw new Error('Not authorized.');
  if (!FULFILMENT_STATUSES.includes(status)) throw new Error('Unknown status.');

  const note = emptyToNull(formData.get('note'));
  const applied = await transitionFulfilmentStatus(createAdminClient(), orderId, status, note, access.user.id);

  // A rejected transition (stale page, already moved on by someone else) is
  // silently a no-op rather than an error page — the fresh state the reload
  // shows afterward is the actual feedback.
  if (applied) revalidatePath(`/admin/orders/${orderId}`);
  redirect(`/admin/orders/${orderId}`);
}

export async function updateTrackingAction(orderId: string, formData: FormData): Promise<void> {
  const access = await checkAdminAccess();
  if (!access.isAdmin) throw new Error('Not authorized.');

  await updateTracking(createAdminClient(), orderId, {
    trackingNumber: emptyToNull(formData.get('trackingNumber')),
    trackingUrl: emptyToNull(formData.get('trackingUrl')),
  });

  revalidatePath(`/admin/orders/${orderId}`);
  redirect(`/admin/orders/${orderId}`);
}
