'use client';

import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';

import type { OrderStatusBreakdown } from '@/lib/admin/analytics';
import { ORDER_STATUS_COLORS } from './chart-colors';

const STATUS_LABELS: Record<string, string> = {
  pending: 'Pending',
  processing: 'Processing',
  shipped: 'Shipped',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
};

export function OrderStatusChart({ data }: { data: OrderStatusBreakdown[] }) {
  const total = data.reduce((sum, d) => sum + d.count, 0);

  if (total === 0) {
    return <p className="text-muted-foreground flex h-64 items-center justify-center text-sm">No orders yet.</p>;
  }

  const chartData = data
    .filter((d) => d.count > 0)
    .map((d) => ({ name: STATUS_LABELS[d.status] ?? d.status, status: d.status, value: d.count }));

  return (
    <ResponsiveContainer width="100%" height={256}>
      <PieChart>
        <Pie data={chartData} dataKey="value" nameKey="name" innerRadius={56} outerRadius={88} paddingAngle={2}>
          {chartData.map((entry) => (
            <Cell key={entry.status} fill={ORDER_STATUS_COLORS[entry.status] ?? 'var(--color-muted-foreground)'} />
          ))}
        </Pie>
        <Tooltip
          formatter={(value, name) => [`${value} order${value === 1 ? '' : 's'}`, name]}
          contentStyle={{
            background: 'var(--color-popover)',
            border: '1px solid var(--color-border)',
            borderRadius: 8,
            fontSize: 12,
          }}
        />
        <Legend wrapperStyle={{ fontSize: 12 }} />
      </PieChart>
    </ResponsiveContainer>
  );
}
