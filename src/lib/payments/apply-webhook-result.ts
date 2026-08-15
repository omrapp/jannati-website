/**
 * Shared by every webhook route (`src/app/api/webhooks/{tap,thawani}/route.ts`)
 * once a provider's `handleWebhook` has already verified the request and
 * resolved it to a `WebhookResult` — this is only the "write it" half,
 * which is identical across providers: call the atomic, idempotent RPC
 * (`mark_payment_status`, `supabase/migrations/20260815000002_mark_payment_status_rpc.sql`)
 * and let it decide whether the transition applies.
 */

import type { SupabaseClient } from '@supabase/supabase-js';

import { createAdminClient } from '@/lib/supabase/admin';
import type { Database } from '@/lib/supabase/types';

import type { PaymentStatus } from './idempotency';
import type { WebhookResult } from './provider';

/**
 * `mark_payment_status` doesn't exist in `Database` at all yet — unlike
 * `create_order`'s args-nullability gap in `orders.ts`, this migration
 * hasn't been through `db:push`/`gen types` yet (project rule: migrations
 * are written, not applied, by the assistant). A local extension of
 * `Functions` is a narrower workaround than casting the whole call to
 * `any`: everything past this cast — `admin.rpc('mark_payment_status', …)`
 * — stays fully typed. Delete this once the real migration lands in
 * generated types and replace with a plain `admin.rpc(...)` call.
 */
type DatabaseWithMarkPaymentStatus = Database & {
  public: Database['public'] & {
    Functions: Database['public']['Functions'] & {
      mark_payment_status: {
        Args: { p_order_id: string; p_status: PaymentStatus; p_note: string | null };
        Returns: boolean;
      };
    };
  };
};

export async function applyPaymentWebhookResult(result: WebhookResult): Promise<boolean> {
  const admin = createAdminClient() as unknown as SupabaseClient<DatabaseWithMarkPaymentStatus>;

  const { data, error } = await admin.rpc('mark_payment_status', {
    p_order_id: result.orderId,
    p_status: result.status,
    p_note: result.note ?? null,
  });
  if (error) throw new Error(`marking payment status: ${error.message}`);

  return data;
}
