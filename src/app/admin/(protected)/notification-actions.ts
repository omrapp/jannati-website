'use server';

import { checkAdminAccess } from '@/lib/admin/auth';
import { markNotificationsSeen } from '@/lib/admin/notifications';
import { createAdminClient } from '@/lib/supabase/admin';

/**
 * Called when the bell panel opens. Re-checks `checkAdminAccess()` itself —
 * a server action is a public HTTP endpoint, the same gate every other
 * admin mutation in this route group (`orders/actions.ts`,
 * `products/actions.ts`) re-runs rather than trusting the client that
 * called it.
 */
export async function markNotificationsSeenAction(): Promise<void> {
  const access = await checkAdminAccess();
  if (!access.isAdmin) throw new Error('not an admin');

  const admin = createAdminClient();
  await markNotificationsSeen(admin, access.user.id);
}
