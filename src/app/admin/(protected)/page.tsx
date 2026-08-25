import { DollarSign, ShoppingCart, Truck, Users } from 'lucide-react';
import Link from 'next/link';

import { getDashboardSummary, getOrderStatusBreakdown, getRevenueSeries, getTopProducts } from '@/lib/admin/analytics';
import { createAdminClient } from '@/lib/supabase/admin';
import { ChartCard } from './_charts/chart-card';
import { OrderStatusChart, RevenueChart, TopProductsChart } from './_charts/lazy';
import { StatCard } from './_charts/stat-card';

const DASHBOARD_RANGE_DAYS = 30;

/**
 * Metric cards + a quick visual overview (3 charts) — the fuller breakdown
 * with a date-range picker lives at `/admin/analytics`. Data is fetched here
 * (Server Component) and passed as plain props to the lazy client charts
 * under `_charts/` — see `_charts/lazy.tsx` for why the `dynamic(...,
 * { ssr: false })` calls can't live in this file directly.
 */
export default async function AdminDashboardPage() {
  const admin = createAdminClient();

  const to = new Date();
  const from = new Date(to);
  from.setUTCDate(from.getUTCDate() - DASHBOARD_RANGE_DAYS);

  const [summary, revenueSeries, statusBreakdown, topProducts] = await Promise.all([
    getDashboardSummary(admin),
    getRevenueSeries(admin, { from: from.toISOString(), to: to.toISOString() }, 'day'),
    getOrderStatusBreakdown(admin),
    getTopProducts(admin, 5),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold">Dashboard</h1>
        <p className="text-muted-foreground text-sm">Last {DASHBOARD_RANGE_DAYS} days, unless noted otherwise.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Total revenue"
          value={summary.totalRevenueMinor}
          format="omr"
          icon={<DollarSign className="size-5" />}
        />
        <StatCard label="Orders" value={summary.orderCount} icon={<ShoppingCart className="size-5" />} />
        <StatCard label="Customers" value={summary.customerCount} icon={<Users className="size-5" />} />
        <StatCard label="Needs fulfilment" value={summary.pendingFulfilmentCount} icon={<Truck className="size-5" />} />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <ChartCard
          title="Revenue"
          className="lg:col-span-2"
          action={
            <Link href="/admin/analytics" className="text-primary text-xs font-medium hover:underline">
              View analytics
            </Link>
          }
        >
          <RevenueChart data={revenueSeries} />
        </ChartCard>

        <ChartCard title="Orders by status">
          <OrderStatusChart data={statusBreakdown} />
        </ChartCard>

        <ChartCard title="Top products" className="lg:col-span-3">
          <TopProductsChart data={topProducts} />
        </ChartCard>
      </div>
    </div>
  );
}
