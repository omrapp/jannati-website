'use client';

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';

import { Checkbox } from '@/components/ui/checkbox';

/**
 * Generic row-selection state shared by every admin list page that needs
 * bulk actions (products, brands, categories) — domain-agnostic on purpose,
 * so it doesn't know about statuses or archiving, just a set of selected
 * row ids.
 */
type BulkSelectContextValue = {
  selectedIds: Set<string>;
  toggle: (id: string) => void;
  toggleAll: (ids: string[]) => void;
  clear: () => void;
  isSelected: (id: string) => boolean;
};

const BulkSelectContext = createContext<BulkSelectContextValue | null>(null);

export function BulkSelectProvider({ children }: { children: ReactNode }) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const toggle = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  // Acts as "select all" / "clear all" for whatever id list the caller
  // passes (typically the current page's rows) — toggles off if every one
  // of those ids is already selected, on otherwise.
  const toggleAll = useCallback((ids: string[]) => {
    setSelectedIds((prev) => {
      const allSelected = ids.length > 0 && ids.every((id) => prev.has(id));
      return allSelected ? new Set() : new Set(ids);
    });
  }, []);

  const clear = useCallback(() => setSelectedIds(new Set()), []);
  const isSelected = useCallback((id: string) => selectedIds.has(id), [selectedIds]);

  const value = useMemo<BulkSelectContextValue>(
    () => ({ selectedIds, toggle, toggleAll, clear, isSelected }),
    [selectedIds, toggle, toggleAll, clear, isSelected],
  );

  return <BulkSelectContext.Provider value={value}>{children}</BulkSelectContext.Provider>;
}

export function useBulkSelect(): BulkSelectContextValue {
  const ctx = useContext(BulkSelectContext);
  if (!ctx) throw new Error('useBulkSelect must be used within a BulkSelectProvider');
  return ctx;
}

/**
 * Per-row checkbox bound to the context. Lives here rather than in each
 * list page because a Server Component can't pass an `onCheckedChange`
 * closure to a Client Component — this needs its own client boundary to
 * read `useBulkSelect()`, same reason `DeleteBannerButton` exists.
 */
export function RowCheckbox({ id }: { id: string }) {
  const { isSelected, toggle } = useBulkSelect();
  return <Checkbox checked={isSelected(id)} onCheckedChange={() => toggle(id)} aria-label="Select row" />;
}

/** Header "select all on page" checkbox for whatever id list is currently rendered. */
export function SelectAllCheckbox({ ids }: { ids: string[] }) {
  const { selectedIds, toggleAll } = useBulkSelect();
  const allSelected = ids.length > 0 && ids.every((id) => selectedIds.has(id));
  return <Checkbox checked={allSelected} onCheckedChange={() => toggleAll(ids)} aria-label="Select all on page" />;
}
