import { describe, expect, it } from 'vitest';

import { calculateCartTotals, type CartCountry } from '@/lib/commerce/cart-totals';
import { calculateShipping } from '@/lib/commerce/shipping';
import { calculateVat } from '@/lib/commerce/vat';

/**
 * Mirrors the seeded rows of `public.countries`. Kept literal rather than
 * read from the database — same reasoning as `tests/money.test.ts` — so a
 * rate edit in a migration cannot silently rewrite what these tests assert.
 */
const countries: Record<string, CartCountry> = {
  om: {
    code: 'om',
    currency: 'OMR',
    currencyExponent: 3,
    fxRateFromOmr: 1.0,
    roundingStepMinor: 5,
    vatRate: 0.05,
    shippingFlatMinor: 2000,
    freeShippingThresholdMinor: 20000,
  },
  ae: {
    code: 'ae',
    currency: 'AED',
    currencyExponent: 2,
    fxRateFromOmr: 9.55,
    roundingStepMinor: 25,
    vatRate: 0.05,
    shippingFlatMinor: 2000,
    freeShippingThresholdMinor: 20000,
  },
  sa: {
    code: 'sa',
    currency: 'SAR',
    currencyExponent: 2,
    fxRateFromOmr: 9.75,
    roundingStepMinor: 25,
    vatRate: 0.15,
    shippingFlatMinor: 2500,
    freeShippingThresholdMinor: 25000,
  },
  kw: {
    code: 'kw',
    currency: 'KWD',
    currencyExponent: 3,
    fxRateFromOmr: 0.798,
    roundingStepMinor: 5,
    vatRate: 0,
    shippingFlatMinor: 2000,
    freeShippingThresholdMinor: 20000,
  },
  qa: {
    code: 'qa',
    currency: 'QAR',
    currencyExponent: 2,
    fxRateFromOmr: 9.47,
    roundingStepMinor: 25,
    vatRate: 0,
    shippingFlatMinor: 2500,
    freeShippingThresholdMinor: 25000,
  },
  bh: {
    code: 'bh',
    currency: 'BHD',
    currencyExponent: 3,
    fxRateFromOmr: 0.98,
    roundingStepMinor: 5,
    vatRate: 0.1,
    shippingFlatMinor: 2000,
    freeShippingThresholdMinor: 20000,
  },
};

describe('calculateVat', () => {
  it('applies each country rate, rounded half up', () => {
    expect(calculateVat(6400, countries.om)).toBe(320); // exact: 320.00
    expect(calculateVat(6403, countries.om)).toBe(320); // 320.15 -> 320
    expect(calculateVat(1007, countries.sa)).toBe(151); // 151.05 -> 151
    expect(calculateVat(10, countries.om)).toBe(1); // 0.5 -> rounds up to 1
  });

  it('is zero in VAT-exempt countries', () => {
    expect(calculateVat(100000, countries.kw)).toBe(0);
    expect(calculateVat(100000, countries.qa)).toBe(0);
  });

  it('rejects a negative subtotal', () => {
    expect(() => calculateVat(-1, countries.om)).toThrow(RangeError);
  });

  it('accepts a string-typed rate, same as PostgREST can serialise a numeric column', () => {
    const stringRated: CartCountry = { ...countries.om, vatRate: '0.05' };
    expect(calculateVat(6400, stringRated)).toBe(320);
  });

  it('rejects a malformed string rate', () => {
    const badRate: CartCountry = { ...countries.om, vatRate: 'not-a-number' };
    expect(() => calculateVat(100, badRate)).toThrow(RangeError);
  });
});

describe('calculateShipping', () => {
  it('charges the flat fee below the threshold', () => {
    expect(calculateShipping(19999, countries.om)).toBe(2000);
  });

  it('is free at and above the threshold', () => {
    expect(calculateShipping(20000, countries.om)).toBe(0);
    expect(calculateShipping(20001, countries.om)).toBe(0);
  });

  it('has no free-shipping threshold when the country sets none', () => {
    const noThreshold: typeof countries.om = {
      ...countries.om,
      freeShippingThresholdMinor: null,
    };
    expect(calculateShipping(1_000_000, noThreshold)).toBe(2000);
  });

  it('rejects a negative subtotal', () => {
    expect(() => calculateShipping(-1, countries.om)).toThrow(RangeError);
  });

  it('rejects a non-integer subtotal', () => {
    expect(() => calculateShipping(19999.5, countries.om)).toThrow(RangeError);
  });

  it('rejects a negative flat fee on the country', () => {
    const badFee: CartCountry = { ...countries.om, shippingFlatMinor: -1 };
    expect(() => calculateShipping(0, badFee)).toThrow(RangeError);
  });
});

