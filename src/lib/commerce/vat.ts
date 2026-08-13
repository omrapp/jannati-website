/**
 * VAT — added as a separate line at checkout, never baked into a shelf
 * price (`countries.vat_rate`: OM 5%, AE 5%, SA 15%, BH 10%, QA 0%, KW 0%).
 * Same integer-only-money rule as the rest of `src/lib/commerce`: no float
 * ever touches a VAT amount.
 */

/** `countries.vat_rate` is `numeric(5, 4)` — up to 4 exact decimal places. */
const VAT_RATE_SCALE = 4;

export type CountryVat = {
  code: string;
  /**
   * Arrives as a number from PostgREST but is accepted as a string too,
   * since `numeric` columns can serialise either way — same reasoning as
   * `CountryPricing.fxRateFromOmr` in `./types`.
   */
  vatRate: number | string;
};

function vatRateToScaledInt(rate: number | string): bigint {
  if (typeof rate === 'number') {
    if (!Number.isFinite(rate) || rate < 0) {
      throw new RangeError(`Expected a non-negative VAT rate, received ${rate}`);
    }

    return BigInt(Math.round(rate * 10 ** VAT_RATE_SCALE));
  }

  if (!/^\d+(\.\d+)?$/.test(rate)) {
    throw new RangeError(`Expected a decimal VAT rate, received "${rate}"`);
  }

  const [whole, fraction = ''] = rate.split('.');
  const scaled = `${whole}${fraction.slice(0, VAT_RATE_SCALE).padEnd(VAT_RATE_SCALE, '0')}`;

  return BigInt(scaled);
}

/**
 * VAT on a subtotal already net of any discount, rounded to the nearest
 * minor unit (half up) — the usual tax-rounding convention. This is
 * deliberately different from price conversion elsewhere in this lib, which
 * always rounds up in the shop's favour; VAT rounds to the fairest amount,
 * not the shop's.
 */
export function calculateVat(subtotalMinor: number, country: CountryVat): number {
  if (!Number.isSafeInteger(subtotalMinor) || subtotalMinor < 0) {
    throw new RangeError(`Expected a non-negative integer subtotal, received ${subtotalMinor}`);
  }

  const rateScaled = vatRateToScaledInt(country.vatRate);
  if (rateScaled === 0n) return 0;

  const denominator = 10n ** BigInt(VAT_RATE_SCALE);
  const numerator = BigInt(subtotalMinor) * rateScaled;

  // Round half up: add half the denominator before the floor division.
  return Number((numerator + denominator / 2n) / denominator);
}
