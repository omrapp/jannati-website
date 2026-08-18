/**
 * Resend adapter — transactional email, behind `NotificationChannel`. Same
 * posture as `payments/thawani.ts`: **not live**, `RESEND_API_KEY` is unset
 * (see `tasks/todo.md`), so `send` throws a clear config error before doing
 * anything network-facing until it's supplied.
 *
 * API shape verified against Resend's public docs (single-email send):
 * https://resend.com/docs/api-reference/emails/send-email — not against a
 * live account.
 */

import { env } from '@/lib/env';

import { buildEmailContent } from './templates';
import type { NotificationChannel, NotificationInput } from './types';

function requireApiKey(): string {
  if (!env.resendApiKey) throw new Error('RESEND_API_KEY is required to send email');
  return env.resendApiKey;
}

export const resendChannel: NotificationChannel = {
  id: 'email',

  async send(input: NotificationInput): Promise<void> {
    if (!input.customerEmail) return;

    const apiKey = requireApiKey();
    const { subject, html } = buildEmailContent(input);

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: `Jannati <${env.resendFromEmail}>`,
        to: input.customerEmail,
        subject,
        html,
      }),
    });

    if (!response.ok) {
      throw new Error(`Resend send failed: ${response.status} ${await response.text()}`);
    }
  },
};
