import { getTranslations } from 'next-intl/server';

import { CartTotals } from '@/components/commerce/cart-totals';
import type { Locale } from '@/i18n/config';
import { formatMoney } from '@/lib/commerce/money';
import type { OrderDetail, ShippingAddressInput } from '@/lib/commerce/orders';
import type { CountryPricing } from '@/lib/commerce/types';

/**
 * Renders a fully-created order — confirmation page and (later) the
 * customer's own order-history detail view share this, since both show the
 * same snapshot data (`order_items`, `shipping_address`) rather than
 * anything recomputed from a live cart.
 */
export async function OrderSummary({
  detail,
  pricing,
  locale,
}: {
  detail: OrderDetail;
  pricing: CountryPricing;
  locale: Locale;
}) {
  const t = await getTranslations('orders');
  const tCheckout = await getTranslations('checkout');
  // `shipping_address` is stored as `jsonb`, written by this same app at
  // order-creation time (`createOrder`'s `p_shipping_address`) — cast, not
  // re-validated, same trust level as any other snapshot column here.
  const address = detail.order.shipping_address as unknown as ShippingAddressInput;
  const money = (minor: number) => formatMoney(minor, pricing, locale);

  return (
    <div className="flex flex-col gap-8">
      <section className="flex flex-wrap items-center justify-between gap-2 text-sm">
        <span className="text-muted-foreground">{t('orderNumberLabel')}</span>
        <span className="font-medium">{detail.order.order_number}</span>
      </section>

      <section className="flex flex-wrap items-center justify-between gap-2 text-sm">
        <span className="text-muted-foreground">{t('statusLabel')}</span>
        <span className="font-medium">{t(`status.${detail.order.fulfilment_status}`)}</span>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-lg font-medium">{t('itemsHeading')}</h2>
        <ul className="divide-y">
          {detail.items.map((item) => (
            <li key={item.id} className="flex items-center justify-between py-2 text-sm">
              <span>
                {item.name_snapshot} × {item.qty}
              </span>
              <span>{money(item.line_total_minor)}</span>
            </li>
          ))}
        </ul>
        <CartTotals
          subtotal={money(detail.order.subtotal_minor)}
          discount={detail.order.discount_minor > 0 ? money(detail.order.discount_minor) : null}
          shipping={money(detail.order.shipping_minor)}
          vat={money(detail.order.vat_minor)}
          total={money(detail.order.total_minor)}
        />
      </section>

      <section className="flex flex-col gap-1 text-sm">
        <h2 className="text-lg font-medium">{t('paymentMethodLabel')}</h2>
        <p>{tCheckout(detail.order.payment_provider)}</p>
      </section>

      <section className="flex flex-col gap-1 text-sm">
        <h2 className="text-lg font-medium">{t('deliveryAddressLabel')}</h2>
        <p className="font-medium">{address.fullName}</p>
        <p className="text-muted-foreground">{address.phone}</p>
        <p className="text-muted-foreground">
          {address.line1}
          {address.area ? `, ${address.area}` : ''}, {address.city}
        </p>
      </section>
    </div>
  );
}
