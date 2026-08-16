/**
 * Admin coupon CRUD (Task 3.7). Service-role client, not the cookie-bound
 * one — `20260813000002_commerce.sql` is explicit that `coupons` has no RLS
 * policy at all, for any role, so codes can't be enumerated by a client;
 * same posture as `orders.ts` (Task 3.5). `checkAdminAccess()` in the
 * caller is the only gate.
 *
 * Write-side only — reading a coupon by code to validate it at checkout is
 * `validateCoupon` in `lib/commerce/coupons.ts` (2.8) and stays untouched;
 * this module never runs `evaluateCoupon`, it just persists the rows that
 * function reads.
 */

import type { SupabaseClient } from '@supabase/supabase-js';

import type { Database, Tables } from '@/lib/supabase/types';

type AdminClient = SupabaseClient<Database>;

/** Postgres unique-violation code — see the race note in `cart.ts`. */
const UNIQUE_VIOLATION = '23505';

export type Coupon = Tables<'coupons'>;

export type CouponInput = {
  code: string;
  type: 'percent' | 'fixed';
  value: number;
  minOrderMinor: number | null;
  startsAt: string | null;
  endsAt: string | null;
  usageLimit: number | null;
  perUserLimit: number | null;
  active: boolean;
};

export class CouponInputError extends Error {}

/** Mirrors `coupons`' check constraints — see that migration for the
 * authoritative bounds. `code = upper(code)` is enforced by uppercasing
 * below rather than rejecting, same as `validateCoupon`'s lookup. */
function validate(input: CouponInput): void {
  if (!(input.value > 0)) throw new CouponInputError('Value must be greater than 0.');
  if (input.type === 'percent' && input.value > 100) {
    throw new CouponInputError('Percent coupons cannot exceed 100.');
  }
  if (input.minOrderMinor !== null && !(input.minOrderMinor >= 0)) {
    throw new CouponInputError('Minimum order cannot be negative.');
  }
  if (input.usageLimit !== null && !(input.usageLimit > 0)) {
    throw new CouponInputError('Usage limit must be greater than 0.');
  }
  if (input.perUserLimit !== null && !(input.perUserLimit > 0)) {
    throw new CouponInputError('Per-user limit must be greater than 0.');
  }
  if (input.startsAt && input.endsAt && input.startsAt >= input.endsAt) {
    throw new CouponInputError('Start date must be before end date.');
  }
}

function toCouponRow(input: CouponInput) {
  return {
    code: input.code.trim().toUpperCase(),
    type: input.type,
    value: input.value,
    min_order_minor: input.minOrderMinor,
    starts_at: input.startsAt,
    ends_at: input.endsAt,
    usage_limit: input.usageLimit,
    per_user_limit: input.perUserLimit,
    active: input.active,
  };
}

export async function listCoupons(admin: AdminClient): Promise<Coupon[]> {
  const { data, error } = await admin.from('coupons').select('*').order('created_at', { ascending: false });
  if (error) throw new Error(`listing coupons: ${error.message}`);
  return data;
}

export async function getCoupon(admin: AdminClient, id: string): Promise<Coupon | null> {
  const { data, error } = await admin.from('coupons').select('*').eq('id', id).maybeSingle();
  if (error) throw new Error(`reading coupon: ${error.message}`);
  return data;
}

export async function createCoupon(admin: AdminClient, input: CouponInput): Promise<string> {
  validate(input);

  const { data, error } = await admin.from('coupons').insert(toCouponRow(input)).select('id').single();
  if (error) {
    if (error.code === UNIQUE_VIOLATION) throw new Error(`Code "${input.code}" is already in use.`);
    throw new Error(`creating coupon: ${error.message}`);
  }
  return data.id;
}

/**
 * Deactivating (`active: false`) is the only "delete" this admits — `orders`
 * stores `coupon_code` as a plain text snapshot, not a foreign key (see the
 * schema comment), so a past order's discount line stays intact no matter
 * what happens to the coupon row afterward. There is no `deleteCoupon`.
 */
export async function updateCoupon(admin: AdminClient, id: string, input: CouponInput): Promise<void> {
  validate(input);

  const { error } = await admin.from('coupons').update(toCouponRow(input)).eq('id', id);
  if (error) {
    if (error.code === UNIQUE_VIOLATION) throw new Error(`Code "${input.code}" is already in use.`);
    throw new Error(`updating coupon: ${error.message}`);
  }
}
