'use client';

import type { LucideIcon } from 'lucide-react';

import { cn } from '@/lib/utils';
import { CountUpNumber } from './count-up';

/** Headline metric card — animated number via `useCountUp`, matching `reveal.tsx`'s no-library convention. */
export function StatCard({
  label,
  value,
  formatter,
  icon: Icon,
  className,
}: {
  label: string;
  value: number;
  formatter?: (n: number) => string;
  icon: LucideIcon;
  className?: string;
}) {
  return (
    <div className={cn('bg-card flex flex-col gap-3 rounded-xl border p-5', className)}>
      <div className="bg-primary/10 text-primary flex size-11 items-center justify-center rounded-lg">
        <Icon className="size-5" />
      </div>
      <div className="flex flex-col gap-0.5">
        <span className="text-muted-foreground text-sm">{label}</span>
        <CountUpNumber value={value} formatter={formatter} className="text-2xl font-semibold tabular-nums" />
      </div>
    </div>
  );
}
