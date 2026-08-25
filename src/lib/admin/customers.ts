/**
 * Admin customer list + detail (Task 3.10), plus moderation (block
 * login/checkout, delete — `20260825000001_admin_dashboard_v2.sql`).
 * `public.customers` has no RLS policy for admin reads or writes (same gap
 * as `orders.ts`/Task 3.5 — Checkpoint F is where that's meant to close), so
 * every function here takes the service-role client, gated by
 * `checkAdminAccess()` in the caller, not a database policy.
 *
 * Email isn't a column on `public.customers` — it lives in `auth.users`, and
 * `customers.id` is always that same user's id (the FK in
 * `20260813000002_commerce.sql`, `on delete cascade`, is also why deleting
 * the Auth user below is enough to remove the `customers` row too). Every
 * read here pairs a `customers` row with an `auth.admin.getUserById` call to
 * surface it.
 */

import type { SupabaseClient } from '@supabase/supabase-js';

import type { OrderListItem } from '@/lib/admin/orders';
import { listAddresses, type Address } from '@/lib/commerce/addresses';
import type { Database, Tables } from '@/lib/supabase/types';

type AdminClient = SupabaseClient<Database>;

export type CustomerListItem = Tables<'customers'> & { email: string | null };

export const CUSTOMERS_PAGE_SIZE = 25;
const PAGE_SIZE = CUSTOMERS_PAGE_SIZE;
// Auth has no server-side email search, only pagination — `q` matching a
// phone number filters in the DB query below directly, but matching an
// email scans Auth users page by page and keeps whichever ids match.
// Capped so a search term nobody has never turns into an unbounded scan;
// fine for the customer volumes this store is at.
const MAX_AUTH_SCAN_PAGES = 20;
const AUTH_PAGE_SIZE = 1000;

async function findCustomerIdsByEmail(admin: AdminClient, q: string): Promise<string[]> {
  const needle = q.toLowerCase();
  const ids: string[] = [];
  for (let page = 1; page <= MAX_AUTH_SCAN_PAGES; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: AUTH_PAGE_SIZE });
    if (error) throw new Error(`searching customers by email: ${error.message}`);
    for (const u of data.users) {
      if (u.email?.toLowerCase().includes(needle)) ids.push(u.id);
    }
    if (data.users.length < AUTH_PAGE_SIZE) break;
  }
  return ids;
}

async function attachEmails(admin: AdminClient, rows: Tables<'customers'>[]): Promise<CustomerListItem[]> {
  return Promise.all(
    rows.map(async (row) => {
      const { data } = await admin.auth.admin.getUserById(row.id);
      return { ...row, email: data.user?.email ?? null };
    }),
  );
}

