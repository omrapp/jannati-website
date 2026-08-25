import Link from 'next/link';

import { listOrders } from '@/lib/admin/orders';
import { minorToDecimalString } from '@/lib/commerce/money';
import { createAdminClient } from '@/lib/supabase/admin';

/**
 * Invoices are just paid orders viewed through a printable template — there's
 * no separate `invoices` table (per `plans/admin-dashboard.md`, no PDF
 * library either: `invoices/[id]` prints via `@media print`). This list
 * reuses `listOrders` filtered to `payment_status: 'paid'`, same data source
 * `/admin/orders` uses.
 */
export default async function AdminInvoicesPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const { page } = await searchParams;
  const admin = createAdminClient();

  const [{ items, total }, { data: countries }] = await Promise.all([
    listOrders(admin, { paymentStatus: 'paid', page: page ? Number(page) : 1 }),
    admin.from('countries').select('code, currency_exponent'),
  ]);

  const exponentByCountry = new Map((countries ?? []).map((c) => [c.code, c.currency_exponent]));

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold">Invoices ({total})</h1>
        <p className="text-muted-foreground text-sm">Paid orders. Open one to view and print its invoice.</p>
      </div>

      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-left text-muted-foreground">
            <th className="py-2 font-medium">Order</th>
            <th className="py-2 font-medium">Country</th>
            <th className="py-2 font-medium">Total</th>
            <th className="py-2 font-medium">Fulfilment</th>
            <th className="py-2 font-medium">Placed</th>
            <th className="py-2 font-medium" />
          </tr>
        </thead>
        <tbody>
          {items.map((o) => {
            const exponent = exponentByCountry.get(o.country_code) ?? 2;
            return (
              <tr key={o.id} className="border-b last:border-0">
                <td className="py-2">
                  {o.order_number}
                  {o.guest_email && <span className="text-muted-foreground"> · {o.guest_email}</span>}
                </td>
                <td className="py-2">{o.country_code.toUpperCase()}</td>
                <td className="py-2">
                  {minorToDecimalString(o.total_minor, exponent)} {o.currency}
                </td>
                <td className="py-2">{o.fulfilment_status}</td>
                <td className="py-2 text-muted-foreground">{new Date(o.created_at).toLocaleString()}</td>
                <td className="py-2 text-right">
                  <Link href={`/admin/invoices/${o.id}`} className="text-primary hover:underline">
                    View invoice
                  </Link>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {items.length === 0 && <p className="text-muted-foreground text-sm">No paid orders yet.</p>}
    </div>
  );
}
