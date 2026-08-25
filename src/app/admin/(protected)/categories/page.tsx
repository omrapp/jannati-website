import Link from 'next/link';

import { BulkActionBar } from '@/components/admin/bulk-action-bar';
import { BulkSelectProvider, RowCheckbox, SelectAllCheckbox } from '@/components/admin/bulk-select-provider';
import { Button } from '@/components/ui/button';
import { listCategories, type Category } from '@/lib/admin/taxonomy';
import { createClient } from '@/lib/supabase/server';
import { bulkArchiveCategories, bulkRestoreCategories } from './bulk-actions';

type Row = Category & { depth: number };

/** Depth-first walk from the roots so the table reads as a tree via
 * indentation — same "boring over clever" call as 3.3's up/down buttons
 * instead of drag-and-drop; a real `<ul>` tree widget isn't worth it for a
 * few dozen rows staff mostly reorder by `sort_order`, not by dragging. */
function asTree(categories: Category[]): Row[] {
  const byParent = new Map<string | null, Category[]>();
  for (const c of categories) {
    const key = c.parent_id;
    byParent.set(key, [...(byParent.get(key) ?? []), c]);
  }

  const rows: Row[] = [];
  function walk(parentId: string | null, depth: number) {
    for (const c of byParent.get(parentId) ?? []) {
      rows.push({ ...c, depth });
      walk(c.id, depth + 1);
    }
  }
  walk(null, 0);

  // Orphans: a `parent_id` pointing at a deleted-or-never-existed row (shouldn't
  // happen — FK is `on delete set null` — kept as a fallback so a bad row
  // still shows up somewhere instead of silently vanishing from the list).
  const seen = new Set(rows.map((r) => r.id));
  for (const c of categories) if (!seen.has(c.id)) rows.push({ ...c, depth: 0 });

  return rows;
}

export default async function AdminCategoriesPage({
  searchParams,
}: {
  searchParams: Promise<{ archived?: string }>;
}) {
  const { archived } = await searchParams;
  const showArchived = archived === '1';
  const client = await createClient();
  const categories = await listCategories(client, { includeArchived: showArchived });
  const rows = asTree(categories);

  // Default view hides archived categories (matches public RLS); toggling
  // "show archived" is also how a staff member reaches restore.
  const bulkAction = showArchived
    ? { label: 'Restore selected', onConfirm: bulkRestoreCategories, variant: 'default' as const }
    : { label: 'Archive selected', onConfirm: bulkArchiveCategories, variant: 'destructive' as const };

  return (
    <BulkSelectProvider>
      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold">Categories ({categories.length})</h1>
          <div className="flex items-center gap-4">
            <Link
              href={showArchived ? '/admin/categories' : '/admin/categories?archived=1'}
              className="text-sm text-muted-foreground hover:underline"
            >
              {showArchived ? 'Hide archived' : 'Show archived'}
            </Link>
            <Button asChild>
              <Link href="/admin/categories/new">New category</Link>
            </Button>
          </div>
        </div>

        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left text-muted-foreground">
              <th className="w-8 py-2 font-medium">
                <SelectAllCheckbox ids={rows.map((c) => c.id)} />
              </th>
              <th className="py-2 font-medium">Name</th>
              <th className="py-2 font-medium">Slug</th>
              <th className="py-2 font-medium">Sort order</th>
              {showArchived && <th className="py-2 font-medium">Status</th>}
            </tr>
          </thead>
          <tbody>
            {rows.map((c) => (
              <tr key={c.id} className="border-b last:border-0">
                <td className="py-2">
                  <RowCheckbox id={c.id} />
                </td>
                <td className="py-2" style={{ paddingInlineStart: `${c.depth * 1.5}rem` }}>
                  <Link href={`/admin/categories/${c.id}`} className="hover:underline">
                    {c.name_en ?? c.name_ar}
                  </Link>
                </td>
                <td className="py-2 text-muted-foreground">{c.slug}</td>
                <td className="py-2">{c.sort_order}</td>
                {showArchived && <td className="py-2 text-muted-foreground">{c.is_archived ? 'Archived' : ''}</td>}
              </tr>
            ))}
          </tbody>
        </table>

        {categories.length === 0 && (
          <p className="text-muted-foreground text-sm">
            {showArchived ? 'No archived categories.' : 'No categories yet.'}
          </p>
        )}

        <BulkActionBar label={bulkAction.label} onConfirm={bulkAction.onConfirm} variant={bulkAction.variant} />
      </div>
    </BulkSelectProvider>
  );
}
