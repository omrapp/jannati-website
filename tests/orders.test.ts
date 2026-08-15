import { describe, expect, it } from 'vitest';

import {
  assertSufficientStock,
  formatOrderNumber,
  OrderCreationError,
  signOrderToken,
  toOrderItemSnapshots,
  verifyOrderToken,
  type OrderableLine,
} from '@/lib/commerce/orders';

const baseLine: OrderableLine = {
  variantId: 'v1',
  sku: 'SKU-1',
  nameSnapshot: 'Rose Perfume — 50ml',
  unitPriceMinor: 5000,
  qty: 2,
  stockQty: 10,
};

describe('formatOrderNumber', () => {
  it('pads the date and appends the given suffix', () => {
    expect(formatOrderNumber(new Date('2026-03-05T00:00:00Z'), 'AB12CD34')).toBe(
      'JNT-20260305-AB12CD34',
    );
  });
});

describe('assertSufficientStock', () => {
  it('passes when every line is within stock', () => {
    expect(() => assertSufficientStock([baseLine])).not.toThrow();
  });

  it('rejects a line requesting more than is in stock', () => {
    const line = { ...baseLine, qty: 11 };
    expect(() => assertSufficientStock([line])).toThrow(OrderCreationError);
    expect(() => assertSufficientStock([line])).toThrow(/out_of_stock/);
  });

  it('allows a line requesting exactly the remaining stock', () => {
    const line = { ...baseLine, qty: 10 };
    expect(() => assertSufficientStock([line])).not.toThrow();
  });
});

describe('toOrderItemSnapshots', () => {
  it('computes each line total as unit price times quantity', () => {
    expect(toOrderItemSnapshots([baseLine])).toEqual([
      {
        variantId: 'v1',
        sku: 'SKU-1',
        nameSnapshot: 'Rose Perfume — 50ml',
        unitPriceMinor: 5000,
        qty: 2,
        lineTotalMinor: 10_000,
      },
    ]);
  });

  it('rejects a negative unit price', () => {
    const line = { ...baseLine, unitPriceMinor: -1 };
    expect(() => toOrderItemSnapshots([line])).toThrow(RangeError);
  });

  it('rejects a zero or negative quantity', () => {
    expect(() => toOrderItemSnapshots([{ ...baseLine, qty: 0 }])).toThrow(RangeError);
    expect(() => toOrderItemSnapshots([{ ...baseLine, qty: -1 }])).toThrow(RangeError);
  });

  it('rejects a non-integer quantity', () => {
    expect(() => toOrderItemSnapshots([{ ...baseLine, qty: 1.5 }])).toThrow(RangeError);
  });
});

describe('order confirmation tokens', () => {
  it('verifies a token signed for the same order number', () => {
    const token = signOrderToken('JNT-20260305-AB12CD34');
    expect(verifyOrderToken('JNT-20260305-AB12CD34', token)).toBe(true);
  });

  it('rejects a token signed for a different order number', () => {
    const token = signOrderToken('JNT-20260305-AB12CD34');
    expect(verifyOrderToken('JNT-20260305-OTHER999', token)).toBe(false);
  });

  it('rejects a missing token', () => {
    expect(verifyOrderToken('JNT-20260305-AB12CD34', undefined)).toBe(false);
    expect(verifyOrderToken('JNT-20260305-AB12CD34', null)).toBe(false);
  });

  it('rejects a garbage token', () => {
    expect(verifyOrderToken('JNT-20260305-AB12CD34', 'not-a-real-token')).toBe(false);
  });
});
