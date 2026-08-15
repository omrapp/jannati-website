import Link from 'next/link';

import { Button } from '@/components/ui/button';
import { listBrands } from '@/lib/admin/taxonomy';
import { createClient } from '@/lib/supabase/server';

export default async function AdminBrandsPage() {
  const client = await createClient();
  const brands = await listBrands(client);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Brands ({brands.length})</h1>
        <Button asChild>
          <Link href="/admin/brands/new">New brand</Link>
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
          {brands.map((b) => (
            <tr key={b.id} className="border-b last:border-0">
              <td className="py-2">
                <Link href={`/admin/brands/${b.id}`} className="hover:underline">
                  {b.name_en}
                </Link>
              </td>
              <td className="py-2 text-muted-foreground">{b.slug}</td>
              <td className="py-2">{b.sort_order}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {brands.length === 0 && <p className="text-muted-foreground text-sm">No brands yet.</p>}
    </div>
  );
}
