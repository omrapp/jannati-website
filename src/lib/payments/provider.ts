/**
 * Payment provider interface. `2.11`/`2.12` slot Thawani and Tap in behind
 * this without checkout UI or `orders.ts` changing at all — the checkout
 * action only ever knows "call `createPayment`, then either redirect or show
 * the confirmation page," never a provider's own SDK or API shape.
 */

import type { Locale } from '@/i18n/config';
import type { Database } from '@/lib/supabase/types';

export type PaymentProviderId = Database['public']['Enums']['payment_provider'];

export type CreatePaymentInput = {
  orderId: string;
  orderNumber: string;
  totalMinor: number;
  currency: string;
  /** Both Thawani and Tap require a customer name/email on the charge — COD ignores these. */
  customerName: string;
  customerEmail: string;
  /** Needed to build a locale-correct redirect/success URL back into the storefront. */
  locale: Locale;
};

/**
 * `redirect` — the shopper needs to leave the site to pay (Thawani, Tap);
 * the checkout action sends them to `url` and the provider's webhook is what
 * eventually moves `payment_status` off `pending`.
 *
 * `immediate` — nothing to redirect to; the order's `payment_status` is
 * already known at order-creation time (COD is always `pending` until
 * delivery, per `cod.ts`).
 */
export type CreatePaymentResult =
  | { kind: 'redirect'; url: string }
  | { kind: 'immediate'; status: Database['public']['Enums']['payment_status'] };

/**
 * `orderId` here is *our* `orders.id` — Thawani/Tap adapters send it out at
 * `createPayment` time (as `client_reference_id` / `reference.order`) and
 * only ever read it back, so resolving a webhook to an order never needs a
 * database round trip inside the adapter itself.
 */
export type WebhookResult = {
  orderId: string;
  status: Database['public']['Enums']['payment_status'];
  note?: string;
};

export interface PaymentProvider {
  readonly id: PaymentProviderId;
  createPayment(input: CreatePaymentInput): Promise<CreatePaymentResult>;
  /** Verifies and parses a provider's webhook request. Not called for COD — it has none. */
  handleWebhook(request: Request): Promise<WebhookResult>;
}
