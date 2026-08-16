/**
 * Admin country settings (Task 3.6). Cookie-bound client, same posture as
 * `taxonomy.ts` — RLS's `20260815000008_admin_countries_write_policy.sql`
 * is the real gate.
 *
 * The six rows are fixed by the locked "full GCC multi-country" decision —
 * this is edit-in-place only, no create/delete. Every numeric field is
 * validated here against the same bounds as the migration's own `check`
 * constraints, so a bad value comes back as a plain-English message instead
 * of a raw constraint violation surfacing whatever Postgres happened to say.
 */

import type { SupabaseClient } from '@supabase/supabase-js';

import type { Database, Tables } from '@/lib/supabase/types';

type Client = SupabaseClient<Database>;

export type Country = Tables<'countries'>;

export type CountrySettingsInput = {
  fxRateFromOmr: number;
  roundingStepMinor: number;
  vatRate: number;
  shippingFlatMinor: number;
  freeShippingThresholdMinor: number | null;
  enabled: boolean;
};

export class CountrySettingsError extends Error {}

/** Mirrors the `check` constraints on `public.countries` — see that
 * migration for the authoritative bounds. */
function validate(input: CountrySettingsInput): void {
  if (!(input.fxRateFromOmr > 0)) throw new CountrySettingsError('FX rate must be greater than 0.');
  if (!(input.roundingStepMinor > 0)) throw new CountrySettingsError('Rounding step must be greater than 0.');
  if (!(input.vatRate >= 0 && input.vatRate < 1)) throw new CountrySettingsError('VAT rate must be between 0 and 1 (exclusive).');
  if (!(input.shippingFlatMinor >= 0)) throw new CountrySettingsError('Shipping rate cannot be negative.');
  if (input.freeShippingThresholdMinor !== null && !(input.freeShippingThresholdMinor >= 0)) {
    throw new CountrySettingsError('Free-shipping threshold cannot be negative.');
  }
}

export async function listCountries(client: Client): Promise<Country[]> {
  const { data, error } = await client.from('countries').select('*').order('sort_order');
  if (error) throw new Error(`listing countries: ${error.message}`);
  return data;
}

export async function updateCountrySettings(
  client: Client,
  code: string,
  input: CountrySettingsInput,
): Promise<void> {
  validate(input);

  const { error } = await client
    .from('countries')
    .update({
      fx_rate_from_omr: input.fxRateFromOmr,
      rounding_step_minor: input.roundingStepMinor,
      vat_rate: input.vatRate,
      shipping_flat_minor: input.shippingFlatMinor,
      free_shipping_threshold_minor: input.freeShippingThresholdMinor,
      enabled: input.enabled,
    })
    .eq('code', code);
  if (error) throw new Error(`updating ${code}: ${error.message}`);
}
