import Link from 'next/link';

import { FULFILMENT_STATUSES, type FulfilmentStatus } from '@/lib/commerce/fulfilment';
import { listOrders } from '@/lib/admin/orders';
import { minorToDecimalString } from '@/lib/commerce/money';
import { createAdminClient } from '@/lib/supabase/admin';
import type { Database } from '@/lib/supabase/types';

type PaymentStatus = Database['public']['Enums']['payment_status'];
const PAYMENT_STATUSES: PaymentStatus[] = ['pending', 'paid', 'failed', 'refunded'];

export default async function AdminOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ payment?: string; fulfilment?: string; country?: string; page?: string }>;
}) {
  const { payment, fulfilment, country, page } = await searchParams;
  const admin = createAdminClient();

  const [{ items, total }, { data: countries }] = await Promise.all([
    listOrders(admin, {
      paymentStatus: PAYMENT_STATUSES.includes(payment as PaymentStatus) ? (payment as PaymentStatus) : undefined,
      fulfilmentStatus: FULFILMENT_STATUSES.includes(fulfilment as FulfilmentStatus)
        ? (fulfilment as FulfilmentStatus)
        : undefined,
      countryCode: country || undefined,
      page: page ? Number(page) : 1,
    }),
    admin.from('countries').select('code, currency_exponent').order('code'),
  ]);

  const exponentByCountry = new Map((countries ?? []).map((c) => [c.code, c.currency_exponent]));

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-semibold">Orders ({total})</h1>

      <form className="flex gap-2" method="get">
        <select
          name="payment"
          defaultValue={payment ?? ''}
          className="border-input h-9 rounded-md border bg-transparent px-3 text-sm"
        >
          <option value="">All payment statuses</option>
          {PAYMENT_STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <select
          name="fulfilment"
          defaultValue={fulfilment ?? ''}
          className="border-input h-9 rounded-md border bg-transparent px-3 text-sm"
        >
          <option value="">All fulfilment statuses</option>
          {FULFILMENT_STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <select
          name="country"
          defaultValue={country ?? ''}
          className="border-input h-9 rounded-md border bg-transparent px-3 text-sm"
        >
          <option value="">All countries</option>
          {[...exponentByCountry.keys()].map((code) => (
            <option key={code} value={code}>
              {code.toUpperCase()}
            </option>
          ))}
        </select>
        <button type="submit" className="text-sm underline">
          Filter
        </button>
      </form>

      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-left text-muted-foreground">
            <th className="py-2 font-medium">Order</th>
            <th className="py-2 font-medium">Country</th>
            <th className="py-2 font-medium">Total</th>
            <th className="py-2 font-medium">Payment</th>
            <th className="py-2 font-medium">Fulfilment</th>
            <th className="py-2 font-medium">Placed</th>
          </tr>
        </thead>
        <tbody>
          {items.map((o) => {
            const exponent = exponentByCountry.get(o.country_code) ?? 2;
            return (
              <tr key={o.id} className="border-b last:border-0">
                <td className="py-2">
                  <Link href={`/admin/orders/${o.id}`} className="hover:underline">
                    {o.order_number}
                  </Link>
                  {o.guest_email && <span className="text-muted-foreground"> · {o.guest_email}</span>}
                </td>
                <td className="py-2">{o.country_code.toUpperCase()}</td>
                <td className="py-2">
                  {minorToDecimalString(o.total_minor, exponent)} {o.currency}
                </td>
                <td className="py-2">{o.payment_status}</td>
                <td className="py-2">{o.fulfilment_status}</td>
                <td className="py-2 text-muted-foreground">{new Date(o.created_at).toLocaleString()}</td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {items.length === 0 && <p className="text-muted-foreground text-sm">No orders match.</p>}
    </div>
  );
}
