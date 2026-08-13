import { describe, expect, it } from 'vitest';

import {
  convertFromOmr,
  convertToOmrBound,
  formatFromOmr,
  formatMoney,
  majorDecimalToMinor,
  minorToDecimalString,
} from '@/lib/commerce/money';
import type { CountryPricing } from '@/lib/commerce/types';

/**
 * Mirrors the seeded rows of `public.countries`. Kept literal rather than read
 * from the database so a rate edit in a migration cannot silently rewrite what
 * these tests assert.
 */
const pricing: Record<string, CountryPricing> = {
  om: {
    code: 'om',
    currency: 'OMR',
    currencyExponent: 3,
    fxRateFromOmr: 1.0,
    roundingStepMinor: 5,
  },
  ae: {
    code: 'ae',
    currency: 'AED',
    currencyExponent: 2,
    fxRateFromOmr: 9.55,
    roundingStepMinor: 25,
  },
  sa: {
    code: 'sa',
    currency: 'SAR',
    currencyExponent: 2,
    fxRateFromOmr: 9.75,
    roundingStepMinor: 25,
  },
  kw: {
    code: 'kw',
    currency: 'KWD',
    currencyExponent: 3,
    fxRateFromOmr: 0.798,
    roundingStepMinor: 5,
  },
  qa: {
    code: 'qa',
    currency: 'QAR',
    currencyExponent: 2,
    fxRateFromOmr: 9.47,
    roundingStepMinor: 25,
  },
  bh: {
    code: 'bh',
    currency: 'BHD',
    currencyExponent: 3,
    fxRateFromOmr: 0.98,
    roundingStepMinor: 5,
  },
};

/** 6.400 OMR — a real price from the reference catalogue. */
const HAND_CREME = 6400;

describe('convertFromOmr', () => {
  it('prices 6.400 OMR in every GCC currency', () => {
    // 6.4 OMR x rate, in minor units, rounded up to the country's step.
    expect(convertFromOmr(HAND_CREME, pricing.om)).toBe(6400); // 6.400 OMR
    expect(convertFromOmr(HAND_CREME, pricing.ae)).toBe(6125); // 61.25 AED
    expect(convertFromOmr(HAND_CREME, pricing.sa)).toBe(6250); // 62.50 SAR
    expect(convertFromOmr(HAND_CREME, pricing.kw)).toBe(5110); // 5.110 KWD
    expect(convertFromOmr(HAND_CREME, pricing.qa)).toBe(6075); // 60.75 QAR
    expect(convertFromOmr(HAND_CREME, pricing.bh)).toBe(6275); // 6.275 BHD
  });

  it('keeps 3-decimal and 2-decimal currencies apart at the same base price', () => {
    // Kuwait and Qatar hold nearly identical rates but differ by a factor of 10
    // in minor units. Treating either as 2 decimals misprices by 10x.
    expect(convertFromOmr(1000, pricing.kw)).toBe(800); // 0.800 KWD
    expect(convertFromOmr(1000, pricing.qa)).toBe(950); // 9.50 QAR
  });

  it('never rounds a price down', () => {
    for (const country of Object.values(pricing)) {
      for (const base of [1, 7, 999, 1234, 6400, 99999]) {
        const converted = convertFromOmr(base, country);
        const exact =
          (base * Number(country.fxRateFromOmr) * 10 ** country.currencyExponent) / 10 ** 3;

        expect(converted).toBeGreaterThanOrEqual(Math.floor(exact));
        expect(converted % country.roundingStepMinor).toBe(0);
      }
    }
  });

  it('leaves zero at zero', () => {
    expect(convertFromOmr(0, pricing.ae)).toBe(0);
  });

  it('reads a numeric rate supplied as a string without losing precision', () => {
    // PostgREST may hand back `numeric` columns as strings.
    expect(convertFromOmr(HAND_CREME, { ...pricing.ae, fxRateFromOmr: '9.550000' })).toBe(6125);
  });

  it('rejects prices that are not whole minor units', () => {
    expect(() => convertFromOmr(6.4, pricing.om)).toThrow();
    expect(() => convertFromOmr(-100, pricing.om)).toThrow();
    expect(() => convertFromOmr(Number.NaN, pricing.om)).toThrow();
  });
});

