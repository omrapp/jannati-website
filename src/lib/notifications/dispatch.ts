/**
 * Fans a `NotificationInput` out to every channel (`resend.ts`/`twilio.ts`)
 * independently, via `Promise.allSettled` — one channel throwing (missing
 * credentials, provider outage) never blocks the other, and neither ever
 * blocks the caller's real work (order creation, status transition). Errors
 * are logged, not surfaced: a notification failure is not a reason to fail
 * checkout or an admin action.
 */

import { resendChannel } from './resend';
import { twilioChannel } from './twilio';
import type { NotificationChannel, NotificationInput } from './types';

const channels: NotificationChannel[] = [resendChannel, twilioChannel];

export async function dispatchOrderNotification(input: NotificationInput): Promise<void> {
  const results = await Promise.allSettled(channels.map((channel) => channel.send(input)));

  for (const [index, result] of results.entries()) {
    if (result.status === 'rejected') {
      console.error(`notification channel "${channels[index].id}" failed for order ${input.orderNumber}:`, result.reason);
    }
  }
}
