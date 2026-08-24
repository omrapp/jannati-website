/**
 * Storefront-side customer profile read/update — the `/account` counterpart
 * to `addresses.ts`, same cookie-bound-client-and-RLS-does-the-real-gating
 * posture. `customers.id = auth.uid()` select/update policies already exist
 * (`20260813000002_commerce.sql`), so every function here just has to ask
 * for its own row; there's no service-role path in this file.
 *
 * `full_name` doesn't exist in `Database` yet — same typegen gap as
 * `content_pages`/`is_admin` (`20260824000001_account_content_hero.sql`
 * hasn't been through `db:push`/`gen types`). Same narrow extension instead
 * of casting every call to `any`; delete this workaround once the real
 * migration lands in generated types.
 */

import type { SupabaseClient } from '@supabase/supabase-js';

import type { Database, Tables } from '@/lib/supabase/types';

type CustomerRow = Tables<'customers'> & { full_name: string | null };

type DatabaseWithFullName = Database & {
  public: Database['public'] & {
    Tables: Database['public']['Tables'] & {
      customers: {
        Row: CustomerRow;
        Insert: Partial<CustomerRow> & Pick<CustomerRow, 'id'>;
        Update: Partial<CustomerRow>;
        Relationships: [];
      };
    };
  };
};

type Client = SupabaseClient<Database>;

function withFullName(client: Client): SupabaseClient<DatabaseWithFullName> {
  return client as unknown as SupabaseClient<DatabaseWithFullName>;
}

export type CustomerProfile = CustomerRow;

/**
 * Always resolves — the `handle_new_user` trigger
 * (`20260813000002_commerce.sql`) inserts a `customers` row for every new
 * auth user at signup, so "no profile yet" never happens for a signed-in
 * customer. `null` here would mean a genuine read failure, not "not set up".
 */
export async function getCustomerProfile(client: Client, customerId: string): Promise<CustomerProfile | null> {
  const { data, error } = await withFullName(client)
    .from('customers')
    .select('*')
    .eq('id', customerId)
    .maybeSingle();
  if (error) throw new Error(`reading customer profile: ${error.message}`);
  return data;
}

export type CustomerProfileInput = {
  fullName: string | null;
  phone: string | null;
};

export async function updateCustomerProfile(
  client: Client,
  customerId: string,
  input: CustomerProfileInput,
): Promise<void> {
  const { error } = await withFullName(client)
    .from('customers')
    .update({ full_name: input.fullName, phone: input.phone })
    .eq('id', customerId);
  if (error) throw new Error(`updating customer profile: ${error.message}`);
}
