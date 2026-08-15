import { describe, expect, it } from 'vitest';

import { evaluateCoupon, type CouponRow } from '@/lib/commerce/coupons';

const now = new Date('2026-06-15T12:00:00Z');

const baseCoupon: CouponRow = {
  code: 'SAVE10',
  type: 'percent',
  value: 10,
  minOrderMinor: null,
  startsAt: null,
  endsAt: null,
  usageLimit: null,
  perUserLimit: null,
  active: true,
};

const baseContext = { subtotalMinorOmr: 10_000, now, usageCount: 0, userUsageCount: 0 };

describe('evaluateCoupon', () => {
  it('accepts an unrestricted active coupon', () => {
    expect(evaluateCoupon(baseCoupon, baseContext)).toEqual({
      status: 'valid',
      coupon: { type: 'percent', value: 10 },
    });
  });

  it('rejects an inactive coupon', () => {
    const coupon = { ...baseCoupon, active: false };
    expect(evaluateCoupon(coupon, baseContext)).toEqual({ status: 'rejected', reason: 'inactive' });
  });

  it('rejects a coupon that has not started yet', () => {
    const coupon = { ...baseCoupon, startsAt: new Date('2026-07-01T00:00:00Z') };
    expect(evaluateCoupon(coupon, baseContext)).toEqual({ status: 'rejected', reason: 'not_started' });
  });

  it('accepts a coupon right at its start instant', () => {
    const coupon = { ...baseCoupon, startsAt: now };
    expect(evaluateCoupon(coupon, baseContext).status).toBe('valid');
  });

  it('rejects an expired coupon', () => {
    const coupon = { ...baseCoupon, endsAt: new Date('2026-06-01T00:00:00Z') };
    expect(evaluateCoupon(coupon, baseContext)).toEqual({ status: 'rejected', reason: 'expired' });
  });

  it('treats the end instant itself as expired', () => {
    const coupon = { ...baseCoupon, endsAt: now };
    expect(evaluateCoupon(coupon, baseContext)).toEqual({ status: 'rejected', reason: 'expired' });
  });

  it('accepts a coupon one tick before its end instant', () => {
    const coupon = { ...baseCoupon, endsAt: new Date(now.getTime() + 1) };
    expect(evaluateCoupon(coupon, baseContext).status).toBe('valid');
  });

  it('rejects a cart below the minimum order', () => {
    const coupon = { ...baseCoupon, minOrderMinor: 20_000 };
    expect(evaluateCoupon(coupon, baseContext)).toEqual({
      status: 'rejected',
      reason: 'below_minimum',
    });
  });

  it('accepts a cart exactly at the minimum order', () => {
    const coupon = { ...baseCoupon, minOrderMinor: 10_000 };
    expect(evaluateCoupon(coupon, baseContext).status).toBe('valid');
  });

  it('rejects once the global usage limit is reached', () => {
    const coupon = { ...baseCoupon, usageLimit: 5 };
    expect(evaluateCoupon(coupon, { ...baseContext, usageCount: 5 })).toEqual({
      status: 'rejected',
      reason: 'usage_limit_reached',
    });
  });

  it('accepts one redemption below the global usage limit', () => {
    const coupon = { ...baseCoupon, usageLimit: 5 };
    expect(evaluateCoupon(coupon, { ...baseContext, usageCount: 4 }).status).toBe('valid');
  });

  it('rejects once the per-user limit is reached', () => {
    const coupon = { ...baseCoupon, perUserLimit: 1 };
    expect(evaluateCoupon(coupon, { ...baseContext, userUsageCount: 1 })).toEqual({
      status: 'rejected',
      reason: 'per_user_limit_reached',
    });
  });

  it('skips the per-user check when usage cannot be attributed (guest, no email yet)', () => {
    const coupon = { ...baseCoupon, perUserLimit: 1 };
    expect(evaluateCoupon(coupon, { ...baseContext, userUsageCount: null }).status).toBe('valid');
  });

  it('checks rejection reasons in a fixed priority order', () => {
    // Inactive AND expired AND below minimum at once — inactive wins, so a
    // caller showing one reason at a time always shows the most fundamental
    // one first rather than an arbitrary pick.
    const coupon: CouponRow = {
      ...baseCoupon,
      active: false,
      endsAt: new Date('2020-01-01T00:00:00Z'),
      minOrderMinor: 999_999,
    };
    expect(evaluateCoupon(coupon, baseContext)).toEqual({ status: 'rejected', reason: 'inactive' });
  });

  it('applies a fixed-value coupon as-is, in OMR minor units', () => {
    const coupon: CouponRow = { ...baseCoupon, type: 'fixed', value: 1000 };
    expect(evaluateCoupon(coupon, baseContext)).toEqual({
      status: 'valid',
      coupon: { type: 'fixed', value: 1000 },
    });
  });
});
