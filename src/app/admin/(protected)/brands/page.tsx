import Link from 'next/link';

import { BulkActionBar } from '@/components/admin/bulk-action-bar';
import { BulkSelectProvider, RowCheckbox, SelectAllCheckbox } from '@/components/admin/bulk-select-provider';
import { Button } from '@/components/ui/button';
import { listBrands } from '@/lib/admin/taxonomy';
import { createClient } from '@/lib/supabase/server';
import { bulkArchiveBrands, bulkRestoreBrands } from './bulk-actions';

export default async function AdminBrandsPage({
  searchParams,
}: {
  searchParams: Promise<{ archived?: string }>;
}) {
  const { archived } = await searchParams;
  const showArchived = archived === '1';
  const client = await createClient();
  const brands = await listBrands(client, { includeArchived: showArchived });

  // Default view hides archived brands (matches public RLS); toggling
  // "show archived" is also how a staff member reaches restore.
  const bulkAction = showArchived
    ? { label: 'Restore selected', onConfirm: bulkRestoreBrands, variant: 'default' as const }
    : { label: 'Archive selected', onConfirm: bulkArchiveBrands, variant: 'destructive' as const };

  return (
    <BulkSelectProvider>
      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold">Brands ({brands.length})</h1>
          <div className="flex items-center gap-4">
            <Link
              href={showArchived ? '/admin/brands' : '/admin/brands?archived=1'}
              className="text-sm text-muted-foreground hover:underline"
            >
              {showArchived ? 'Hide archived' : 'Show archived'}
            </Link>
            <Button asChild>
              <Link href="/admin/brands/new">New brand</Link>
            </Button>
          </div>
        </div>

        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left text-muted-foreground">
              <th className="w-8 py-2 font-medium">
                <SelectAllCheckbox ids={brands.map((b) => b.id)} />
              </th>
              <th className="py-2 font-medium">Name</th>
              <th className="py-2 font-medium">Slug</th>
              <th className="py-2 font-medium">Sort order</th>
              {showArchived && <th className="py-2 font-medium">Status</th>}
            </tr>
          </thead>
          <tbody>
            {brands.map((b) => (
              <tr key={b.id} className="border-b last:border-0">
                <td className="py-2">
                  <RowCheckbox id={b.id} />
                </td>
                <td className="py-2">
                  <Link href={`/admin/brands/${b.id}`} className="hover:underline">
                    {b.name_en}
                  </Link>
                </td>
                <td className="py-2 text-muted-foreground">{b.slug}</td>
                <td className="py-2">{b.sort_order}</td>
                {showArchived && <td className="py-2 text-muted-foreground">{b.is_archived ? 'Archived' : ''}</td>}
              </tr>
            ))}
          </tbody>
        </table>

        {brands.length === 0 && (
          <p className="text-muted-foreground text-sm">
            {showArchived ? 'No archived brands.' : 'No brands yet.'}
          </p>
        )}

        <BulkActionBar label={bulkAction.label} onConfirm={bulkAction.onConfirm} variant={bulkAction.variant} />
      </div>
    </BulkSelectProvider>
  );
}
