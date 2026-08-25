import Link from 'next/link';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CUSTOMERS_PAGE_SIZE, listCustomers } from '@/lib/admin/customers';
import { createAdminClient } from '@/lib/supabase/admin';

export default async function AdminCustomersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  const { q, page } = await searchParams;
  const admin = createAdminClient();
  const pageNum = page ? Number(page) : 1;
  const { items, total } = await listCustomers(admin, { q, page: pageNum });

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-semibold">Customers ({total})</h1>

      <form className="flex gap-2" method="get">
        <Input name="q" placeholder="Search email or phone" defaultValue={q} className="max-w-xs" />
        <Button type="submit" variant="ghost">
          Search
        </Button>
      </form>

      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-left text-muted-foreground">
            <th className="py-2 font-medium">Email</th>
            <th className="py-2 font-medium">Phone</th>
            <th className="py-2 font-medium">Locale</th>
            <th className="py-2 font-medium">Status</th>
            <th className="py-2 font-medium">Joined</th>
          </tr>
        </thead>
        <tbody>
          {items.map((c) => (
            <tr key={c.id} className="border-b last:border-0">
              <td className="py-2">
                <Link href={`/admin/customers/${c.id}`} className="hover:underline">
                  {c.email ?? '—'}
                </Link>
              </td>
              <td className="py-2">{c.phone ?? '—'}</td>
              <td className="py-2">{c.default_locale}</td>
              <td className="py-2">
                <div className="flex gap-1">
                  {c.is_login_blocked && <Badge variant="destructive">Login blocked</Badge>}
                  {c.is_checkout_blocked && <Badge variant="destructive">Checkout blocked</Badge>}
                  {!c.is_login_blocked && !c.is_checkout_blocked && <span className="text-muted-foreground">—</span>}
                </div>
              </td>
              <td className="py-2 text-muted-foreground">{new Date(c.created_at).toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {items.length === 0 && <p className="text-muted-foreground text-sm">No customers match.</p>}

      <div className="flex gap-4 text-sm">
        {pageNum > 1 && (
          <Link
            className="hover:underline"
            href={`/admin/customers?${new URLSearchParams({ ...(q ? { q } : {}), page: String(pageNum - 1) })}`}
          >
            ← Previous
          </Link>
        )}
        {items.length === CUSTOMERS_PAGE_SIZE && (
          <Link
            className="hover:underline"
            href={`/admin/customers?${new URLSearchParams({ ...(q ? { q } : {}), page: String(pageNum + 1) })}`}
          >
            Next →
          </Link>
        )}
      </div>
    </div>
  );
}