describe('minorToDecimalString', () => {
  it('renders the exact decimal for the currency exponent', () => {
    expect(minorToDecimalString(6400, 3)).toBe('6.400');
    expect(minorToDecimalString(6125, 2)).toBe('61.25');
    expect(minorToDecimalString(5, 3)).toBe('0.005');
    expect(minorToDecimalString(0, 2)).toBe('0.00');
    expect(minorToDecimalString(1234, 0)).toBe('1234');
  });
});

describe('formatMoney', () => {
  it('shows three decimals for OMR and two for AED', () => {
    expect(formatMoney(6400, pricing.om, 'en-om')).toContain('6.400');
    expect(formatMoney(6125, pricing.ae, 'en-ae')).toContain('61.25');
  });

  it('names the currency in the active language', () => {
    expect(formatMoney(6400, pricing.om, 'ar-om')).toContain('ر.ع.');
    expect(formatMoney(6400, pricing.om, 'en-om')).toMatch(/OMR|OMR\s/);
  });

  it('uses Latin digits in Arabic', () => {
    // Gulf storefronts display Western digits; Arabic-Indic numerals would make
    // prices unreadable next to the English storefront and break price parsing.
    const arabic = formatMoney(6400, pricing.om, 'ar-om');

    expect(arabic).toContain('6.400');
    expect(arabic).not.toMatch(/[٠-٩]/);
  });

  it('converts and formats in one step', () => {
    expect(formatFromOmr(HAND_CREME, pricing.ae, 'en-ae')).toBe(
      formatMoney(6125, pricing.ae, 'en-ae'),
    );
  });
});

describe('convertToOmrBound', () => {
  // Forward reference from the `convertFromOmr` suite above: 6.400 OMR displays
  // as these amounts per currency.
  const displayed: Record<keyof typeof pricing, number> = {
    om: 6400,
    ae: 6125,
    sa: 6250,
    kw: 5110,
    qa: 6075,
    bh: 6275,
  };

  it('never excludes a product priced exactly at the filter boundary', () => {
    // The property that matters for a price-range filter: setting min or max
    // to a product's own displayed price must still include that product,
    // whichever way the reverse conversion happens to round.
    for (const [code, country] of Object.entries(pricing)) {
      const target = displayed[code as keyof typeof pricing];

      const minBound = convertToOmrBound(target, country, 'floor');
      const maxBound = convertToOmrBound(target, country, 'ceil');

      expect(HAND_CREME).toBeGreaterThanOrEqual(minBound);
      expect(HAND_CREME).toBeLessThanOrEqual(maxBound);
    }
  });

  it('never floors a minimum bound below zero', () => {
    expect(convertToOmrBound(0, pricing.ae, 'floor')).toBe(0);
  });

  it('floor never rounds above ceil for the same bound', () => {
    for (const country of Object.values(pricing)) {
      const floor = convertToOmrBound(12345, country, 'floor');
      const ceil = convertToOmrBound(12345, country, 'ceil');

      expect(floor).toBeLessThanOrEqual(ceil);
    }
  });
});

describe('majorDecimalToMinor', () => {
  it('parses a whole number at any exponent', () => {
    expect(majorDecimalToMinor('10', 2)).toBe(1000);
    expect(majorDecimalToMinor('0', 3)).toBe(0);
  });

  it('parses a fractional decimal, padded to the exponent', () => {
    expect(majorDecimalToMinor('10.5', 2)).toBe(1050);
    expect(majorDecimalToMinor('10.50', 2)).toBe(1050);
    expect(majorDecimalToMinor('6.400', 3)).toBe(6400);
  });

  it('rejects more fractional digits than the currency supports', () => {
    expect(majorDecimalToMinor('10.999', 2)).toBeNull();
  });

  it('rejects anything that is not a plain non-negative decimal', () => {
    expect(majorDecimalToMinor('abc', 2)).toBeNull();
    expect(majorDecimalToMinor('-5', 2)).toBeNull();
    expect(majorDecimalToMinor('5-', 2)).toBeNull();
    expect(majorDecimalToMinor('', 2)).toBeNull();
  });
});
