/**
 * Admin order list + status/tracking writes (Task 3.5). Every function here
 * takes the service-role client, not the cookie-bound one — the schema
 * comment on `orders` in `20260813000002_commerce.sql` is explicit that no
 * client, authenticated or not, gets an RLS policy to read someone else's
 * order or write to any order: order creation and every status change goes
 * through a server action using the service-role client, always. Admin is
 * no exception. `checkAdminAccess()` in the caller is the security boundary
 * here, same as `images.ts` (Task 3.3), not a database policy — there isn't
 * one, on purpose.
 */

import type { SupabaseClient } from '@supabase/supabase-js';

import { getOrderById, type OrderDetail } from '@/lib/commerce/orders';
import type { FulfilmentStatus } from '@/lib/commerce/fulfilment';
import type { Database, Tables } from '@/lib/supabase/types';

type AdminClient = SupabaseClient<Database>;
type PaymentStatus = Database['public']['Enums']['payment_status'];

export type OrderListItem = Pick<
  Tables<'orders'>,
  | 'id'
  | 'order_number'
  | 'country_code'
  | 'currency'
  | 'total_minor'
  | 'payment_status'
  | 'fulfilment_status'
  | 'guest_email'
  | 'created_at'
>;

export type OrderListFilters = {
  paymentStatus?: PaymentStatus;
  fulfilmentStatus?: FulfilmentStatus;
  countryCode?: string;
  page?: number;
};

const PAGE_SIZE = 25;

export async function listOrders(
  admin: AdminClient,
  filters: OrderListFilters,
): Promise<{ items: OrderListItem[]; total: number }> {
  const page = Math.max(1, filters.page ?? 1);
  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  let query = admin
    .from('orders')
    .select(
      'id, order_number, country_code, currency, total_minor, payment_status, fulfilment_status, guest_email, created_at',
      { count: 'exact' },
    )
    .order('created_at', { ascending: false })
    .range(from, to);

  if (filters.paymentStatus) query = query.eq('payment_status', filters.paymentStatus);
  if (filters.fulfilmentStatus) query = query.eq('fulfilment_status', filters.fulfilmentStatus);
  if (filters.countryCode) query = query.eq('country_code', filters.countryCode);

  const { data, error, count } = await query;
  if (error) throw new Error(`listing orders: ${error.message}`);

  return { items: data ?? [], total: count ?? 0 };
}

export async function getOrderForAdmin(admin: AdminClient, orderId: string): Promise<OrderDetail | null> {
  return getOrderById(admin, orderId);
}

/**
 * `mark_fulfilment_status` is in generated `types.ts` now, but typegen
 * doesn't express function-arg nullability — see the identical comment on
 * `DatabaseWithMarkPaymentStatus` in `apply-webhook-result.ts`. `Omit` at
 * *every* nesting level, not just `Functions`: `Database & {public: ...}`
 * alone still merges the untouched top-level `public` back in, which
 * re-collides at `Functions.mark_fulfilment_status` one level down and
 * collapses `p_note` to non-nullable again.
 */
type DatabaseWithMarkFulfilmentStatus = Omit<Database, 'public'> & {
  public: Omit<Database['public'], 'Functions'> & {
    Functions: Omit<Database['public']['Functions'], 'mark_fulfilment_status'> & {
      mark_fulfilment_status: {
        Args: { p_order_id: string; p_status: FulfilmentStatus; p_note: string | null; p_created_by: string };
        Returns: boolean;
      };
    };
  };
};

/**
 * Returns `false` (not a thrown error) if the transition was invalid or
 * already applied — same "let the RPC's atomic guard decide" shape as
 * `applyPaymentWebhookResult`. The caller (the server action) turns a
 * `false` into a user-facing message; this function just reports what
 * happened.
 */
export async function transitionFulfilmentStatus(
  admin: AdminClient,
  orderId: string,
  status: FulfilmentStatus,
  note: string | null,
  staffUserId: string,
): Promise<boolean> {
  const client = admin as unknown as SupabaseClient<DatabaseWithMarkFulfilmentStatus>;

  const { data, error } = await client.rpc('mark_fulfilment_status', {
    p_order_id: orderId,
    p_status: status,
    p_note: note,
    p_created_by: staffUserId,
  });
  if (error) throw new Error(`transitioning fulfilment status: ${error.message}`);

  return data;
}

export async function updateTracking(
  admin: AdminClient,
  orderId: string,
  input: { trackingNumber: string | null; trackingUrl: string | null },
): Promise<void> {
  const { error } = await admin
    .from('orders')
    .update({ tracking_number: input.trackingNumber, tracking_url: input.trackingUrl })
    .eq('id', orderId);
  if (error) throw new Error(`updating tracking info: ${error.message}`);
}
