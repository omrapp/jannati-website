/**
 * Twilio adapter — SMS, behind `NotificationChannel`. Same posture as
 * `resend.ts`/`payments/thawani.ts`: **not live**, `TWILIO_*` are unset
 * (see `tasks/todo.md`), so `send` throws a clear config error before doing
 * anything network-facing until it's supplied.
 *
 * API shape verified against Twilio's public docs (Messaging Service send):
 * https://www.twilio.com/docs/messaging/api/message-resource — not against
 * a live account.
 */

import { env } from '@/lib/env';

import { buildSmsBody } from './templates';
import type { NotificationChannel, NotificationInput } from './types';

function requireCredentials(): { accountSid: string; authToken: string; messagingServiceSid: string } {
  if (!env.twilioAccountSid || !env.twilioAuthToken || !env.twilioMessagingServiceSid) {
    throw new Error('TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN and TWILIO_MESSAGING_SERVICE_SID are required to send SMS');
  }
  return {
    accountSid: env.twilioAccountSid,
    authToken: env.twilioAuthToken,
    messagingServiceSid: env.twilioMessagingServiceSid,
  };
}

export const twilioChannel: NotificationChannel = {
  id: 'sms',

  async send(input: NotificationInput): Promise<void> {
    if (!input.customerPhone) return;

    const { accountSid, authToken, messagingServiceSid } = requireCredentials();
    const body = buildSmsBody(input);

    const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString('base64')}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        MessagingServiceSid: messagingServiceSid,
        To: input.customerPhone,
        Body: body,
      }),
    });

    if (!response.ok) {
      throw new Error(`Twilio send failed: ${response.status} ${await response.text()}`);
    }
  },
};
