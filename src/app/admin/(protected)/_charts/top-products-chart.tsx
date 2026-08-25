'use client';

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

import type { TopProduct } from '@/lib/admin/analytics';
import { CHART_COLORS } from './chart-colors';

/** Truncates a long product name for the Y-axis label; the full name is still in the tooltip. */
function truncate(name: string, max = 22): string {
  return name.length > max ? `${name.slice(0, max - 1)}…` : name;
}

export function TopProductsChart({ data }: { data: TopProduct[] }) {
  if (data.length === 0) {
    return <p className="text-muted-foreground flex h-64 items-center justify-center text-sm">No sales yet.</p>;
  }

  // Highest quantity at the top — recharts renders category axes bottom-up, so reverse.
  const chartData = [...data].reverse().map((p) => ({ ...p, label: truncate(p.name) }));

  return (
    <ResponsiveContainer width="100%" height={Math.max(200, chartData.length * 44)}>
      <BarChart data={chartData} layout="vertical" margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.border} horizontal={false} />
        <XAxis type="number" tick={{ fontSize: 12, fill: CHART_COLORS.muted }} axisLine={false} tickLine={false} allowDecimals={false} />
        <YAxis
          type="category"
          dataKey="label"
          tick={{ fontSize: 12, fill: CHART_COLORS.muted }}
          axisLine={false}
          tickLine={false}
          width={140}
        />
        <Tooltip
          labelFormatter={(label, payload) => (payload?.[0]?.payload as { name?: string })?.name ?? label}
          formatter={(value) => [`${Number(value)} sold`, 'Quantity']}
          contentStyle={{
            background: 'var(--color-popover)',
            border: `1px solid ${CHART_COLORS.border}`,
            borderRadius: 8,
            fontSize: 12,
          }}
        />
        <Bar dataKey="quantity" fill={CHART_COLORS.primary} radius={[0, 4, 4, 0]} maxBarSize={22} />
      </BarChart>
    </ResponsiveContainer>
  );
}
