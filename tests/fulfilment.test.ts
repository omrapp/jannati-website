import { describe, expect, it } from 'vitest';

import { isAllowedFulfilmentTransition } from '@/lib/commerce/fulfilment';

describe('isAllowedFulfilmentTransition', () => {
  it('allows pending -> processing', () => {
    expect(isAllowedFulfilmentTransition('pending', 'processing')).toBe(true);
  });

  it('allows pending -> cancelled', () => {
    expect(isAllowedFulfilmentTransition('pending', 'cancelled')).toBe(true);
  });

  it('allows processing -> shipped', () => {
    expect(isAllowedFulfilmentTransition('processing', 'shipped')).toBe(true);
  });

  it('allows shipped -> delivered', () => {
    expect(isAllowedFulfilmentTransition('shipped', 'delivered')).toBe(true);
  });

  it('rejects skipping a step, pending -> shipped', () => {
    expect(isAllowedFulfilmentTransition('pending', 'shipped')).toBe(false);
  });

  it('rejects going backwards, shipped -> processing', () => {
    expect(isAllowedFulfilmentTransition('shipped', 'processing')).toBe(false);
  });

  it('rejects any transition out of terminal delivered state', () => {
    expect(isAllowedFulfilmentTransition('delivered', 'pending')).toBe(false);
    expect(isAllowedFulfilmentTransition('delivered', 'cancelled')).toBe(false);
  });

  it('rejects any transition out of terminal cancelled state', () => {
    expect(isAllowedFulfilmentTransition('cancelled', 'pending')).toBe(false);
  });

  it('rejects replaying the same status', () => {
    expect(isAllowedFulfilmentTransition('processing', 'processing')).toBe(false);
  });
});
