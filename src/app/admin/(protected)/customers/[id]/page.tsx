import { notFound } from 'next/navigation';
import Link from 'next/link';

import { getCustomerDetail } from '@/lib/admin/customers';
import { minorToDecimalString } from '@/lib/commerce/money';
import { createAdminClient } from '@/lib/supabase/admin';
import { CustomerModerationControls } from './customer-moderation-controls';
import { DeleteCustomerButton } from './delete-customer-button';

export default async function AdminCustomerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const admin = createAdminClient();

  const [detail, { data: countries }] = await Promise.all([
    getCustomerDetail(admin, id),
    admin.from('countries').select('code, currency_exponent').order('code'),
  ]);
  if (!detail) notFound();

  const exponentByCountry = new Map((countries ?? []).map((c) => [c.code, c.currency_exponent]));

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-xl font-semibold">{detail.email ?? 'Customer'}</h1>
        <p className="text-muted-foreground text-sm">
          {detail.customer.phone ?? 'No phone on file'} · Joined {new Date(detail.customer.created_at).toLocaleString()}
          {' · '}
          Marketing opt-in: {detail.customer.marketing_opt_in ? 'yes' : 'no'}
        </p>
      </div>

      <CustomerModerationControls
        customerId={detail.customer.id}
        isLoginBlocked={detail.customer.is_login_blocked}
        isCheckoutBlocked={detail.customer.is_checkout_blocked}
        blockedReason={detail.customer.blocked_reason}
      />

      <section className="flex flex-col gap-2">
        <h2 className="text-lg font-medium">Addresses ({detail.addresses.length})</h2>
        {detail.addresses.length === 0 && <p className="text-muted-foreground text-sm">No addresses saved.</p>}
        <ul className="flex flex-col gap-2">
          {detail.addresses.map((a) => (
            <li key={a.id} className="rounded-md border p-3 text-sm">
              <p className="font-medium">
                {a.full_name} {a.is_default && <span className="text-muted-foreground">(default)</span>}
              </p>
              <p className="text-muted-foreground">{a.phone}</p>
              <p>
                {a.line1}, {a.area ? `${a.area}, ` : ''}
                {a.city}, {a.country_code.toUpperCase()}
              </p>
            </li>
          ))}
        </ul>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-lg font-medium">Orders ({detail.orders.length})</h2>
        {detail.orders.length === 0 && <p className="text-muted-foreground text-sm">No orders yet.</p>}
        {detail.orders.length > 0 && (
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
              {detail.orders.map((o) => {
                const exponent = exponentByCountry.get(o.country_code) ?? 2;
                return (
                  <tr key={o.id} className="border-b last:border-0">
                    <td className="py-2">
                      <Link href={`/admin/orders/${o.id}`} className="hover:underline">
                        {o.order_number}
                      </Link>
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
        )}
      </section>

      <section className="flex flex-col gap-2 rounded-md border border-destructive/40 p-4">
        <h2 className="text-lg font-medium text-destructive">Danger zone</h2>
        <p className="text-muted-foreground text-sm">
          Permanently deletes this customer&apos;s account and all data tied to it. This can&apos;t be undone.
        </p>
        <div>
          <DeleteCustomerButton customerId={detail.customer.id} />
        </div>
      </section>
    </div>
  );
}
