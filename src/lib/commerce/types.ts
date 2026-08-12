import type { CountryCode } from '@/i18n/config';

/**
 * The pricing half of a `public.countries` row — everything needed to turn an
 * OMR base price into a displayable local price. Kept separate from the full DB
 * row so pure money functions never depend on Supabase types.
 */
export type CountryPricing = {
  code: CountryCode;
  /** ISO 4217 code, e.g. `AED`. */
  currency: string;
  /** Decimal places: 3 for OMR/KWD/BHD, 2 for AED/SAR/QAR. */
  currencyExponent: number;
  /**
   * Major units of this currency per 1 OMR, e.g. 9.55 AED. Staff-maintained.
   * Arrives as a number from PostgREST but is accepted as a string too, since
   * `numeric` columns can serialise either way.
   */
  fxRateFromOmr: number | string;
  /** Converted prices are rounded up to a multiple of this many minor units. */
  roundingStepMinor: number;
};
