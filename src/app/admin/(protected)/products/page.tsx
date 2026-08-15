import Link from 'next/link';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { listProducts, type ProductStatus } from '@/lib/admin/products';
import { minorToDecimalString, OMR_EXPONENT } from '@/lib/commerce/money';
import { createClient } from '@/lib/supabase/server';

const STATUSES: ProductStatus[] = ['draft', 'active', 'archived'];

export default async function AdminProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; page?: string }>;
}) {
  const { q, status, page } = await searchParams;
  const client = await createClient();
  const { items, total } = await listProducts(client, {
    search: q,
    status: status && STATUSES.includes(status as ProductStatus) ? (status as ProductStatus) : undefined,
    page: page ? Number(page) : 1,
  });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Products ({total})</h1>
        <Button asChild>
          <Link href="/admin/products/new">New product</Link>
        </Button>
      </div>

      <form className="flex gap-2" method="get">
        <Input name="q" placeholder="Search name or handle" defaultValue={q} className="max-w-xs" />
        <select
          name="status"
          defaultValue={status ?? ''}
          className="border-input h-9 rounded-md border bg-transparent px-3 text-sm"
        >
          <option value="">All statuses</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <Button type="submit" variant="ghost">
          Filter
        </Button>
      </form>

      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-left text-muted-foreground">
            <th className="py-2 font-medium">Name</th>
            <th className="py-2 font-medium">Handle</th>
            <th className="py-2 font-medium">Brand</th>
            <th className="py-2 font-medium">Status</th>
            <th className="py-2 font-medium">Variants</th>
            <th className="py-2 font-medium">From</th>
          </tr>
        </thead>
        <tbody>
          {items.map((p) => (
            <tr key={p.id} className="border-b last:border-0">
              <td className="py-2">
                <Link href={`/admin/products/${p.id}`} className="hover:underline">
                  {p.nameEn ?? p.nameAr}
                </Link>
              </td>
              <td className="py-2 text-muted-foreground">{p.handle}</td>
              <td className="py-2">{p.brandName ?? '—'}</td>
              <td className="py-2">{p.status}</td>
              <td className="py-2">{p.variantCount}</td>
              <td className="py-2">
                {p.minPriceMinor !== null ? `${minorToDecimalString(p.minPriceMinor, OMR_EXPONENT)} OMR` : '—'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {items.length === 0 && <p className="text-muted-foreground text-sm">No products match.</p>}
    </div>
  );
}
