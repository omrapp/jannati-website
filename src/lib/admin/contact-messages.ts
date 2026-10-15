/**
 * Contact/feedback form submissions (Task 5.3). Unlike every other table in
 * `src/lib/admin/`, the public is the *writer* here — `submitContactMessage`
 * is called from the storefront's contact form, gated by nothing but the
 * table's insert-only RLS policy, while every other function here is
 * `checkAdminAccess()`-gated in the calling server action same as
 * `content-pages.ts`.
 *
 * Cookie-bound client throughout — the insert-only/admin-all RLS split does
 * all the access control a service-role bypass would otherwise be needed
 * for.
 */

import type { SupabaseClient } from '@supabase/supabase-js';

import type { Database } from '@/lib/supabase/types';

export type ContactMessage = Database['public']['Tables']['contact_messages']['Row'];

type Client = SupabaseClient<Database>;

export type ContactMessageInput = {
  name: string;
  email: string;
  phone: string | null;
  service: string | null;
  message: string;
};

/** Storefront-side submit — relies on the insert-only anon policy, not an admin check. */
export async function submitContactMessage(
  client: Client,
  input: ContactMessageInput,
): Promise<void> {
  const { error } = await client.from('contact_messages').insert({
    name: input.name,
    email: input.email,
    phone: input.phone,
    service: input.service,
    message: input.message,
  });
  if (error) throw new Error(`submitting contact message: ${error.message}`);
}

export async function listContactMessages(client: Client): Promise<ContactMessage[]> {
  const { data, error } = await client
    .from('contact_messages')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw new Error(`listing contact messages: ${error.message}`);
  return data;
}

export async function markContactMessageRead(
  client: Client,
  id: string,
  isRead: boolean,
): Promise<void> {
  const { error } = await client.from('contact_messages').update({ is_read: isRead }).eq('id', id);
  if (error) throw new Error(`updating contact message: ${error.message}`);
}

export async function deleteContactMessage(client: Client, id: string): Promise<void> {
  const { error } = await client.from('contact_messages').delete().eq('id', id);
  if (error) throw new Error(`deleting contact message: ${error.message}`);
}
