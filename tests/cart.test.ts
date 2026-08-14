import { describe, expect, it } from 'vitest';

import {
  CartOperationError,
  resolveAddQty,
  resolveCartMerge,
  resolveSetQty,
} from '@/lib/commerce/cart';

describe('resolveAddQty', () => {
  it('adds to an empty line within stock', () => {
    expect(resolveAddQty(0, 3, 10)).toEqual({ status: 'ok', qty: 3 });
  });

  it('adds on top of an existing line within stock', () => {
    expect(resolveAddQty(4, 3, 10)).toEqual({ status: 'ok', qty: 7 });
  });

  it('clamps to remaining stock when the request would exceed it', () => {
    expect(resolveAddQty(8, 5, 10)).toEqual({ status: 'clamped', qty: 10 });
  });

  it('lands exactly on stock without clamping when the sum matches it exactly', () => {
    expect(resolveAddQty(6, 4, 10)).toEqual({ status: 'ok', qty: 10 });
  });

  it('clamps even when the existing qty alone already fills stock', () => {
    expect(resolveAddQty(10, 1, 10)).toEqual({ status: 'clamped', qty: 10 });
  });

  it('rejects a variant with zero stock', () => {
    expect(() => resolveAddQty(0, 1, 0)).toThrow(CartOperationError);
    expect(() => resolveAddQty(0, 1, 0)).toThrow(/out_of_stock/);
  });

  it('rejects a variant with negative stock', () => {
    expect(() => resolveAddQty(0, 1, -1)).toThrow(CartOperationError);
  });

  it('rejects a zero requested quantity', () => {
    expect(() => resolveAddQty(0, 0, 10)).toThrow(RangeError);
  });

  it('rejects a negative requested quantity', () => {
    expect(() => resolveAddQty(0, -1, 10)).toThrow(RangeError);
  });

  it('rejects a non-integer requested quantity', () => {
    expect(() => resolveAddQty(0, 1.5, 10)).toThrow(RangeError);
  });

  it('rejects a negative existing quantity', () => {
    expect(() => resolveAddQty(-1, 1, 10)).toThrow(RangeError);
  });

  it('rejects a non-integer existing quantity', () => {
    expect(() => resolveAddQty(1.5, 1, 10)).toThrow(RangeError);
  });
});

describe('resolveSetQty', () => {
  it('sets an exact quantity within stock', () => {
    expect(resolveSetQty(5, 10)).toEqual({ status: 'ok', qty: 5 });
  });

  it('clamps to stock when the request exceeds it', () => {
    expect(resolveSetQty(15, 10)).toEqual({ status: 'clamped', qty: 10 });
  });

  it('does not clamp when the request lands exactly on stock', () => {
    expect(resolveSetQty(10, 10)).toEqual({ status: 'ok', qty: 10 });
  });

  it('setting to zero always succeeds, regardless of stock', () => {
    expect(resolveSetQty(0, 10)).toEqual({ status: 'ok', qty: 0 });
  });

  it('setting to zero succeeds even when stock is itself zero', () => {
    expect(resolveSetQty(0, 0)).toEqual({ status: 'ok', qty: 0 });
  });

  it('rejects a nonzero request against zero stock', () => {
    expect(() => resolveSetQty(1, 0)).toThrow(CartOperationError);
    expect(() => resolveSetQty(1, 0)).toThrow(/out_of_stock/);
  });

  it('rejects a nonzero request against negative stock', () => {
    expect(() => resolveSetQty(1, -1)).toThrow(CartOperationError);
  });

  it('rejects a negative requested quantity', () => {
    expect(() => resolveSetQty(-1, 10)).toThrow(RangeError);
  });

  it('rejects a non-integer requested quantity', () => {
    expect(() => resolveSetQty(1.5, 10)).toThrow(RangeError);
  });
});

describe('resolveCartMerge', () => {
  it('sums quantities on an overlapping line, clamped to stock', () => {
    const stock = new Map([['v1', 10]]);
    const result = resolveCartMerge([{ variantId: 'v1', qty: 4 }], [{ variantId: 'v1', qty: 3 }], stock);
    expect(result).toEqual([{ variantId: 'v1', qty: 7 }]);
  });

  it('clamps an overlapping line that would exceed stock', () => {
    const stock = new Map([['v1', 10]]);
    const result = resolveCartMerge([{ variantId: 'v1', qty: 8 }], [{ variantId: 'v1', qty: 5 }], stock);
    expect(result).toEqual([{ variantId: 'v1', qty: 10 }]);
  });

  it('carries over a disjoint guest line untouched by the customer cart', () => {
    const stock = new Map([
      ['v1', 10],
      ['v2', 5],
    ]);
    const result = resolveCartMerge([{ variantId: 'v1', qty: 2 }], [{ variantId: 'v2', qty: 3 }], stock);
    expect(result).toEqual(
      expect.arrayContaining([
        { variantId: 'v1', qty: 2 },
        { variantId: 'v2', qty: 3 },
      ]),
    );
    expect(result).toHaveLength(2);
  });

  it('returns the guest lines unchanged when the customer cart is empty', () => {
    const stock = new Map([['v1', 10]]);
    const result = resolveCartMerge([], [{ variantId: 'v1', qty: 3 }], stock);
    expect(result).toEqual([{ variantId: 'v1', qty: 3 }]);
  });

  it('returns the customer lines unchanged when the guest cart is empty', () => {
    const stock = new Map([['v1', 10]]);
    const result = resolveCartMerge([{ variantId: 'v1', qty: 3 }], [], stock);
    expect(result).toEqual([{ variantId: 'v1', qty: 3 }]);
  });

  it('is a no-op when both carts are empty', () => {
    expect(resolveCartMerge([], [], new Map())).toEqual([]);
  });

  it('drops a guest line whose variant no longer exists', () => {
    const stock = new Map([['v1', 10]]);
    const result = resolveCartMerge([], [{ variantId: 'gone', qty: 1 }], stock);
    expect(result).toEqual([]);
  });

  it('drops a guest line whose variant is out of stock', () => {
    const stock = new Map([['v1', 0]]);
    const result = resolveCartMerge([], [{ variantId: 'v1', qty: 1 }], stock);
    expect(result).toEqual([]);
  });

  // Idempotency itself lives one layer up, in `mergeGuestCartIntoCustomer`:
  // it deletes the guest cart row once merged, so a second login finds no
  // guest cart at all rather than re-submitting the same guest lines here.
  // What this function must guarantee is the half of that contract it owns —
  // merging *nothing* changes *nothing* — already covered above by "returns
  // the customer lines unchanged when the guest cart is empty".
});
