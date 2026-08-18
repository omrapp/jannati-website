'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

import { checkAdminAccess } from '@/lib/admin/auth';
import { resolveOrderContactEmail, transitionFulfilmentStatus, updateTracking } from '@/lib/admin/orders';
import { getCountry } from '@/lib/catalog/queries';
import { FULFILMENT_STATUSES, type FulfilmentStatus } from '@/lib/commerce/fulfilment';
import { getOrderById, type ShippingAddressInput } from '@/lib/commerce/orders';
import { dispatchOrderNotification } from '@/lib/notifications/dispatch';
import type { NotificationEvent } from '@/lib/notifications/types';
import type { Locale } from '@/i18n/config';
import { createAdminClient } from '@/lib/supabase/admin';

function emptyToNull(value: FormDataEntryValue | null): string | null {
  const s = typeof value === 'string' ? value.trim() : '';
  return s.length > 0 ? s : null;
}

// Only these two fulfilment statuses have a customer-facing notification —
// `pending`/`processing`/`cancelled` are staff-internal, no template exists
// for them (see `NotificationEvent` in notifications/types.ts).
const NOTIFIABLE_STATUS_EVENTS: Partial<Record<FulfilmentStatus, NotificationEvent>> = {
  shipped: 'order_shipped',
  delivered: 'order_delivered',
};

/**
 * Best-effort: re-reads the order fresh (not the pre-transition state the
 * form submitted against) so the notification reflects what was actually
 * just committed — same "trust the transition's own result, not client
 * state" instinct as everything else in this file.
 */
async function notifyStatusChange(orderId: string, status: FulfilmentStatus): Promise<void> {
  const event = NOTIFIABLE_STATUS_EVENTS[status];
  if (!event) return;

  const admin = createAdminClient();
  const detail = await getOrderById(admin, orderId);
  if (!detail) return;

  const { order } = detail;
  const [email, country] = await Promise.all([
    resolveOrderContactEmail(admin, order),
    getCountry(order.locale as Locale),
  ]);
  const address = order.shipping_address as unknown as ShippingAddressInput;

  await dispatchOrderNotification({
    event,
    orderNumber: order.order_number,
    locale: order.locale as Locale,
    customerName: address.fullName,
    customerEmail: email,
    customerPhone: address.phone,
    totalMinor: order.total_minor,
    currency: country.currency,
    currencyExponent: country.currency_exponent,
    trackingUrl: order.tracking_url,
  });
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
  if (applied) {
    revalidatePath(`/admin/orders/${orderId}`);
    await notifyStatusChange(orderId, status);
  }
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
