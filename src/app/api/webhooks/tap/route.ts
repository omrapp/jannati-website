import { applyPaymentWebhookResult } from '@/lib/payments/apply-webhook-result';
import { getPaymentProvider } from '@/lib/payments/registry';

/**
 * Verifies and applies a Tap charge webhook. Not wired to a live account
 * yet (2.12 blocked, see `tasks/todo.md`) — this exists so the endpoint,
 * signature check, and idempotent apply path are all in place the moment
 * credentials land, rather than being written under pressure alongside a
 * first live test.
 */
export async function POST(request: Request): Promise<Response> {
  let result;
  try {
    result = await getPaymentProvider('tap').handleWebhook(request);
  } catch (err) {
    // Signature failure, malformed payload, or missing config — never a
    // reason to touch the database. A 400 tells Tap not to keep retrying
    // a request that will never become valid.
    return new Response(err instanceof Error ? err.message : 'invalid webhook', { status: 400 });
  }

  await applyPaymentWebhookResult(result);

  // 200 whether or not the transition actually applied — a replay of an
  // already-applied event is a success from Tap's perspective too; a 4xx/5xx
  // here would just make it retry forever.
  return new Response(null, { status: 200 });
}
