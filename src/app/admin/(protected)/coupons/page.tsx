import Link from 'next/link';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { listCoupons } from '@/lib/admin/coupons';
import { createAdminClient } from '@/lib/supabase/admin';

export default async function AdminCouponsPage() {
  const admin = createAdminClient();
  const coupons = await listCoupons(admin);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Coupons ({coupons.length})</h1>
        <Button asChild>
          <Link href="/admin/coupons/new">New coupon</Link>
        </Button>
      </div>

      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-left text-muted-foreground">
            <th className="py-2 font-medium">Code</th>
            <th className="py-2 font-medium">Type</th>
            <th className="py-2 font-medium">Value</th>
            <th className="py-2 font-medium">Window</th>
            <th className="py-2 font-medium">Status</th>
          </tr>
        </thead>
        <tbody>
          {coupons.map((c) => (
            <tr key={c.id} className="border-b last:border-0">
              <td className="py-2">
                <Link href={`/admin/coupons/${c.id}`} className="font-medium hover:underline">
                  {c.code}
                </Link>
              </td>
              <td className="py-2 text-muted-foreground">{c.type}</td>
              <td className="py-2">{c.type === 'percent' ? `${c.value}%` : c.value}</td>
              <td className="py-2 text-muted-foreground">
                {c.starts_at ? new Date(c.starts_at).toLocaleDateString() : '—'} –{' '}
                {c.ends_at ? new Date(c.ends_at).toLocaleDateString() : '—'}
              </td>
              <td className="py-2">
                <Badge variant={c.active ? 'default' : 'secondary'}>{c.active ? 'Active' : 'Inactive'}</Badge>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {coupons.length === 0 && <p className="text-muted-foreground text-sm">No coupons yet.</p>}
    </div>
  );
}
