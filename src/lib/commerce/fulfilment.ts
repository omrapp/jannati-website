/**
 * Which `fulfilment_status` transitions the admin order-detail page is
 * allowed to apply. Same split as `isAllowedPaymentTransition`
 * (`src/lib/payments/idempotency.ts`): this is the unit-testable mirror of
 * the real atomic guard, the `where` clause in `mark_fulfilment_status`
 * (`supabase/migrations/20260815000007_mark_fulfilment_status_rpc.sql`) —
 * keep both in sync.
 *
 * Forward-only, no going back a step: a fulfilled order that needs
 * correcting is a staff conversation (a note, a new order), not a status
 * field that lies about history by reverting.
 */

import type { Database } from '@/lib/supabase/types';

export type FulfilmentStatus = Database['public']['Enums']['fulfilment_status'];

export const FULFILMENT_STATUSES: readonly FulfilmentStatus[] = [
  'pending',
  'processing',
  'shipped',
  'delivered',
  'cancelled',
];

const ALLOWED_TRANSITIONS: Record<FulfilmentStatus, readonly FulfilmentStatus[]> = {
  pending: ['processing', 'cancelled'],
  processing: ['shipped', 'cancelled'],
  shipped: ['delivered'],
  delivered: [],
  cancelled: [],
};

export function isAllowedFulfilmentTransition(from: FulfilmentStatus, to: FulfilmentStatus): boolean {
  return ALLOWED_TRANSITIONS[from].includes(to);
}
