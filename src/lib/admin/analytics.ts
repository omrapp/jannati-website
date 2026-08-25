/**
 * Admin dashboard/analytics read queries (`plans/admin-dashboard.md` step 6).
 * Same posture as `orders.ts`: service-role client, `checkAdminAccess()` in
 * the caller is the only gate — there's no RLS policy here for staff to read
 * aggregate figures across every customer's orders, on purpose.
 *
 * Multi-currency note: `orders.total_minor` / `order_items.line_total_minor`
 * are in the *order's own* currency (OMR, AED, SAR, …) — GCC scope
 * (`plans/admin-dashboard.md`) means a mix of currencies is the norm, not an
 * edge case. Summing `total_minor` across orders directly would silently add
 * baisa to fils to halalas as if they were the same unit. Every revenue
 * figure below normalizes to OMR minor units first, via `toOmrMinor` — an
 * approximate inverse of `convertFromOmr` (`money.ts`) using each order's own
 * recorded `fx_rate_used`. It's plain floating-point and ignores
 * `convertFromOmr`'s round-up-to-step behaviour (at most one rounding step of
 * drift per order): acceptable here because this is a read-time aggregate
 * summed across many orders for a chart/headline number, not a value any
 * payment or accounting flow depends on — unlike `money.ts`'s BigInt-exact
 * path, which is for a single order's authoritative total.
 */

import type { SupabaseClient } from '@supabase/supabase-js';

import { OMR_EXPONENT } from '@/lib/commerce/money';
import { FULFILMENT_STATUSES, type FulfilmentStatus } from '@/lib/commerce/fulfilment';
import type { Database } from '@/lib/supabase/types';

type AdminClient = SupabaseClient<Database>;

export type AnalyticsDateRange = {
  /** ISO date or timestamp, inclusive lower bound (`created_at >=`). */
  from: string;
  /** ISO date or timestamp, inclusive upper bound (`created_at <=`). */
  to: string;
};

async function loadCurrencyExponents(admin: AdminClient): Promise<Map<string, number>> {
  const { data, error } = await admin.from('countries').select('code, currency_exponent');
  if (error) throw new Error(`reading countries for revenue normalization: ${error.message}`);
  return new Map((data ?? []).map((c) => [c.code, c.currency_exponent]));
}

function toOmrMinor(totalMinor: number, fxRateUsed: number, currencyExponent: number): number {
  if (fxRateUsed <= 0) return 0;
  return Math.round((totalMinor * 10 ** OMR_EXPONENT) / (fxRateUsed * 10 ** currencyExponent));
}

// Revenue series ----------------------------------------------------------------

export type RevenueBucketSize = 'day' | 'week';

export type RevenuePoint = {
  /** Bucket start date, ISO `yyyy-mm-dd` (UTC). */
  date: string;
  revenueMinor: number;
  orderCount: number;
};

/** ISO week (Monday-start) bucket key for a given UTC instant. */
function bucketKey(iso: string, bucket: RevenueBucketSize): string {
  const d = new Date(iso);
  if (bucket === 'day') return d.toISOString().slice(0, 10);

  const dayOffset = (d.getUTCDay() + 6) % 7; // 0 = Monday
  const monday = new Date(d);
  monday.setUTCDate(d.getUTCDate() - dayOffset);
  return monday.toISOString().slice(0, 10);
}

/**
 * Daily/weekly revenue over a date range, paid orders only. Plain
 * `created_at` range filter — uses `orders_created_at_idx`
 * (`20260825000001_admin_dashboard_v2.sql`), the only index that covers an
 * unfiltered-by-customer date-range scan.
 */
export async function getRevenueSeries(
  admin: AdminClient,
  range: AnalyticsDateRange,
  bucket: RevenueBucketSize = 'day',
): Promise<RevenuePoint[]> {
  const [{ data, error }, exponents] = await Promise.all([
    admin
      .from('orders')
      .select('created_at, total_minor, fx_rate_used, country_code')
      .eq('payment_status', 'paid')
      .gte('created_at', range.from)
      .lte('created_at', range.to)
      .order('created_at', { ascending: true }),
    loadCurrencyExponents(admin),
  ]);
  if (error) throw new Error(`reading revenue series: ${error.message}`);

  const buckets = new Map<string, { revenueMinor: number; orderCount: number }>();
  for (const row of data ?? []) {
    const key = bucketKey(row.created_at, bucket);
    const exponent = exponents.get(row.country_code) ?? OMR_EXPONENT;
    const omrMinor = toOmrMinor(row.total_minor, row.fx_rate_used, exponent);

    const existing = buckets.get(key) ?? { revenueMinor: 0, orderCount: 0 };
    existing.revenueMinor += omrMinor;
    existing.orderCount += 1;
    buckets.set(key, existing);
  }

  return [...buckets.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, v]) => ({ date, ...v }));
}

// Order status breakdown ---------------------------------------------------------

export type OrderStatusBreakdown = { status: FulfilmentStatus; count: number };

/**
 * One `count: 'exact', head: true` query per status, run in parallel —
 * PostgREST has no `group by` without an RPC/view, and this avoids pulling
 * every order row into Node just to tally five buckets (a plain `select
 * fulfilment_status` over the whole table would transfer every row).
 */
