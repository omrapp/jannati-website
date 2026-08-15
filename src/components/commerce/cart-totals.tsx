import { useTranslations } from 'next-intl';

import { cn } from '@/lib/utils';

/**
 * Every amount arrives pre-formatted for the shopper's currency — same
 * contract as `PriceDisplay`. No money math lives here, only the breakdown
 * layout: subtotal, discount (if any), shipping, VAT, then the total.
 */
export function CartTotals({
  subtotal,
  discount,
  shipping,
  vat,
  total,
  className,
}: {
  subtotal: string;
  discount: string | null;
  shipping: string;
  vat: string;
  total: string;
  className?: string;
}) {
  const t = useTranslations('cart');

  return (
    <dl className={cn('flex flex-col gap-2 text-sm', className)}>
      <Row label={t('subtotal')} value={subtotal} />
      {discount && <Row label={t('discount')} value={`− ${discount}`} />}
      <Row label={t('shipping')} value={shipping} />
      <Row label={t('vat')} value={vat} />
      <div className="mt-2 flex items-center justify-between border-t pt-2 text-base font-semibold">
        <dt>{t('total')}</dt>
        <dd>{total}</dd>
      </div>
    </dl>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="text-muted-foreground flex items-center justify-between">
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}
