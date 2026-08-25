'use client';

import type { ReactNode } from 'react';

import { OMR_EXPONENT } from '@/lib/commerce/money';
import { cn } from '@/lib/utils';
import { CountUpNumber } from './count-up';

function formatOmrMinor(n: number): string {
  return `${(n / 10 ** OMR_EXPONENT).toLocaleString('en-US', { maximumFractionDigits: 0 })} OMR`;
}

/** Headline metric card — animated number via `useCountUp`, matching `reveal.tsx`'s no-library convention. */
export function StatCard({
  label,
  value,
  // A named format, not a function reference — a plain function isn't
  // serializable across the Server->Client boundary either (same rule as
  // `icon` below), so the formatter itself has to live on this side.
  format,
  icon,
  className,
}: {
  label: string;
  value: number;
  format?: 'omr';
  // Rendered node, not a component reference — a `LucideIcon` (forwardRef
  // object) isn't plain-object-serializable across the Server->Client
  // boundary. Callers render `<Icon />` themselves and pass the element.
  icon: ReactNode;
  className?: string;
}) {
  const formatter = format === 'omr' ? formatOmrMinor : undefined;

  return (
    <div className={cn('bg-card flex flex-col gap-3 rounded-xl border p-5', className)}>
      <div className="bg-primary/10 text-primary flex size-11 items-center justify-center rounded-lg">
        {icon}
      </div>
      <div className="flex flex-col gap-0.5">
        <span className="text-muted-foreground text-sm">{label}</span>
        <CountUpNumber value={value} formatter={formatter} className="text-2xl font-semibold tabular-nums" />
      </div>
    </div>
  );
}
