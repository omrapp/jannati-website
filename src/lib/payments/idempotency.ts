/**
 * Which `payment_status` transitions a webhook is allowed to apply. Every
 * gateway can redeliver the same event (Tap and Thawani both retry on a
 * non-2xx response) and can deliver events out of order — a stray retry of
 * an already-applied "paid" event, or a "failed" arriving after "paid" has
 * already landed, must both be no-ops rather than corrupting the order.
 *
 * This mirrors the `where` clause in `mark_payment_status`
 * (`supabase/migrations/20260815000002_mark_payment_status_rpc.sql`)
 * exactly — the SQL is the actual atomic guard (two concurrent webhook
 * deliveries race on the same row lock there), this is the same rule kept
 * in one place that's actually unit-testable without a database, same split
 * as `resolveAddQty`/`resolveCartMerge` vs. their RPCs.
 */

import type { Database } from '@/lib/supabase/types';

export type PaymentStatus = Database['public']['Enums']['payment_status'];

const ALLOWED_TRANSITIONS: Record<PaymentStatus, readonly PaymentStatus[]> = {
  pending: ['paid', 'failed'],
  paid: ['refunded'],
  failed: [],
  refunded: [],
};

export function isAllowedPaymentTransition(from: PaymentStatus, to: PaymentStatus): boolean {
  return ALLOWED_TRANSITIONS[from].includes(to);
}