export async function getOrderStatusBreakdown(admin: AdminClient): Promise<OrderStatusBreakdown[]> {
  return Promise.all(
    FULFILMENT_STATUSES.map(async (status) => {
      const { count, error } = await admin
        .from('orders')
        .select('*', { count: 'exact', head: true })
        .eq('fulfilment_status', status);
      if (error) throw new Error(`counting orders with fulfilment_status=${status}: ${error.message}`);
      return { status, count: count ?? 0 };
    }),
  );
}

// Top products --------------------------------------------------------------------

export type TopProduct = { name: string; quantity: number; revenueMinor: number };

type TopProductRow = {
  name_snapshot: string;
  qty: number;
  line_total_minor: number;
  orders: { fx_rate_used: number; country_code: string } | null;
};

/**
 * Grouped by `order_items.name_snapshot`, not a live `products` join —
 * `name_snapshot` is what was actually sold (survives a product later being
 * renamed, re-categorized, or deleted) and needs no extra join for display.
 * `orders!inner(...)` restricts to paid orders via a nested-column filter.
 */
export async function getTopProducts(admin: AdminClient, limit = 5): Promise<TopProduct[]> {
  const [{ data, error }, exponents] = await Promise.all([
    admin
      .from('order_items')
      .select('name_snapshot, qty, line_total_minor, orders!inner(fx_rate_used, country_code, payment_status)')
      .eq('orders.payment_status', 'paid'),
    loadCurrencyExponents(admin),
  ]);
  if (error) throw new Error(`reading top products: ${error.message}`);

  const totals = new Map<string, { quantity: number; revenueMinor: number }>();
  for (const row of (data ?? []) as unknown as TopProductRow[]) {
    if (!row.orders) continue;
    const exponent = exponents.get(row.orders.country_code) ?? OMR_EXPONENT;
    const revenueMinor = toOmrMinor(row.line_total_minor, row.orders.fx_rate_used, exponent);

    const existing = totals.get(row.name_snapshot) ?? { quantity: 0, revenueMinor: 0 };
    existing.quantity += row.qty;
    existing.revenueMinor += revenueMinor;
    totals.set(row.name_snapshot, existing);
  }

  return [...totals.entries()]
    .map(([name, v]) => ({ name, ...v }))
    .sort((a, b) => b.quantity - a.quantity)
    .slice(0, limit);
}

// Customer growth -----------------------------------------------------------------

export type CustomerGrowthPoint = { date: string; newCustomers: number };

/** New `customers` rows over a date range, bucketed by day. */
export async function getCustomerGrowth(admin: AdminClient, range: AnalyticsDateRange): Promise<CustomerGrowthPoint[]> {
  const { data, error } = await admin
    .from('customers')
    .select('created_at')
    .gte('created_at', range.from)
    .lte('created_at', range.to)
    .order('created_at', { ascending: true });
  if (error) throw new Error(`reading customer growth: ${error.message}`);

  const buckets = new Map<string, number>();
  for (const row of data ?? []) {
    const key = row.created_at.slice(0, 10);
    buckets.set(key, (buckets.get(key) ?? 0) + 1);
  }

  return [...buckets.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([date, newCustomers]) => ({ date, newCustomers }));
}

// Dashboard summary -----------------------------------------------------------------

export type DashboardSummary = {
  totalRevenueMinor: number;
  orderCount: number;
  customerCount: number;
  /** `payment_status = 'paid' and fulfilment_status = 'pending'` — the `orders_needs_fulfilment_idx` partial index path. */
  pendingFulfilmentCount: number;
};

/**
 * Headline cards for the dashboard. `totalRevenueMinor` reads every paid
 * order's amount (not just a count) to normalize + sum it — fine at current
 * order volumes; would want a database-side sum (or materialized view) if
 * order volume grows large enough for this to matter, same caveat as
 * `getRevenueSeries`.
 */
export async function getDashboardSummary(admin: AdminClient): Promise<DashboardSummary> {
  const [revenueResult, exponents, orderCountResult, customerCountResult, pendingResult] = await Promise.all([
    admin.from('orders').select('total_minor, fx_rate_used, country_code').eq('payment_status', 'paid'),
    loadCurrencyExponents(admin),
    admin.from('orders').select('*', { count: 'exact', head: true }),
    admin.from('customers').select('*', { count: 'exact', head: true }),
    admin
      .from('orders')
      .select('*', { count: 'exact', head: true })
      .eq('payment_status', 'paid')
      .eq('fulfilment_status', 'pending'),
  ]);

  if (revenueResult.error) throw new Error(`reading dashboard revenue: ${revenueResult.error.message}`);
  if (orderCountResult.error) throw new Error(`counting orders: ${orderCountResult.error.message}`);
  if (customerCountResult.error) throw new Error(`counting customers: ${customerCountResult.error.message}`);
  if (pendingResult.error) throw new Error(`counting pending-fulfilment orders: ${pendingResult.error.message}`);

  const totalRevenueMinor = (revenueResult.data ?? []).reduce((sum, row) => {
    const exponent = exponents.get(row.country_code) ?? OMR_EXPONENT;
    return sum + toOmrMinor(row.total_minor, row.fx_rate_used, exponent);
  }, 0);

  return {
    totalRevenueMinor,
    orderCount: orderCountResult.count ?? 0,
    customerCount: customerCountResult.count ?? 0,
    pendingFulfilmentCount: pendingResult.count ?? 0,
  };
}
