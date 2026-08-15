import Link from 'next/link';

import { Button } from '@/components/ui/button';
import { listCategories, type Category } from '@/lib/admin/taxonomy';
import { createClient } from '@/lib/supabase/server';

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

export default async function AdminCategoriesPage() {
  const client = await createClient();
  const categories = await listCategories(client);
  const rows = asTree(categories);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Categories ({categories.length})</h1>
        <Button asChild>
          <Link href="/admin/categories/new">New category</Link>
        </Button>
      </div>

      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-left text-muted-foreground">
            <th className="py-2 font-medium">Name</th>
            <th className="py-2 font-medium">Slug</th>
            <th className="py-2 font-medium">Sort order</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((c) => (
            <tr key={c.id} className="border-b last:border-0">
              <td className="py-2" style={{ paddingInlineStart: `${c.depth * 1.5}rem` }}>
                <Link href={`/admin/categories/${c.id}`} className="hover:underline">
                  {c.name_en ?? c.name_ar}
                </Link>
              </td>
              <td className="py-2 text-muted-foreground">{c.slug}</td>
              <td className="py-2">{c.sort_order}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {categories.length === 0 && <p className="text-muted-foreground text-sm">No categories yet.</p>}
    </div>
  );
}
