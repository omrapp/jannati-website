import crypto from 'node:crypto';

import { describe, expect, it } from 'vitest';

import { isAllowedPaymentTransition } from '@/lib/payments/idempotency';
import { mapThawaniStatus } from '@/lib/payments/thawani';
import { buildTapHashString, mapTapStatus, verifyTapSignature, type TapChargeWebhookPayload } from '@/lib/payments/tap';

describe('isAllowedPaymentTransition', () => {
  it('allows pending -> paid', () => {
    expect(isAllowedPaymentTransition('pending', 'paid')).toBe(true);
  });

  it('allows pending -> failed', () => {
    expect(isAllowedPaymentTransition('pending', 'failed')).toBe(true);
  });

  it('allows paid -> refunded', () => {
    expect(isAllowedPaymentTransition('paid', 'refunded')).toBe(true);
  });

  it('rejects replaying pending -> paid once already paid', () => {
    expect(isAllowedPaymentTransition('paid', 'paid')).toBe(false);
  });

  it('rejects a stray failed arriving after paid already landed', () => {
    expect(isAllowedPaymentTransition('paid', 'failed')).toBe(false);
  });

  it('rejects any transition out of a terminal failed state', () => {
    expect(isAllowedPaymentTransition('failed', 'paid')).toBe(false);
    expect(isAllowedPaymentTransition('failed', 'refunded')).toBe(false);
  });

  it('rejects any transition out of a terminal refunded state', () => {
    expect(isAllowedPaymentTransition('refunded', 'paid')).toBe(false);
  });
});

describe('mapThawaniStatus', () => {
  it('maps "paid" to paid', () => {
    expect(mapThawaniStatus('paid')).toBe('paid');
  });

  it('maps every unconfirmed status to pending rather than guessing failed', () => {
    expect(mapThawaniStatus('unpaid')).toBe('pending');
    expect(mapThawaniStatus('expired')).toBe('pending');
    expect(mapThawaniStatus('anything-else')).toBe('pending');
  });
});

describe('mapTapStatus', () => {
  it('maps CAPTURED to paid', () => {
    expect(mapTapStatus('CAPTURED')).toBe('paid');
  });

  it('maps known failure statuses to failed', () => {
    for (const status of ['FAILED', 'DECLINED', 'CANCELLED', 'VOID', 'TIMEDOUT', 'ABANDONED', 'RESTRICTED']) {
      expect(mapTapStatus(status)).toBe('failed');
    }
  });

  it('maps an unconfirmed status to pending rather than guessing', () => {
    expect(mapTapStatus('INITIATED')).toBe('pending');
    expect(mapTapStatus('SOME_FUTURE_STATUS')).toBe('pending');
  });
});

describe('Tap webhook signature', () => {
  const secretKey = 'test-secret-key';
  const payload: TapChargeWebhookPayload = {
    id: 'chg_TS01A1234567890',
    status: 'CAPTURED',
    amount: 10.5,
    currency: 'SAR',
    reference: { order: 'order-uuid-1', gateway: 'gw-ref', payment: 'pay-ref' },
    transaction: { created: '2026-01-01T00:00:00Z' },
  };

  function sign(p: TapChargeWebhookPayload, key: string): string {
    return crypto.createHmac('sha256', key).update(buildTapHashString(p)).digest('hex');
  }

  it('builds the hash string in the documented field order with no separators', () => {
    expect(buildTapHashString(payload)).toBe(
      'x_idchg_TS01A1234567890x_amount10.5x_currencySARx_gateway_referencegw-refx_payment_referencepay-refx_statusCAPTUREDx_created2026-01-01T00:00:00Z',
    );
  });

  it('accepts a correctly signed webhook', () => {
    expect(verifyTapSignature(payload, secretKey, sign(payload, secretKey))).toBe(true);
  });

  it('rejects a webhook signed with the wrong secret', () => {
    expect(verifyTapSignature(payload, secretKey, sign(payload, 'wrong-secret'))).toBe(false);
  });

  it('rejects a webhook whose payload was tampered with after signing', () => {
    const signature = sign(payload, secretKey);
    const tampered = { ...payload, amount: 999 };
    expect(verifyTapSignature(tampered, secretKey, signature)).toBe(false);
  });

  it('rejects a missing signature header', () => {
    expect(verifyTapSignature(payload, secretKey, null)).toBe(false);
  });

  it('replaying the exact same payload and signature still verifies (idempotent by design)', () => {
    const signature = sign(payload, secretKey);
    expect(verifyTapSignature(payload, secretKey, signature)).toBe(true);
    expect(verifyTapSignature(payload, secretKey, signature)).toBe(true);
  });
});
