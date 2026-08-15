/**
 * Coupon lookup and validation. `public.coupons` has no applied-coupon
 * column on `carts` — a code is only ever checked at checkout time (2.9),
 * never persisted against a cart — so there is nothing to "stack": a coupon
 * is validated fresh each time a code is submitted, and `CartCoupon`
 * (`cart-totals.ts`) is a single optional value, not a list, so the reducer
 * has no slot for a second one even if a caller tried.
 *
 * `supabase/migrations/20260813000002_commerce.sql` derives usage counts
 * from `orders.coupon_code` rather than a counter column, so a count can
 * never drift out of sync with the orders it describes — this module reads
 * that derivation, it doesn't maintain one. Validation only ever reads; the
 * only thing that increments a coupon's usage is an order actually getting
 * created (2.9), which is also where the count gets re-checked so a coupon
 * that was valid when a shopper typed it in can't be over-redeemed by two
 * concurrent checkouts both validating against the same stale count.
 */

import type { SupabaseClient } from '@supabase/supabase-js';

import type { CartCoupon } from './cart-totals';
import type { Database, Tables } from '@/lib/supabase/types';

type Client = SupabaseClient<Database>;

export type CouponRow = {
  code: string;
  type: 'percent' | 'fixed';
  value: number;
  minOrderMinor: number | null;
  startsAt: Date | null;
  endsAt: Date | null;
  usageLimit: number | null;
  perUserLimit: number | null;
  active: boolean;
};

export type CouponRejectionReason =
  | 'not_found'
  | 'inactive'
  | 'not_started'
  | 'expired'
  | 'below_minimum'
  | 'usage_limit_reached'
  | 'per_user_limit_reached';

export type CouponValidation =
  | { status: 'valid'; coupon: CartCoupon }
  | { status: 'rejected'; reason: CouponRejectionReason };

/**
 * Pure rule check — no Supabase, no clock read of its own — so every
 * rejection reason is testable without a database. `usageCount` and
 * `userUsageCount` are pre-counted by the caller (`validateCoupon` below);
 * `userUsageCount: null` means "can't be determined" (a guest who hasn't
 * given an email yet) and skips the per-user check entirely rather than
 * treating it as zero, since zero would wrongly let an already-redeemed
 * guest reuse a per-user-limited code just by clearing cookies.
 */
export function evaluateCoupon(
  coupon: CouponRow,
  context: {
    subtotalMinorOmr: number;
    now: Date;
    usageCount: number;
    userUsageCount: number | null;
  },
): CouponValidation {
  if (!coupon.active) return { status: 'rejected', reason: 'inactive' };
  if (coupon.startsAt && context.now < coupon.startsAt) {
    return { status: 'rejected', reason: 'not_started' };
  }
  if (coupon.endsAt && context.now >= coupon.endsAt) {
    return { status: 'rejected', reason: 'expired' };
  }
  if (coupon.minOrderMinor != null && context.subtotalMinorOmr < coupon.minOrderMinor) {
    return { status: 'rejected', reason: 'below_minimum' };
  }
  if (coupon.usageLimit != null && context.usageCount >= coupon.usageLimit) {
    return { status: 'rejected', reason: 'usage_limit_reached' };
  }
  if (
    coupon.perUserLimit != null &&
    context.userUsageCount != null &&
    context.userUsageCount >= coupon.perUserLimit
  ) {
    return { status: 'rejected', reason: 'per_user_limit_reached' };
  }

  return { status: 'valid', coupon: { type: coupon.type, value: coupon.value } };
}

export type CouponIdentity = { customerId: string } | { guestEmail: string | null };

function toCouponRow(row: Tables<'coupons'>): CouponRow {
  return {
    code: row.code,
    type: row.type,
    value: row.value,
    minOrderMinor: row.min_order_minor,
    startsAt: row.starts_at ? new Date(row.starts_at) : null,
    endsAt: row.ends_at ? new Date(row.ends_at) : null,
    usageLimit: row.usage_limit,
    perUserLimit: row.per_user_limit,
    active: row.active,
  };
}

/**
 * An order counts toward usage the moment it's created, matching the
 * schema's "derived from `orders.coupon_code`" design — except a `failed`
 * payment, which means the order never actually completed and shouldn't
 * burn the shopper's (or the coupon's) redemption. `pending` (every fresh
 * COD order, and any online order before its webhook lands) and `refunded`
 * both count: the coupon was genuinely applied at the time the order was
 * placed, and a later refund doesn't retroactively un-use it.
 */
async function countCouponUsage(client: Client, code: string): Promise<number> {
  const { count, error } = await client
    .from('orders')
    .select('id', { count: 'exact', head: true })
    .eq('coupon_code', code)
    .neq('payment_status', 'failed');

  if (error) throw new Error(`counting coupon usage for ${code}: ${error.message}`);

  return count ?? 0;
}

async function countCouponUsageForIdentity(
  client: Client,
  code: string,
  identity: CouponIdentity,
): Promise<number | null> {
  if ('customerId' in identity) {
    const { count, error } = await client
      .from('orders')
      .select('id', { count: 'exact', head: true })
      .eq('coupon_code', code)
      .neq('payment_status', 'failed')
      .eq('customer_id', identity.customerId);

    if (error) throw new Error(`counting coupon usage for customer: ${error.message}`);

    return count ?? 0;
  }

  if (!identity.guestEmail) return null; // no email yet — can't attribute past redemptions

  const { count, error } = await client
    .from('orders')
    .select('id', { count: 'exact', head: true })
    .eq('coupon_code', code)
    .neq('payment_status', 'failed')
    .eq('guest_email', identity.guestEmail);

  if (error) throw new Error(`counting coupon usage for guest: ${error.message}`);

  return count ?? 0;
}

/**
 * Looks up a code, counts its usage, and runs `evaluateCoupon`. `code` is
 * matched case-insensitively against the DB's `code = upper(code)`
 * constraint by uppercasing here rather than relying on the caller — a
 * shopper types codes in whatever case they like.
 *
 * `subtotalMinorOmr` is the cart's subtotal in OMR minor units, before any
 * currency conversion — `coupons.min_order_minor` is stored on that same
 * OMR scale (see the migration's column comment), not the checkout
 * currency's, so this never converts it.
 */
export async function validateCoupon(
  client: Client,
  rawCode: string,
  identity: CouponIdentity,
  subtotalMinorOmr: number,
): Promise<CouponValidation> {
  const code = rawCode.trim().toUpperCase();
  if (!code) return { status: 'rejected', reason: 'not_found' };

  const { data, error } = await client.from('coupons').select('*').eq('code', code).maybeSingle();

  if (error) throw new Error(`reading coupon ${code}: ${error.message}`);
  if (!data) return { status: 'rejected', reason: 'not_found' };

  const coupon = toCouponRow(data);
  const [usageCount, userUsageCount] = await Promise.all([
    countCouponUsage(client, code),
    countCouponUsageForIdentity(client, code, identity),
  ]);

  return evaluateCoupon(coupon, { subtotalMinorOmr, now: new Date(), usageCount, userUsageCount });
}
