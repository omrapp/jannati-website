'use client';

import { useTransition } from 'react';

import { Button } from '@/components/ui/button';
import { useBulkSelect } from './bulk-select-provider';

/**
 * Floating action bar shown once any row is selected via `BulkSelectProvider`.
 * Generic across products/brands/categories: the caller just binds a
 * `'use server'` action (e.g. `bulkArchiveProducts`) as `onConfirm` — this
 * component reads the ids to act on from context so a page never has to
 * thread `selectedIds` through by hand.
 */
export function BulkActionBar({
  label,
  onConfirm,
  variant = 'default',
}: {
  label: string;
  onConfirm: (ids: string[]) => Promise<void>;
  variant?: 'default' | 'destructive';
}) {
  const { selectedIds, clear } = useBulkSelect();
  const [pending, startTransition] = useTransition();

  if (selectedIds.size === 0) return null;

  function handleConfirm() {
    const ids = [...selectedIds];
    startTransition(async () => {
      await onConfirm(ids);
      clear();
    });
  }

  return (
    <div className="bg-background sticky bottom-4 z-10 flex items-center justify-between gap-4 rounded-md border p-3 shadow-md">
      <span className="text-sm font-medium">{selectedIds.size} selected</span>
      <div className="flex gap-2">
        <Button type="button" variant="ghost" size="sm" disabled={pending} onClick={clear}>
          Clear
        </Button>
        <Button type="button" variant={variant} size="sm" disabled={pending} onClick={handleConfirm}>
          {pending ? 'Working…' : label}
        </Button>
      </div>
    </div>
  );
}
