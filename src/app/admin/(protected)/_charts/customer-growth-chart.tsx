'use client';

import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

import type { CustomerGrowthPoint } from '@/lib/admin/analytics';
import { CHART_COLORS } from './chart-colors';

function formatDateTick(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function CustomerGrowthChart({ data }: { data: CustomerGrowthPoint[] }) {
  if (data.length === 0) {
    return <p className="text-muted-foreground flex h-64 items-center justify-center text-sm">No new customers in this range yet.</p>;
  }

  return (
    <ResponsiveContainer width="100%" height={256}>
      <LineChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.border} vertical={false} />
        <XAxis
          dataKey="date"
          tickFormatter={formatDateTick}
          tick={{ fontSize: 12, fill: CHART_COLORS.muted }}
          axisLine={{ stroke: CHART_COLORS.border }}
          tickLine={false}
        />
        <YAxis
          tick={{ fontSize: 12, fill: CHART_COLORS.muted }}
          axisLine={false}
          tickLine={false}
          width={32}
          allowDecimals={false}
        />
        <Tooltip
          labelFormatter={(label) => formatDateTick(String(label))}
          formatter={(value) => [`${Number(value)} new`, 'Customers']}
          contentStyle={{
            background: 'var(--color-popover)',
            border: `1px solid ${CHART_COLORS.border}`,
            borderRadius: 8,
            fontSize: 12,
          }}
        />
        <Line
          type="monotone"
          dataKey="newCustomers"
          stroke={CHART_COLORS.accent}
          strokeWidth={2}
          dot={{ r: 3, fill: CHART_COLORS.accent }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
