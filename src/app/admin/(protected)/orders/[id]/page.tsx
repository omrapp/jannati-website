import { notFound } from 'next/navigation';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { Locale } from '@/i18n/config';
import { toCountryPricing } from '@/lib/catalog/mappers';
import { getOrderForAdmin } from '@/lib/admin/orders';
import { isAllowedFulfilmentTransition, FULFILMENT_STATUSES } from '@/lib/commerce/fulfilment';
import { formatMoney } from '@/lib/commerce/money';
import type { ShippingAddressInput } from '@/lib/commerce/orders';
import { createAdminClient } from '@/lib/supabase/admin';
import { transitionFulfilmentStatusAction, updateTrackingAction } from './actions';

export default async function AdminOrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const admin = createAdminClient();

  const detail = await getOrderForAdmin(admin, id);
  if (!detail) notFound();

  const { data: countryRow } = await admin
    .from('countries')
    .select('code, currency, currency_exponent, fx_rate_from_omr, rounding_step_minor')
    .eq('code', detail.order.country_code)
    .single();
  if (!countryRow) notFound();

  const pricing = toCountryPricing(countryRow);
  // Admin UI is plain English, not locale-routed — `en-<order's country>` is
  // just for `Intl.NumberFormat`'s currency symbol placement, not a language
  // choice staff make.
  const money = (minor: number) => formatMoney(minor, pricing, `en-${countryRow.code}` as Locale);
  // Written by this same app at order-creation time — cast, not re-validated,
  // same trust level as `OrderSummary`'s customer-facing read of the same column.
  const address = detail.order.shipping_address as unknown as ShippingAddressInput;

  const nextStatuses = FULFILMENT_STATUSES.filter((s) =>
    isAllowedFulfilmentTransition(detail.order.fulfilment_status, s),
  );

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Order {detail.order.order_number}</h1>
        <div className="text-muted-foreground text-sm">
          Payment: {detail.order.payment_status} · Fulfilment: {detail.order.fulfilment_status}
        </div>
      </div>

      <section className="flex flex-col gap-2">
        <h2 className="text-lg font-medium">Items</h2>
        <ul className="divide-y">
          {detail.items.map((item) => (
            <li key={item.id} className="flex items-center justify-between py-2 text-sm">
              <span>
                {item.name_snapshot} {item.sku ? `(${item.sku})` : ''} × {item.qty}
              </span>
              <span>{money(item.line_total_minor)}</span>
            </li>
          ))}
        </ul>
        <div className="flex flex-col gap-1 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Subtotal</span>
            <span>{money(detail.order.subtotal_minor)}</span>
          </div>
          {detail.order.discount_minor > 0 && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Discount</span>
              <span>-{money(detail.order.discount_minor)}</span>
            </div>
          )}
          <div className="flex justify-between">
            <span className="text-muted-foreground">Shipping</span>
            <span>{money(detail.order.shipping_minor)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">VAT</span>
            <span>{money(detail.order.vat_minor)}</span>
          </div>
          <div className="flex justify-between font-medium">
            <span>Total</span>
            <span>{money(detail.order.total_minor)}</span>
          </div>
        </div>
      </section>

      <section className="flex flex-col gap-1 text-sm">
        <h2 className="text-lg font-medium">Customer</h2>
        <p>{detail.order.customer_id ? `Account: ${detail.order.customer_id}` : `Guest: ${detail.order.guest_email}`}</p>
        <p className="text-muted-foreground">
          Payment method: {detail.order.payment_provider} · Coupon: {detail.order.coupon_code ?? '—'}
        </p>
      </section>

      <section className="flex flex-col gap-1 text-sm">
        <h2 className="text-lg font-medium">Delivery address</h2>
        <p className="font-medium">{address.fullName}</p>
        <p className="text-muted-foreground">{address.phone}</p>
        <p className="text-muted-foreground">
          {address.line1}
          {address.area ? `, ${address.area}` : ''}, {address.city}, {address.countryCode.toUpperCase()}
        </p>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-medium">Fulfilment</h2>
        {nextStatuses.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            {detail.order.fulfilment_status} is a final status — no further transition.
          </p>
        ) : (
          <div className="flex flex-wrap gap-3">
            {nextStatuses.map((status) => (
              <form
                key={status}
                action={transitionFulfilmentStatusAction.bind(null, detail.order.id, status)}
                className="flex items-end gap-2 rounded-md border p-3"
              >
                <div className="flex flex-col gap-1">
                  <Label htmlFor={`note-${status}`}>Note (optional)</Label>
                  <Input id={`note-${status}`} name="note" className="w-56" />
                </div>
                <Button type="submit" size="sm">
                  Mark {status}
                </Button>
              </form>
            ))}
          </div>
        )}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-medium">Tracking</h2>
        <form action={updateTrackingAction.bind(null, detail.order.id)} className="flex items-end gap-2">
          <div className="flex flex-col gap-1">
            <Label htmlFor="trackingNumber">Tracking number</Label>
            <Input
              id="trackingNumber"
              name="trackingNumber"
              defaultValue={detail.order.tracking_number ?? ''}
              className="w-48"
            />
          </div>
          <div className="flex flex-col gap-1">
            <Label htmlFor="trackingUrl">Tracking URL</Label>
            <Input id="trackingUrl" name="trackingUrl" defaultValue={detail.order.tracking_url ?? ''} className="w-64" />
          </div>
          <Button type="submit" variant="secondary" size="sm">
            Save
          </Button>
        </form>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-lg font-medium">Event timeline</h2>
        <ul className="divide-y text-sm">
          {detail.events.map((event) => (
            <li key={event.id} className="flex items-center justify-between py-2">
              <span>
                {event.status}
                {event.note ? ` — ${event.note}` : ''}
              </span>
              <span className="text-muted-foreground">{new Date(event.created_at).toLocaleString()}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
