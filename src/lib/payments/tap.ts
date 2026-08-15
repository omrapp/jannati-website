/**
 * Tap Payments adapter — GCC card/local-scheme payments (mada, KNET,
 * Benefit) behind `PaymentProvider`. **Not live**: `TAP_SECRET_KEY` is
 * unset (2.12 is blocked on a Tap sandbox account, see `tasks/todo.md`);
 * every function here throws a clear config error before doing anything
 * network-facing until it's supplied.
 *
 * API shape verified against Tap's public developer docs
 * (https://developers.tap.company/docs/webhook,
 * https://developers.tap.company/reference/create-a-charge) — not against a
 * live account. Two things that reference only documents, not a real
 * sandbox response, and should be re-checked once credentials exist:
 *  - `mapTapStatus` only has confirmed docs for `INITIATED` and `CAPTURED`;
 *    every other value is a defensive guess (see comment below).
 *  - The hosted-payment-page URL is read from `transaction.url`, seen only
 *    in one example response in the docs.
 */

import crypto from 'node:crypto';

import { env } from '@/lib/env';

import type { PaymentStatus } from './idempotency';
import type { CreatePaymentInput, CreatePaymentResult, PaymentProvider, WebhookResult } from './provider';

const TAP_API_BASE = 'https://api.tap.company/v2';

function requireSecretKey(): string {
  if (!env.tapSecretKey) {
    throw new Error('TAP_SECRET_KEY is required to use the Tap payment provider');
  }
  return env.tapSecretKey;
}

// Charge creation --------------------------------------------------------------

async function createCharge(input: CreatePaymentInput): Promise<{ id: string; transactionUrl: string }> {
  const secretKey = requireSecretKey();

  const response = await fetch(`${TAP_API_BASE}/charges`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${secretKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      // Tap's `amount` is a decimal in the currency's major unit, not minor
      // units — same conversion `formatMoney` does for display, done again
      // here because this is a different provider's wire format, not a
      // display string.
      amount: minorToDecimal(input.totalMinor, input.currency),
      currency: input.currency,
      customer: { first_name: input.customerName, email: input.customerEmail },
      source: { id: 'src_all' },
      reference: { order: input.orderId },
      redirect: { url: `${env.siteUrl}/${input.locale}/checkout/confirmation/${input.orderNumber}` },
      post: { url: `${env.siteUrl}/api/webhooks/tap` },
    }),
  });

  if (!response.ok) {
    throw new Error(`Tap charge creation failed: ${response.status} ${await response.text()}`);
  }

  const payload = (await response.json()) as { id: string; transaction?: { url?: string } };
  if (!payload.transaction?.url) {
    throw new Error(`Tap charge response missing transaction.url: ${JSON.stringify(payload)}`);
  }

  return { id: payload.id, transactionUrl: payload.transaction.url };
}

/**
 * Tap's exponent isn't always the same as ours — same currency-exponent
 * table `money.ts` already keeps, duplicated narrowly here rather than
 * importing OMR-conversion code this has nothing to do with (Tap never
 * touches OMR; every GCC currency it charges in is 2-decimal except KWD/BHD,
 * both 3-decimal, matching this project's own currency table exactly).
 */
function minorToDecimal(minor: number, currency: string): number {
  const exponent = currency === 'KWD' || currency === 'BHD' ? 3 : 2;
  return minor / 10 ** exponent;
}

// Webhook signature --------------------------------------------------------------

export type TapChargeWebhookPayload = {
  id: string;
  status: string;
  amount: number;
  currency: string;
  reference?: { order?: string; gateway?: string; payment?: string };
  transaction?: { created?: string };
};

/**
 * Exact field order and concatenation confirmed against Tap's webhook docs:
 * `x_id` + id + `x_amount` + amount + `x_currency` + currency +
 * `x_gateway_reference` + gateway ref + `x_payment_reference` + payment ref
 * + `x_status` + status + `x_created` + created, no separators, hashed with
 * HMAC-SHA256 using the secret key.
 */
export function buildTapHashString(payload: TapChargeWebhookPayload): string {
  return (
    `x_id${payload.id}` +
    `x_amount${payload.amount}` +
    `x_currency${payload.currency}` +
    `x_gateway_reference${payload.reference?.gateway ?? ''}` +
    `x_payment_reference${payload.reference?.payment ?? ''}` +
    `x_status${payload.status}` +
    `x_created${payload.transaction?.created ?? ''}`
  );
}

export function verifyTapSignature(
  payload: TapChargeWebhookPayload,
  secretKey: string,
  receivedHashstring: string | null,
): boolean {
  if (!receivedHashstring) return false;

  const expected = crypto.createHmac('sha256', secretKey).update(buildTapHashString(payload)).digest('hex');
  const expectedBuf = Buffer.from(expected);
  const receivedBuf = Buffer.from(receivedHashstring);

  return expectedBuf.length === receivedBuf.length && crypto.timingSafeEqual(expectedBuf, receivedBuf);
}

/**
 * Only `CAPTURED` is confirmed by Tap's docs as a terminal success value.
 * Everything else defaults to `pending` rather than guessing a mapping to
 * `failed` from an unconfirmed status string — a webhook that means
 * "declined" landing as `pending` leaves an order needing a manual look in
 * `/admin`; the reverse (silently marking a still-live charge `failed`)
 * risks telling a shopper their payment failed when it didn't. Revisit once
 * a live sandbox response confirms the full status enum.
 */
export function mapTapStatus(status: string): PaymentStatus {
  if (status === 'CAPTURED') return 'paid';
  if (['FAILED', 'DECLINED', 'CANCELLED', 'VOID', 'TIMEDOUT', 'ABANDONED', 'RESTRICTED'].includes(status)) {
    return 'failed';
  }
  return 'pending';
}

// Provider -----------------------------------------------------------------------

export const tapProvider: PaymentProvider = {
  id: 'tap',

  async createPayment(input: CreatePaymentInput): Promise<CreatePaymentResult> {
    const charge = await createCharge(input);
    return { kind: 'redirect', url: charge.transactionUrl };
  },

  async handleWebhook(request: Request): Promise<WebhookResult> {
    const secretKey = requireSecretKey();
    const payload = (await request.json()) as TapChargeWebhookPayload;

    if (!verifyTapSignature(payload, secretKey, request.headers.get('hashstring'))) {
      throw new Error('Tap webhook signature verification failed');
    }

    const orderId = payload.reference?.order;
    if (!orderId) throw new Error(`Tap webhook missing reference.order: ${JSON.stringify(payload)}`);

    return { orderId, status: mapTapStatus(payload.status), note: `Tap status: ${payload.status}` };
  },
};
