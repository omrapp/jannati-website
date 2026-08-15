/**
 * Thawani adapter — Oman's payment gateway, session-based checkout, behind
 * `PaymentProvider`. **Not live**: `THAWANI_SECRET_KEY` is unset (2.11 is
 * blocked on Oman CR + sandbox credentials, see `tasks/todo.md`); every
 * function here throws a clear config error before doing anything
 * network-facing until it's supplied.
 *
 * API shape verified against Thawani's public docs (session creation,
 * retrieval) — not against a live account:
 * https://docs.thawani.om/docs/thawani-ecommerce-api. One deliberate
 * design choice, not a gap to fix later: public docs don't document an
 * HMAC (or any) webhook-signature scheme the way Tap's do, so this adapter
 * never trusts a webhook payload's own status field at all. It re-reads the
 * session directly from Thawani's API (`GET /checkout/session/{id}`, using
 * our own secret key) and treats *that* response as the only source of
 * truth — the same "never trust the client, recompute/reverify server-side"
 * rule this codebase applies everywhere else, just applied to "client"
 * meaning "whatever hit this endpoint" rather than a shopper's browser.
 */

import { env } from '@/lib/env';

import type { PaymentStatus } from './idempotency';
import type { CreatePaymentInput, CreatePaymentResult, PaymentProvider, WebhookResult } from './provider';

function apiBase(): string {
  return env.thawaniEnv === 'production'
    ? 'https://checkout.thawani.om/api/v1'
    : 'https://uatcheckout.thawani.om/api/v1';
}

function requireKeys(): { secretKey: string; publishableKey: string } {
  if (!env.thawaniSecretKey || !env.thawaniPublishableKey) {
    throw new Error('THAWANI_SECRET_KEY and THAWANI_PUBLISHABLE_KEY are required to use Thawani');
  }
  return { secretKey: env.thawaniSecretKey, publishableKey: env.thawaniPublishableKey };
}

type ThawaniSessionResponse = {
  data: { session_id: string; client_reference_id: string; payment_status: string };
};

async function createSession(input: CreatePaymentInput): Promise<{ sessionId: string; payUrl: string }> {
  const { secretKey, publishableKey } = requireKeys();

  const response = await fetch(`${apiBase()}/checkout/session`, {
    method: 'POST',
    headers: { 'thawani-api-key': secretKey, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_reference_id: input.orderId,
      mode: 'payment',
      products: [
        // Thawani totals a session from its line items, so one line
        // carrying the already-computed order total (not per-item prices)
        // keeps this adapter from having to re-derive a per-line breakdown
        // it has no use for — the same amount was already the order of
        // record the moment `createOrder` wrote it.
        { name: `Jannati order ${input.orderNumber}`, unit_amount: input.totalMinor, quantity: 1 },
      ],
      success_url: `${env.siteUrl}/${input.locale}/checkout/confirmation/${input.orderNumber}`,
      cancel_url: `${env.siteUrl}/${input.locale}/checkout`,
    }),
  });

  if (!response.ok) {
    throw new Error(`Thawani session creation failed: ${response.status} ${await response.text()}`);
  }

  const payload = (await response.json()) as { data: { session_id: string } };
  const sessionId = payload.data.session_id;

  return { sessionId, payUrl: `https://checkout.thawani.om/pay/${sessionId}?key=${publishableKey}` };
}

async function retrieveSession(sessionId: string): Promise<ThawaniSessionResponse['data']> {
  const { secretKey } = requireKeys();

  const response = await fetch(`${apiBase()}/checkout/session/${sessionId}`, {
    headers: { 'thawani-api-key': secretKey },
  });

  if (!response.ok) {
    throw new Error(`Thawani session lookup failed: ${response.status} ${await response.text()}`);
  }

  const payload = (await response.json()) as ThawaniSessionResponse;
  return payload.data;
}

/**
 * Only `paid` is a documented terminal-success value. Same reasoning as
 * `mapTapStatus`: everything else defaults to `pending` rather than
 * guessing at a `failed` mapping from an unconfirmed status string.
 */
export function mapThawaniStatus(paymentStatus: string): PaymentStatus {
  return paymentStatus === 'paid' ? 'paid' : 'pending';
}

/** Reads a session id from either a webhook POST body or a redirect-callback query string. */
export async function extractSessionId(request: Request): Promise<string | null> {
  const fromQuery = new URL(request.url).searchParams.get('session_id');
  if (fromQuery) return fromQuery;

  if (request.method !== 'POST') return null;

  const body = (await request.json().catch(() => null)) as { session_id?: string; data?: { session_id?: string } } | null;
  return body?.session_id ?? body?.data?.session_id ?? null;
}

export const thawaniProvider: PaymentProvider = {
  id: 'thawani',

  async createPayment(input: CreatePaymentInput): Promise<CreatePaymentResult> {
    const session = await createSession(input);
    return { kind: 'redirect', url: session.payUrl };
  },

  async handleWebhook(request: Request): Promise<WebhookResult> {
    const sessionId = await extractSessionId(request);
    if (!sessionId) throw new Error('Thawani callback missing session_id');

    const session = await retrieveSession(sessionId);

    return {
      orderId: session.client_reference_id,
      status: mapThawaniStatus(session.payment_status),
      note: `Thawani session ${sessionId} status: ${session.payment_status}`,
    };
  },
};
