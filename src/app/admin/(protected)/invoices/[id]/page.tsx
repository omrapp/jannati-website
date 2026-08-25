import { notFound } from 'next/navigation';

import type { Locale } from '@/i18n/config';
import { getOrderForAdmin } from '@/lib/admin/orders';
import { getSiteSettings } from '@/lib/admin/site-settings';
import { toCountryPricing } from '@/lib/catalog/mappers';
import { formatMoney } from '@/lib/commerce/money';
import type { ShippingAddressInput } from '@/lib/commerce/orders';
import { createAdminClient } from '@/lib/supabase/admin';
import { PrintButton } from './print-button';

/**
 * Printable invoice for one order — no PDF library (per
 * `plans/admin-dashboard.md`), just `@media print` rules on the same markup
 * the screen renders. Letterhead comes from `site_settings` (Task 5.1),
 * same singleton row the storefront footer reads.
 */
export default async function AdminInvoicePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const admin = createAdminClient();

  const [detail, settings] = await Promise.all([getOrderForAdmin(admin, id), getSiteSettings(admin)]);
  if (!detail) notFound();

  const { data: countryRow } = await admin
    .from('countries')
    .select('code, currency, currency_exponent, fx_rate_from_omr, rounding_step_minor')
    .eq('code', detail.order.country_code)
    .single();
  if (!countryRow) notFound();

  const pricing = toCountryPricing(countryRow);
  const money = (minor: number) => formatMoney(minor, pricing, `en-${countryRow.code}` as Locale);
  const address = detail.order.shipping_address as unknown as ShippingAddressInput;
  const legalName = settings.legal_entity_name_en || 'Jannati';

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between print:hidden">
        <h1 className="text-xl font-semibold">Invoice {detail.order.order_number}</h1>
        <PrintButton />
      </div>

      <div className="bg-card mx-auto w-full max-w-3xl rounded-xl border p-8 print:m-0 print:max-w-none print:border-0 print:p-0 print:shadow-none">
        <div className="flex items-start justify-between gap-4 border-b pb-6">
          <div>
            <h2 className="text-lg font-semibold">{legalName}</h2>
            {settings.address_en && <p className="text-muted-foreground text-sm">{settings.address_en}</p>}
            {settings.email && <p className="text-muted-foreground text-sm">{settings.email}</p>}
            {settings.phone && <p className="text-muted-foreground text-sm">{settings.phone}</p>}
            {settings.registration_number && (
              <p className="text-muted-foreground text-sm">Reg. no. {settings.registration_number}</p>
            )}
          </div>
          <div className="text-right">
            <h3 className="text-base font-semibold">Invoice</h3>
            <p className="text-muted-foreground text-sm">{detail.order.order_number}</p>
            <p className="text-muted-foreground text-sm">{new Date(detail.order.created_at).toLocaleDateString()}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 py-6 text-sm">
          <div>
            <h4 className="text-muted-foreground mb-1 font-medium">Bill to</h4>
            <p className="font-medium">{address.fullName}</p>
            <p>{address.phone}</p>
            <p>
              {address.line1}
              {address.area ? `, ${address.area}` : ''}, {address.city}, {address.countryCode.toUpperCase()}
            </p>
          </div>
          <div className="text-right">
            <h4 className="text-muted-foreground mb-1 font-medium">Payment</h4>
            <p>{detail.order.payment_provider}</p>
            <p className="capitalize">{detail.order.payment_status}</p>
          </div>
        </div>

        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left">
              <th className="py-2 font-medium">Item</th>
              <th className="py-2 text-right font-medium">Qty</th>
              <th className="py-2 text-right font-medium">Total</th>
            </tr>
          </thead>
          <tbody>
            {detail.items.map((item) => (
              <tr key={item.id} className="border-b last:border-0">
                <td className="py-2">
                  {item.name_snapshot} {item.sku ? `(${item.sku})` : ''}
                </td>
                <td className="py-2 text-right">{item.qty}</td>
                <td className="py-2 text-right">{money(item.line_total_minor)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="ms-auto mt-4 flex w-full max-w-xs flex-col gap-1 text-sm">
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
          <div className="flex justify-between border-t pt-1 text-base font-semibold">
            <span>Total</span>
            <span>{money(detail.order.total_minor)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
