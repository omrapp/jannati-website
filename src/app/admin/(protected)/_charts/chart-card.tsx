import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';

/** Plain layout shell — no client-only APIs, safe to render straight from a Server Component. */
export function ChartCard({
  title,
  action,
  children,
  className,
}: {
  title: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('bg-card flex flex-col gap-4 rounded-xl border p-5', className)}>
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold">{title}</h2>
        {action}
      </div>
      {children}
    </div>
  );
}
