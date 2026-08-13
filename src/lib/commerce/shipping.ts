/**
 * Shipping — a flat per-country fee, waived once the subtotal reaches a
 * free-shipping threshold. Both figures live on `countries`, already in the
 * same currency and minor-unit scale as the subtotal they're compared
 * against, so no conversion happens here.
 */

export type CountryShipping = {
  code: string;
  shippingFlatMinor: number;
  /** `null` means no free-shipping threshold exists for this country. */
  freeShippingThresholdMinor: number | null;
};

/**
 * @param subtotalMinor The subtotal the threshold is measured against — the
 * caller decides whether that's pre- or post-discount (`calculateCartTotals`
 * in `./cart-totals` uses the post-discount figure: what the shop actually
 * stands to receive).
 */
export function calculateShipping(subtotalMinor: number, country: CountryShipping): number {
  if (!Number.isSafeInteger(subtotalMinor) || subtotalMinor < 0) {
    throw new RangeError(`Expected a non-negative integer subtotal, received ${subtotalMinor}`);
  }

  if (!Number.isSafeInteger(country.shippingFlatMinor) || country.shippingFlatMinor < 0) {
    throw new RangeError(`Expected a non-negative integer shipping fee for ${country.code}`);
  }

  const { freeShippingThresholdMinor } = country;
  if (freeShippingThresholdMinor != null && subtotalMinor >= freeShippingThresholdMinor) {
    return 0;
  }

  return country.shippingFlatMinor;
}
