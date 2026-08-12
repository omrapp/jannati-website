/**
 * Money maths. Every price in the shop passes through here.
 *
 * Two rules hold throughout:
 *
 * 1. Amounts are integer minor units — baisa, fils, halalas. Never floats.
 *    A float subtotal is off by a fils sooner or later, and at checkout that is
 *    a payment that does not reconcile.
 * 2. The number of minor units per major unit is per-currency: OMR, KWD and BHD
 *    are 1000-based, AED, SAR and QAR are 100-based. Assuming 100 everywhere
 *    misprices every Omani, Kuwaiti and Bahraini order by 10x.
 *
 * Conversion happens at read time from the base OMR price, so editing an FX
 * rate in the admin reprices the whole catalogue without touching product rows.
 */

import { htmlLang, type Locale } from '@/i18n/config';

import type { CountryPricing } from './types';

/** Base prices are stored in OMR minor units (baisa) — 1 OMR = 1000 baisa. */
export const OMR_EXPONENT = 3;

/** FX rates are held to 6 decimal places, as `numeric(14, 6)` in Postgres. */
const RATE_SCALE = 6;

function assertMinorUnits(amount: number): void {
  if (!Number.isSafeInteger(amount) || amount < 0) {
    throw new RangeError(`Expected a non-negative integer minor amount, received ${amount}`);
  }
}

/**
 * Converts an FX rate to an integer scaled by 10^6. A string rate is parsed
 * digit by digit so no float ever touches it; a number rate is rounded once at
 * this boundary, which is exact for the 6 decimal places the column allows.
 */
function rateToScaledInt(rate: number | string): bigint {
  if (typeof rate === 'number') {
    if (!Number.isFinite(rate) || rate <= 0) {
      throw new RangeError(`Expected a positive FX rate, received ${rate}`);
    }

    return BigInt(Math.round(rate * 10 ** RATE_SCALE));
  }

  if (!/^\d+(\.\d+)?$/.test(rate)) {
    throw new RangeError(`Expected a decimal FX rate, received "${rate}"`);
  }

  const [whole, fraction = ''] = rate.split('.');
  const scaled = `${whole}${fraction.slice(0, RATE_SCALE).padEnd(RATE_SCALE, '0')}`;

  return BigInt(scaled);
}

/** Divides and rounds away from zero, so a converted price is never rounded down. */
function ceilDiv(numerator: bigint, denominator: bigint): bigint {
  return (numerator + denominator - 1n) / denominator;
}

/**
 * Converts an OMR base price into the country's currency, in minor units,
 * rounded **up** to the country's rounding step.
 *
 * @param baseMinorOmr Base price in baisa, e.g. 6400 for 6.400 OMR.
 */
export function convertFromOmr(baseMinorOmr: number, country: CountryPricing): number {
  assertMinorUnits(baseMinorOmr);

  const step = BigInt(country.roundingStepMinor);
  if (step <= 0n) {
    throw new RangeError(`Expected a positive rounding step for ${country.code}`);
  }

  // target minor = base minor / 10^3 (to OMR) x rate x 10^exponent (to target minor),
  // all in BigInt because the intermediate product exceeds Number.MAX_SAFE_INTEGER.
  const numerator =
    BigInt(baseMinorOmr) *
    rateToScaledInt(country.fxRateFromOmr) *
    10n ** BigInt(country.currencyExponent);
  const denominator = 10n ** BigInt(OMR_EXPONENT) * 10n ** BigInt(RATE_SCALE) * step;

  return Number(ceilDiv(numerator, denominator) * step);
}

/**
 * Renders minor units as an exact decimal string, e.g. `6400` -> `"6.400"`.
 * Used for display formatting and for the `price` field of product JSON-LD,
 * which must not be a rounded float.
 */
export function minorToDecimalString(minor: number, exponent: number): string {
  assertMinorUnits(minor);

  if (exponent === 0) {
    return String(minor);
  }

  const digits = String(minor).padStart(exponent + 1, '0');

  return `${digits.slice(0, -exponent)}.${digits.slice(-exponent)}`;
}

/**
 * Intl.NumberFormat V3 accepts a decimal string, which every engine we target
 * implements, but TypeScript's lib types still declare only `number | bigint`.
 */
type DecimalStringFormatter = { format(value: string): string };

/**
 * Formats an amount already expressed in the country's currency.
 *
 * Digits are forced to Latin (`nu-latn`): Arabic-Indic numerals are the default
 * for `ar` locales but Gulf storefronts show Western digits, and a shopper
 * comparing the Arabic and English storefronts should see the same price.
 */
export function formatMoney(minor: number, country: CountryPricing, locale: Locale): string {
  const formatter = new Intl.NumberFormat(`${htmlLang(locale)}-u-nu-latn`, {
    style: 'currency',
    currency: country.currency,
    minimumFractionDigits: country.currencyExponent,
    maximumFractionDigits: country.currencyExponent,
  });

  // Formatting the exact decimal string rather than a divided number keeps the
  // value off the float path entirely.
  return (formatter as unknown as DecimalStringFormatter).format(
    minorToDecimalString(minor, country.currencyExponent),
  );
}

/** Converts an OMR base price and formats it for the shopper in one step. */
export function formatFromOmr(
  baseMinorOmr: number,
  country: CountryPricing,
  locale: Locale,
): string {
  return formatMoney(convertFromOmr(baseMinorOmr, country), country, locale);
}