export async function listCustomers(
  admin: AdminClient,
  { q, page }: { q?: string; page?: number },
): Promise<{ items: CustomerListItem[]; total: number }> {
  const pageNum = Math.max(1, page ?? 1);
  const from = (pageNum - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  let query = admin.from('customers').select('*', { count: 'exact' }).order('created_at', { ascending: false });

  if (q) {
    const emailIds = await findCustomerIdsByEmail(admin, q);
    // `phone.ilike` OR `id in (email matches)` in one `.or()` string —
    // Postgrest needs a syntactically valid `in.()` even when nothing
    // matched by email, not an empty/omitted clause.
    const idList = emailIds.length > 0 ? emailIds.join(',') : '00000000-0000-0000-0000-000000000000';
    query = query.or(`phone.ilike.%${q}%,id.in.(${idList})`);
  }

  query = query.range(from, to);

  const { data, error, count } = await query;
  if (error) throw new Error(`listing customers: ${error.message}`);

  return { items: await attachEmails(admin, data ?? []), total: count ?? 0 };
}

export type CustomerDetail = {
  customer: Tables<'customers'>;
  email: string | null;
  addresses: Address[];
  orders: OrderListItem[];
};

export async function getCustomerDetail(admin: AdminClient, customerId: string): Promise<CustomerDetail | null> {
  const { data: customer, error } = await admin.from('customers').select('*').eq('id', customerId).maybeSingle();
  if (error) throw new Error(`reading customer ${customerId}: ${error.message}`);
  if (!customer) return null;

  const { data: authUser } = await admin.auth.admin.getUserById(customerId);

  const [addresses, { data: orders, error: ordersError }] = await Promise.all([
    listAddresses(admin, customerId),
    admin
      .from('orders')
      .select('id, order_number, country_code, currency, total_minor, payment_status, fulfilment_status, guest_email, created_at')
      .eq('customer_id', customerId)
      .order('created_at', { ascending: false }),
  ]);
  if (ordersError) throw new Error(`reading orders for customer ${customerId}: ${ordersError.message}`);

  return { customer, email: authUser.user?.email ?? null, addresses, orders: orders ?? [] };
}

/**
 * An admin must never be able to block or delete a staff/admin account —
 * `admin_users` (`20260815000003_admin_users.sql`) has no self-service path
 * of its own, so this is the one place that check needs to happen before any
 * of the moderation mutations below touch a `customers` row.
 */
export async function assertNotStaff(admin: AdminClient, customerId: string): Promise<void> {
  const { data, error } = await admin.from('admin_users').select('user_id').eq('user_id', customerId).maybeSingle();
  if (error) throw new Error(`checking staff status for ${customerId}: ${error.message}`);
  if (data) throw new Error('Cannot block or delete a staff account.');
}

type BlockFlagsPatch = Partial<
  Pick<Tables<'customers'>, 'is_login_blocked' | 'is_checkout_blocked' | 'blocked_reason' | 'blocked_at'>
>;

async function updateBlockFlags(admin: AdminClient, customerId: string, patch: BlockFlagsPatch): Promise<void> {
  const { error } = await admin.from('customers').update(patch).eq('id', customerId);
  if (error) throw new Error(`updating moderation status for ${customerId}: ${error.message}`);
}

/** Blocks sign-in entirely; the customer's session (if any) is force-signed-out at the next login attempt. */
export async function blockLogin(admin: AdminClient, customerId: string, reason: string | null): Promise<void> {
  await assertNotStaff(admin, customerId);
  await updateBlockFlags(admin, customerId, {
    is_login_blocked: true,
    blocked_reason: reason,
    blocked_at: new Date().toISOString(),
  });
}

/** Leaves sign-in and browsing alone but blocks placing an order — independent of `blockLogin`. */
export async function blockCheckout(admin: AdminClient, customerId: string, reason: string | null): Promise<void> {
  await assertNotStaff(admin, customerId);
  await updateBlockFlags(admin, customerId, {
    is_checkout_blocked: true,
    blocked_reason: reason,
    blocked_at: new Date().toISOString(),
  });
}

/**
 * `which: 'both'` also clears `blocked_reason`/`blocked_at` — with neither
 * flag left set there's nothing left for that reason to describe. Clearing
 * just one flag leaves the reason in place, since it may still describe the
 * flag that's still set.
 */
export async function unblock(admin: AdminClient, customerId: string, which: 'login' | 'checkout' | 'both'): Promise<void> {
  await assertNotStaff(admin, customerId);
  const patch: BlockFlagsPatch =
    which === 'both'
      ? { is_login_blocked: false, is_checkout_blocked: false, blocked_reason: null, blocked_at: null }
      : which === 'login'
        ? { is_login_blocked: false }
        : { is_checkout_blocked: false };
  await updateBlockFlags(admin, customerId, patch);
}

/**
 * `public.customers.id references auth.users (id) on delete cascade`
 * (`20260813000002_commerce.sql`), so deleting the Auth user is sufficient —
 * no separate delete of the `customers` row is needed here.
 */
export async function deleteCustomerAccount(admin: AdminClient, customerId: string): Promise<void> {
  await assertNotStaff(admin, customerId);
  const { error } = await admin.auth.admin.deleteUser(customerId);
  if (error) throw new Error(`deleting customer ${customerId}: ${error.message}`);
}
