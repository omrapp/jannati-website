import { applyPaymentWebhookResult } from '@/lib/payments/apply-webhook-result';
import { getPaymentProvider } from '@/lib/payments/registry';

/**
 * Confirms and applies a Thawani session callback. Not wired to a live
 * account yet (2.11 blocked, see `tasks/todo.md`). Unlike Tap, this never
 * trusts anything the request itself claims — `thawani.ts`'s
 * `handleWebhook` re-reads the session from Thawani's API before returning
 * a status, so both POST (an async webhook, if one is configured in the
 * dashboard) and GET (a session-id-bearing redirect callback) land here the
 * same way.
 */
async function handle(request: Request): Promise<Response> {
  let result;
  try {
    result = await getPaymentProvider('thawani').handleWebhook(request);
  } catch (err) {
    return new Response(err instanceof Error ? err.message : 'invalid callback', { status: 400 });
  }

  await applyPaymentWebhookResult(result);

  return new Response(null, { status: 200 });
}

export const POST = handle;
export const GET = handle;
