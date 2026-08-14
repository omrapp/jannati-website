import { describe, expect, it } from 'vitest';

import { CartOperationError, resolveAddQty, resolveSetQty } from '@/lib/commerce/cart';

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
