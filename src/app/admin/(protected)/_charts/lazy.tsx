'use client';

import dynamic from 'next/dynamic';

/**
 * `ssr: false` is only legal inside a Client Component
 * (`node_modules/next/dist/docs/01-app/02-guides/lazy-loading.md`:
 * "ssr: false is not allowed with next/dynamic in Server Components") —
 * this file exists purely so every dashboard/analytics page (a Server
 * Component, for the data fetch) can render a chart without ever calling
 * `dynamic()` itself. Recharts measures its container via the DOM
 * (`ResponsiveContainer`), so skipping the server render entirely avoids a
 * 0×0-then-resize flash and any server/client markup mismatch.
 */
const chartLoading = () => <div className="bg-muted h-64 w-full animate-pulse rounded-lg" />;

export const RevenueChart = dynamic(() => import('./revenue-chart').then((m) => m.RevenueChart), {
  ssr: false,
  loading: chartLoading,
});

export const OrderStatusChart = dynamic(() => import('./order-status-chart').then((m) => m.OrderStatusChart), {
  ssr: false,
  loading: chartLoading,
});

export const TopProductsChart = dynamic(() => import('./top-products-chart').then((m) => m.TopProductsChart), {
  ssr: false,
  loading: chartLoading,
});

export const CustomerGrowthChart = dynamic(() => import('./customer-growth-chart').then((m) => m.CustomerGrowthChart), {
  ssr: false,
  loading: chartLoading,
});
