import {
  getCustomerGrowth,
  getOrderStatusBreakdown,
  getRevenueSeries,
  getTopProducts,
  type RevenueBucketSize,
} from '@/lib/admin/analytics';
import { OMR_EXPONENT } from '@/lib/commerce/money';
import { createAdminClient } from '@/lib/supabase/admin';
import { ChartCard } from '../_charts/chart-card';
import { CustomerGrowthChart, OrderStatusChart, RevenueChart, TopProductsChart } from '../_charts/lazy';

const DEFAULT_RANGE_DAYS = 90;

function toDateInputValue(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function parseRangeParam(value: string | undefined, fallback: Date): Date {
  if (!value) return fallback;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(parsed.getTime()) ? fallback : parsed;
}

/**
 * Fuller breakdown page: a plain `<input type="date">` range (no flatpickr —
 * deliberately skipped per `plans/admin-dashboard.md`, recharts was chosen
 * over apexcharts specifically to avoid that dependency too) plus every
 * remaining `analytics.ts` function/chart the dashboard's quick overview
 * doesn't have room for.
 */
export default async function AdminAnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string; bucket?: string }>;
}) {
  const params = await searchParams;
  const admin = createAdminClient();

  const defaultTo = new Date();
  const defaultFrom = new Date(defaultTo);
  defaultFrom.setUTCDate(defaultFrom.getUTCDate() - DEFAULT_RANGE_DAYS);

  const from = parseRangeParam(params.from, defaultFrom);
  const to = parseRangeParam(params.to, defaultTo);
  const bucket: RevenueBucketSize = params.bucket === 'week' ? 'week' : 'day';

  const range = { from: from.toISOString(), to: to.toISOString() };

  const [revenueSeries, statusBreakdown, topProducts, customerGrowth] = await Promise.all([
    getRevenueSeries(admin, range, bucket),
    getOrderStatusBreakdown(admin),
    getTopProducts(admin, 10),
    getCustomerGrowth(admin, range),
  ]);

  const totalRevenueMinor = revenueSeries.reduce((sum, p) => sum + p.revenueMinor, 0);
  const totalOrders = revenueSeries.reduce((sum, p) => sum + p.orderCount, 0);
  const totalNewCustomers = customerGrowth.reduce((sum, p) => sum + p.newCustomers, 0);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold">Analytics</h1>
        <p className="text-muted-foreground text-sm">Revenue is normalized to OMR across every order currency.</p>
      </div>

      <form className="bg-card flex flex-wrap items-end gap-3 rounded-xl border p-4" method="get">
        <div className="flex flex-col gap-1">
          <label htmlFor="from" className="text-muted-foreground text-xs font-medium">
            From
          </label>
          <input
            id="from"
            name="from"
            type="date"
            defaultValue={toDateInputValue(from)}
            className="border-input h-9 rounded-md border bg-transparent px-3 text-sm"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="to" className="text-muted-foreground text-xs font-medium">
            To
          </label>
          <input
            id="to"
            name="to"
            type="date"
            defaultValue={toDateInputValue(to)}
            className="border-input h-9 rounded-md border bg-transparent px-3 text-sm"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="bucket" className="text-muted-foreground text-xs font-medium">
            Group by
          </label>
          <select
            id="bucket"
            name="bucket"
            defaultValue={bucket}
            className="border-input h-9 rounded-md border bg-transparent px-3 text-sm"
          >
            <option value="day">Day</option>
            <option value="week">Week</option>
          </select>
        </div>
        <button type="submit" className="bg-primary text-primary-foreground h-9 rounded-md px-4 text-sm font-medium">
          Apply
        </button>
      </form>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="bg-card rounded-xl border p-5">
          <p className="text-muted-foreground text-sm">Revenue (range)</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums">
            {(totalRevenueMinor / 10 ** OMR_EXPONENT).toLocaleString('en-US', { maximumFractionDigits: 0 })} OMR
          </p>
        </div>
        <div className="bg-card rounded-xl border p-5">
          <p className="text-muted-foreground text-sm">Orders (range)</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums">{totalOrders.toLocaleString('en-US')}</p>
        </div>
        <div className="bg-card rounded-xl border p-5">
          <p className="text-muted-foreground text-sm">New customers (range)</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums">{totalNewCustomers.toLocaleString('en-US')}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <ChartCard title="Revenue">
          <RevenueChart data={revenueSeries} />
        </ChartCard>
        <ChartCard title="Customer growth">
          <CustomerGrowthChart data={customerGrowth} />
        </ChartCard>
        <ChartCard title="Orders by status">
          <OrderStatusChart data={statusBreakdown} />
        </ChartCard>
        <ChartCard title="Top products">
          <TopProductsChart data={topProducts} />
        </ChartCard>
      </div>
    </div>
  );
}
