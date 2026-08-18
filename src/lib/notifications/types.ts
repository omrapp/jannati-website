/**
 * Notification adapter interface — mirrors the payment adapter shape
 * (`src/lib/payments/provider.ts`, 2.11/2.12): one small interface,
 * `resend.ts`/`twilio.ts` implement it, `dispatch.ts` is the only thing that
 * knows both exist. Every order event fires both channels independently —
 * a shopper with no phone on file just means the SMS channel has nothing to
 * send, not a hard dependency between the two.
 */

import type { Locale } from '@/i18n/config';

export type NotificationEvent = 'order_created' | 'order_shipped' | 'order_delivered';

export type NotificationInput = {
  event: NotificationEvent;
  orderNumber: string;
  /**
   * Full `{language}-{country}` locale, snapshotted on the order at
   * checkout (`orders.locale`, `20260817000001_orders_locale.sql`) — the
   * shopper's language at the moment they checked out, not whichever staff
   * member later changes the order's status. `templates.ts` only reads its
   * language half, but the full locale is what `formatMoney` needs to match
   * the storefront's own number formatting.
   */
  locale: Locale;
  customerName: string;
  /** `null` skips the channel entirely — see `dispatch.ts`. */
  customerEmail: string | null;
  customerPhone: string | null;
  totalMinor: number;
  currency: string;
  currencyExponent: number;
  trackingUrl: string | null;
};

export interface NotificationChannel {
  readonly id: 'email' | 'sms';
  send(input: NotificationInput): Promise<void>;
}
