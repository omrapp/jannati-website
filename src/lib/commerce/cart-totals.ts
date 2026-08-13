/**
 * Combines cart line items, a coupon and country VAT/shipping rules into one
 * total. Pure and integer-only, same as the rest of `src/lib/commerce` — a
 * cart's shape here is deliberately the minimum a total needs: line items
 * arrive with a unit price already converted to the checkout currency (by
 * the data-access layer, via `convertFromOmr`), so this file never touches
 * FX itself except to convert a fixed-amount coupon, which is stored in OMR
 * minor units on `coupons.value` regardless of checkout currency.
 */

import { convertFromOmr } from './money';
import { calculateShipping, type CountryShipping } from './shipping';
import type { CountryPricing } from './types';
import { calculateVat, type CountryVat } from './vat';

export type CartLine = {
  /** Already converted to the checkout currency's minor units. */
  unitPriceMinor: number;
  qty: number;
};

export type CartCoupon = {
  type: 'percent' | 'fixed';
  /** Percent: whole percent, 1-100. Fixed: OMR minor units, matches `coupons.value`. */
  value: number;
};

export type CartCountry = CountryPricing & CountryVat & CountryShipping;

export type CartTotals = {
  subtotalMinor: number;
  discountMinor: number;
  shippingMinor: number;
  vatMinor: number;
  totalMinor: number;
};

function sumLines(lines: CartLine[]): number {
  return lines.reduce((subtotal, line) => {
    if (!Number.isSafeInteger(line.unitPriceMinor) || line.unitPriceMinor < 0) {
      throw new RangeError(
        `Expected a non-negative integer unit price, received ${line.unitPriceMinor}`,
      );
    }
    if (!Number.isInteger(line.qty) || line.qty <= 0) {
      throw new RangeError(`Expected a positive integer quantity, received ${line.qty}`);
    }

    return subtotal + line.unitPriceMinor * line.qty;
  }, 0);
}

/** Never returns more than `subtotalMinor` — a coupon cannot take a cart below zero. */
function calculateDiscount(subtotalMinor: number, coupon: CartCoupon, country: CountryPricing): number {
  const rawDiscount =
    coupon.type === 'percent' ? calculatePercentDiscount(subtotalMinor, coupon.value) : convertFromOmr(coupon.value, country);

  return Math.min(rawDiscount, subtotalMinor);
}

function calculatePercentDiscount(subtotalMinor: number, percent: number): number {
  if (!Number.isInteger(percent) || percent < 1 || percent > 100) {
    throw new RangeError(`Expected a percent coupon value between 1 and 100, received ${percent}`);
  }

  // Rounds down: a discount never rounds in the shop's favour against the shopper.
  return Math.floor((subtotalMinor * percent) / 100);
}

export function calculateCartTotals(
  lines: CartLine[],
  country: CartCountry,
  coupon?: CartCoupon,
): CartTotals {
  const subtotalMinor = sumLines(lines);
  const discountMinor = coupon ? calculateDiscount(subtotalMinor, coupon, country) : 0;
  const netSubtotalMinor = subtotalMinor - discountMinor;

  // Both shipping and VAT are measured against what the shop actually stands
  // to receive — the post-discount subtotal, not the sticker subtotal.
  const shippingMinor = calculateShipping(netSubtotalMinor, country);
  const vatMinor = calculateVat(netSubtotalMinor, country);
  const totalMinor = netSubtotalMinor + shippingMinor + vatMinor;

  return { subtotalMinor, discountMinor, shippingMinor, vatMinor, totalMinor };
}
