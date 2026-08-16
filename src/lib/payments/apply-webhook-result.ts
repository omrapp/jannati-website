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
 * `mark_payment_status` is in generated `types.ts` now, but typegen doesn't
 * express function-arg nullability — `p_note text` (nullable in the SQL
 * signature) comes out as `p_note: string`, not `string | null`. `Omit` at
 * *every* nesting level, not just `Functions`: `Database & {public: ...}`
 * alone still merges the untouched top-level `public` back in, which
 * re-collides at `Functions.mark_payment_status` one level down and
 * collapses `p_note` to non-nullable again.
 */
type DatabaseWithMarkPaymentStatus = Omit<Database, 'public'> & {
  public: Omit<Database['public'], 'Functions'> & {
    Functions: Omit<Database['public']['Functions'], 'mark_payment_status'> & {
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
