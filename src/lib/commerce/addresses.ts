/**
 * Server-side address-book operations. Every function takes an explicit
 * `customerId` and filters by it even though `public.addresses`' RLS policy
 * (`customer_id = auth.uid()`) already scopes reads/writes to the signed-in
 * customer — defense in depth, and it means a caller can never pass through
 * a client-supplied `customer_id` and have it matter: the filter here and
 * the policy in the database both have to agree.
 *
 * Thin and not unit tested, same posture as `src/lib/commerce/cart.ts` and
 * `src/lib/catalog/queries.ts` — there is nothing to unit test in "call
 * PostgREST, return what it returns."
 */

import type { SupabaseClient } from '@supabase/supabase-js';

import type { CountryCode } from '@/i18n/config';
import type { Database, Tables } from '@/lib/supabase/types';

type Client = SupabaseClient<Database>;

export type Address = Tables<'addresses'>;

export type AddressInput = {
  countryCode: CountryCode;
  fullName: string;
  phone: string;
  city: string;
  area: string | null;
  line1: string;
};

function toRow(input: AddressInput) {
  return {
    country_code: input.countryCode,
    full_name: input.fullName,
    phone: input.phone,
    city: input.city,
    area: input.area,
    line1: input.line1,
  };
}

/** Every address for a customer, most recently created first. */
export async function listAddresses(client: Client, customerId: string): Promise<Address[]> {
  const { data, error } = await client
    .from('addresses')
    .select('*')
    .eq('customer_id', customerId)
    .order('created_at', { ascending: false });

  if (error) throw new Error(`reading addresses: ${error.message}`);

  return data;
}

/**
 * A newly created address is never made default automatically — the
 * shopper's existing default (if any) stays the default until they choose
 * to change it via `setDefaultAddress`. The one exception is a customer's
 * very first address: with nothing to compare against, defaulting it saves
 * an extra click checkout would otherwise force on every new customer.
 */
export async function createAddress(
  client: Client,
  customerId: string,
  input: AddressInput,
): Promise<Address> {
  const existing = await listAddresses(client, customerId);

  const { data, error } = await client
    .from('addresses')
    .insert({ ...toRow(input), customer_id: customerId, is_default: existing.length === 0 })
    .select('*')
    .single();

  if (error) throw new Error(`creating address: ${error.message}`);

  return data;
}

export async function updateAddress(
  client: Client,
  customerId: string,
  addressId: string,
  input: AddressInput,
): Promise<Address> {
  const { data, error } = await client
    .from('addresses')
    .update(toRow(input))
    .eq('id', addressId)
    .eq('customer_id', customerId)
    .select('*')
    .single();

  if (error) throw new Error(`updating address: ${error.message}`);

  return data;
}

export async function deleteAddress(
  client: Client,
  customerId: string,
  addressId: string,
): Promise<void> {
  const { error } = await client
    .from('addresses')
    .delete()
    .eq('id', addressId)
    .eq('customer_id', customerId);

  if (error) throw new Error(`deleting address: ${error.message}`);
}

/**
 * Makes one address the default, unsetting whichever one held that spot.
 * Two writes, not one: `addresses_one_default_per_customer_idx` is a unique
 * index on `(customer_id) where is_default`, so a customer can never have
 * two default rows at once — the old default has to drop to `false` before
 * the new one can rise to `true`, or the second write hits the index and
 * fails. Not wrapped in a transaction; if the process dies between the two
 * writes the customer is left with zero default addresses rather than a
 * corrupt one, which checkout already treats as "ask them to pick one" — the
 * same non-blocking-race posture already accepted for cart writes.
 */
export async function setDefaultAddress(
  client: Client,
  customerId: string,
  addressId: string,
): Promise<void> {
  const { error: unsetError } = await client
    .from('addresses')
    .update({ is_default: false })
    .eq('customer_id', customerId)
    .eq('is_default', true);

  if (unsetError) throw new Error(`clearing default address: ${unsetError.message}`);

  const { error: setError } = await client
    .from('addresses')
    .update({ is_default: true })
    .eq('id', addressId)
    .eq('customer_id', customerId);

  if (setError) throw new Error(`setting default address: ${setError.message}`);
}
