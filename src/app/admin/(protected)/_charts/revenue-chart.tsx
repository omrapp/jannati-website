'use client';

import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

import { OMR_EXPONENT } from '@/lib/commerce/money';
import type { RevenuePoint } from '@/lib/admin/analytics';
import { CHART_COLORS } from './chart-colors';

function toMajor(minor: number): number {
  return minor / 10 ** OMR_EXPONENT;
}

function formatDateTick(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

/**
 * Revenue is OMR-normalized (see `analytics.ts`'s `toOmrMinor`) — every
 * point is comparable regardless of which currency the underlying orders
 * were placed in, so a plain area chart is meaningful across the whole GCC
 * order mix.
 */
export function RevenueChart({ data }: { data: RevenuePoint[] }) {
  const chartData = data.map((point) => ({ ...point, revenueMajor: toMajor(point.revenueMinor) }));

  if (chartData.length === 0) {
    return <p className="text-muted-foreground flex h-64 items-center justify-center text-sm">No revenue in this range yet.</p>;
  }

  return (
    <ResponsiveContainer width="100%" height={256}>
      <AreaChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="revenueFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={CHART_COLORS.primary} stopOpacity={0.35} />
            <stop offset="100%" stopColor={CHART_COLORS.primary} stopOpacity={0} />
          </linearGradient>
        </defs>
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
          width={48}
          tickFormatter={(v: number) => v.toLocaleString('en-US')}
        />
        <Tooltip
          labelFormatter={(label) => formatDateTick(String(label))}
          formatter={(value) => [`${Number(value).toLocaleString('en-US', { minimumFractionDigits: OMR_EXPONENT })} OMR`, 'Revenue']}
          contentStyle={{
            background: 'var(--color-popover)',
            border: `1px solid ${CHART_COLORS.border}`,
            borderRadius: 8,
            fontSize: 12,
          }}
        />
        <Area type="monotone" dataKey="revenueMajor" stroke={CHART_COLORS.primary} strokeWidth={2} fill="url(#revenueFill)" />
      </AreaChart>
    </ResponsiveContainer>
  );
}