describe('calculateCartTotals', () => {
  it('totals a single-line cart in every GCC currency, no coupon', () => {
    // subtotal - discount(0) + shipping + vat, per-country flat/threshold/rate.
    expect(calculateCartTotals([{ unitPriceMinor: 6400, qty: 1 }], countries.om)).toEqual({
      subtotalMinor: 6400,
      discountMinor: 0,
      shippingMinor: 2000, // below the 20000 threshold
      vatMinor: 320, // 5%
      totalMinor: 8720,
    });

    expect(calculateCartTotals([{ unitPriceMinor: 30000, qty: 1 }], countries.sa)).toEqual({
      subtotalMinor: 30000,
      discountMinor: 0,
      shippingMinor: 0, // at/above the 25000 threshold
      vatMinor: 4500, // 15%
      totalMinor: 34500,
    });

    expect(calculateCartTotals([{ unitPriceMinor: 5000, qty: 1 }], countries.kw)).toEqual({
      subtotalMinor: 5000,
      discountMinor: 0,
      shippingMinor: 2000,
      vatMinor: 0, // VAT-exempt
      totalMinor: 7000,
    });
  });

  it('sums multiple lines by quantity', () => {
    const totals = calculateCartTotals(
      [
        { unitPriceMinor: 6400, qty: 2 },
        { unitPriceMinor: 1000, qty: 3 },
      ],
      countries.om,
    );
    expect(totals.subtotalMinor).toBe(6400 * 2 + 1000 * 3); // 15800
  });

  it('applies a percent coupon before VAT and shipping, rounded down', () => {
    const totals = calculateCartTotals([{ unitPriceMinor: 6400, qty: 1 }], countries.om, {
      type: 'percent',
      value: 10,
    });
    expect(totals.discountMinor).toBe(640); // floor(6400 * 0.10)
    expect(totals.vatMinor).toBe(288); // 5% of the post-discount 5760
    expect(totals.totalMinor).toBe(5760 + 2000 + 288);
  });

  it('converts a fixed coupon from its OMR value into the checkout currency', () => {
    // coupons.value = 1000 baisa (1.000 OMR) -> 975 fils in AED (9.55 rate, 25-step round-up).
    const totals = calculateCartTotals([{ unitPriceMinor: 6125, qty: 1 }], countries.ae, {
      type: 'fixed',
      value: 1000,
    });
    expect(totals.discountMinor).toBe(975);
    expect(totals.totalMinor).toBe(6125 - 975 + 2000 + 258); // net 5150, VAT 5% = 258
  });

  it('never discounts a cart below zero', () => {
    const totals = calculateCartTotals([{ unitPriceMinor: 100, qty: 1 }], countries.om, {
      type: 'fixed',
      value: 1_000_000,
    });
    expect(totals.discountMinor).toBe(100);
    expect(totals.subtotalMinor - totals.discountMinor).toBe(0);
  });

  it('crossing the free-shipping threshold via a coupon still uses the post-discount subtotal', () => {
    // 20500 gross is above the 20000 threshold, but a 1000 discount drops the
    // net below it, so shipping is charged on what the shop actually receives.
    const totals = calculateCartTotals([{ unitPriceMinor: 20500, qty: 1 }], countries.om, {
      type: 'fixed',
      value: 1000,
    });
    expect(totals.subtotalMinor - totals.discountMinor).toBe(19500);
    expect(totals.shippingMinor).toBe(2000);
  });

  it('rejects a non-positive quantity', () => {
    expect(() => calculateCartTotals([{ unitPriceMinor: 100, qty: 0 }], countries.om)).toThrow(
      RangeError,
    );
  });

  it('rejects a non-integer quantity', () => {
    expect(() => calculateCartTotals([{ unitPriceMinor: 100, qty: 1.5 }], countries.om)).toThrow(
      RangeError,
    );
  });

  it('rejects a negative unit price', () => {
    expect(() => calculateCartTotals([{ unitPriceMinor: -1, qty: 1 }], countries.om)).toThrow(
      RangeError,
    );
  });

  it('rejects a non-integer unit price', () => {
    expect(() => calculateCartTotals([{ unitPriceMinor: 100.5, qty: 1 }], countries.om)).toThrow(
      RangeError,
    );
  });

  it('rejects an out-of-range percent coupon', () => {
    expect(() =>
      calculateCartTotals([{ unitPriceMinor: 100, qty: 1 }], countries.om, {
        type: 'percent',
        value: 101,
      }),
    ).toThrow(RangeError);
  });

  it('rejects a zero-percent coupon — a coupon that discounts nothing is not a valid coupon', () => {
    expect(() =>
      calculateCartTotals([{ unitPriceMinor: 100, qty: 1 }], countries.om, {
        type: 'percent',
        value: 0,
      }),
    ).toThrow(RangeError);
  });

  it('a 100% coupon discounts the full subtotal, leaving only shipping and (zero) VAT', () => {
    const totals = calculateCartTotals([{ unitPriceMinor: 6400, qty: 1 }], countries.om, {
      type: 'percent',
      value: 100,
    });
    expect(totals.discountMinor).toBe(6400);
    expect(totals.vatMinor).toBe(0);
    expect(totals.totalMinor).toBe(2000); // shipping only, net subtotal is 0
  });
});
