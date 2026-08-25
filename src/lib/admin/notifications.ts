/**
 * Admin notification bell (`plans/admin-dashboard.md` step 7). No dedicated
 * `notifications` table — `contact_messages.is_read`, `reviews.status`, and
 * `orders.fulfilment_status` already carry their own actionable state, so
 * this reads those three directly and uses `admin_users.notifications_seen_at`
 * (`20260825000001_admin_dashboard_v2.sql`) purely as a per-admin "new since I
 * last opened the panel" cursor, same reasoning as that migration's comment.
 *
 * Service-role client, same posture as `analytics.ts`/`orders.ts`: no RLS
 * policy grants staff a cross-customer read of unread messages or pending
 * reviews, `checkAdminAccess()` in the caller is the gate.
 */

import type { SupabaseClient } from '@supabase/supabase-js';

import type { Database } from '@/lib/supabase/types';

type AdminClient = SupabaseClient<Database>;

export type NotificationType = 'message' | 'review' | 'order';

export type NotificationItem = {
  id: string;
  type: NotificationType;
  title: string;
  createdAt: string;
  href: string;
  /** Created after the admin's `notifications_seen_at` cursor. */
  isNew: boolean;
};

export type NotificationSummary = {
  items: NotificationItem[];
  unseenCount: number;
};

/** Capped per source so one noisy source can't crowd the other two out of the panel. */
const LIMIT_PER_SOURCE = 5;

/**
 * `notifications_seen_at` defaults to `now()` on insert (the migration), so
 * a brand-new admin row already has a cursor — `.single()`, not
 * `.maybeSingle()`, is intentional: a missing row here means the caller
 * passed an id that isn't staff, which is a bug upstream, not a state this
 * function should paper over.
 */
export async function getNotificationSummary(admin: AdminClient, adminUserId: string): Promise<NotificationSummary> {
  const { data: adminRow, error: adminError } = await admin
    .from('admin_users')
    .select('notifications_seen_at')
    .eq('user_id', adminUserId)
    .single();
  if (adminError) throw new Error(`reading notification cursor: ${adminError.message}`);

  const seenAt = adminRow.notifications_seen_at;

  const [messagesResult, reviewsResult, ordersResult] = await Promise.all([
    admin
      .from('contact_messages')
      .select('id, name, created_at')
      .eq('is_read', false)
      .order('created_at', { ascending: false })
      .limit(LIMIT_PER_SOURCE),
    admin
      .from('reviews')
      .select('id, product_id, created_at, products(name_en, name_ar)')
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
      .limit(LIMIT_PER_SOURCE),
    admin
      .from('orders')
      .select('id, order_number, created_at')
      .eq('payment_status', 'paid')
      .eq('fulfilment_status', 'pending')
      .order('created_at', { ascending: false })
      .limit(LIMIT_PER_SOURCE),
  ]);

  if (messagesResult.error) throw new Error(`reading unread messages: ${messagesResult.error.message}`);
  if (reviewsResult.error) throw new Error(`reading pending reviews: ${reviewsResult.error.message}`);
  if (ordersResult.error) throw new Error(`reading orders needing fulfilment: ${ordersResult.error.message}`);

  const items: NotificationItem[] = [
    ...(messagesResult.data ?? []).map((m) => ({
      id: `message-${m.id}`,
      type: 'message' as const,
      title: `New message from ${m.name}`,
      createdAt: m.created_at,
      href: '/admin/messages',
      isNew: m.created_at > seenAt,
    })),
    ...(reviewsResult.data ?? []).map((r) => ({
      id: `review-${r.id}`,
      type: 'review' as const,
      title: `Review pending: ${r.products?.name_en || r.products?.name_ar || r.product_id}`,
      createdAt: r.created_at,
      href: '/admin/reviews',
      isNew: r.created_at > seenAt,
    })),
    ...(ordersResult.data ?? []).map((o) => ({
      id: `order-${o.id}`,
      type: 'order' as const,
      title: `Order ${o.order_number} needs fulfilment`,
      createdAt: o.created_at,
      href: `/admin/orders/${o.id}`,
      isNew: o.created_at > seenAt,
    })),
  ].sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  return { items, unseenCount: items.filter((i) => i.isNew).length };
}

/** Advances the per-admin cursor to now — called when the bell panel is opened. */
export async function markNotificationsSeen(admin: AdminClient, adminUserId: string): Promise<void> {
  const { error } = await admin
    .from('admin_users')
    .update({ notifications_seen_at: new Date().toISOString() })
    .eq('user_id', adminUserId);
  if (error) throw new Error(`updating notification cursor: ${error.message}`);
}
