import { describe, expect, it } from 'vitest';

import { buildEmailContent, buildSmsBody } from '@/lib/notifications/templates';
import type { NotificationInput } from '@/lib/notifications/types';

const base: NotificationInput = {
  event: 'order_created',
  orderNumber: 'JN-1001',
  locale: 'en-om',
  customerName: 'Sara',
  customerEmail: 'sara@example.com',
  customerPhone: '+96890000000',
  totalMinor: 12500,
  currency: 'OMR',
  currencyExponent: 3,
  trackingUrl: null,
};

describe('buildEmailContent', () => {
  it('renders an order_created email in English', () => {
    const { subject, html } = buildEmailContent(base);
    expect(subject).toContain('JN-1001');
    expect(html).toContain('Sara');
    expect(html).toContain('JN-1001');
  });

  it('renders an order_created email in Arabic when locale is ar-*', () => {
    const { subject, html } = buildEmailContent({ ...base, locale: 'ar-om' });
    expect(subject).toContain('JN-1001');
    expect(subject).toContain('جنتي');
    expect(html).toContain('طلبك');
  });

  it('includes the tracking URL in an order_shipped email when set', () => {
    const { html } = buildEmailContent({
      ...base,
      event: 'order_shipped',
      trackingUrl: 'https://track.example.com/JN-1001',
    });
    expect(html).toContain('https://track.example.com/JN-1001');
  });

  it('omits any tracking mention in an order_shipped email when unset', () => {
    const { html } = buildEmailContent({ ...base, event: 'order_shipped', trackingUrl: null });
    expect(html).not.toContain('http');
  });

  it('renders an order_delivered email', () => {
    const { subject, html } = buildEmailContent({ ...base, event: 'order_delivered' });
    expect(subject).toContain('JN-1001');
    expect(html).toContain('Sara');
  });

  it('escapes HTML-significant characters in the customer name', () => {
    const { html } = buildEmailContent({ ...base, customerName: '<script>alert(1)</script>' });
    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;script&gt;');
  });
});

describe('buildSmsBody', () => {
  it('includes the order number and formatted total for order_created', () => {
    const body = buildSmsBody(base);
    expect(body).toContain('JN-1001');
    expect(body).toMatch(/12\.500|12\.5/);
  });

  it('includes the tracking URL in an order_shipped SMS when set', () => {
    const body = buildSmsBody({
      ...base,
      event: 'order_shipped',
      trackingUrl: 'https://track.example.com/JN-1001',
    });
    expect(body).toContain('https://track.example.com/JN-1001');
  });

  it('omits the tracking URL in an order_shipped SMS when unset', () => {
    const body = buildSmsBody({ ...base, event: 'order_shipped', trackingUrl: null });
    expect(body).not.toContain('http');
  });

  it('renders order_delivered in Arabic', () => {
    const body = buildSmsBody({ ...base, event: 'order_delivered', locale: 'ar-om' });
    expect(body).toContain('JN-1001');
    expect(body).toContain('جنتي');
  });
});
