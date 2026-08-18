/**
 * Pure payload shaping for order notifications — text content only, no
 * network call (that's `resend.ts`/`twilio.ts`). Deliberately not routed
 * through `next-intl`/`src/messages/*.json`: those back `useTranslations`/
 * `getTranslations`, which resolve their locale from the *current request*.
 * A notification fires from a checkout Server Action (order placed) or an
 * admin status-change action (shipped/delivered) — in both cases the
 * language that matters is the order's own `locale` column, not whichever
 * locale the triggering request happens to be running in (the admin panel
 * has none at all). A small dictionary keyed directly on the order's
 * language is more direct than routing an unrelated locale through
 * `next-intl`'s request-scoped machinery.
 */

import { parseLocale, type Language } from '@/i18n/config';
import { formatMoney } from '@/lib/commerce/money';
import type { CountryPricing } from '@/lib/commerce/types';

import type { NotificationInput } from './types';

type Copy = {
  orderCreatedSubject: (orderNumber: string) => string;
  orderCreatedBody: (name: string, orderNumber: string, total: string) => string;
  orderCreatedSms: (orderNumber: string, total: string) => string;
  orderShippedSubject: (orderNumber: string) => string;
  orderShippedBody: (name: string, orderNumber: string, trackingUrl: string | null) => string;
  orderShippedSms: (orderNumber: string, trackingUrl: string | null) => string;
  orderDeliveredSubject: (orderNumber: string) => string;
  orderDeliveredBody: (name: string, orderNumber: string) => string;
  orderDeliveredSms: (orderNumber: string) => string;
};

const en: Copy = {
  orderCreatedSubject: (orderNumber) => `Your Jannati order ${orderNumber} is confirmed`,
  orderCreatedBody: (name, orderNumber, total) =>
    `Hi ${name}, thanks for your order ${orderNumber} — total ${total}. We'll let you know as soon as it ships.`,
  orderCreatedSms: (orderNumber, total) => `Jannati: order ${orderNumber} confirmed, total ${total}. Thank you!`,
  orderShippedSubject: (orderNumber) => `Your Jannati order ${orderNumber} has shipped`,
  orderShippedBody: (name, orderNumber, trackingUrl) =>
    trackingUrl
      ? `Hi ${name}, your order ${orderNumber} is on its way. Track it: ${trackingUrl}`
      : `Hi ${name}, your order ${orderNumber} is on its way.`,
  orderShippedSms: (orderNumber, trackingUrl) =>
    trackingUrl
      ? `Jannati: order ${orderNumber} has shipped. Track: ${trackingUrl}`
      : `Jannati: order ${orderNumber} has shipped.`,
  orderDeliveredSubject: (orderNumber) => `Your Jannati order ${orderNumber} was delivered`,
  orderDeliveredBody: (name, orderNumber) =>
    `Hi ${name}, your order ${orderNumber} has been delivered. We hope you love it!`,
  orderDeliveredSms: (orderNumber) => `Jannati: order ${orderNumber} was delivered. Enjoy!`,
};

const ar: Copy = {
  orderCreatedSubject: (orderNumber) => `تم تأكيد طلبك ${orderNumber} من جنتي`,
  orderCreatedBody: (name, orderNumber, total) =>
    `مرحبًا ${name}، شكرًا لطلبك ${orderNumber} — الإجمالي ${total}. سنعلمك فور شحنه.`,
  orderCreatedSms: (orderNumber, total) => `جنتي: تم تأكيد الطلب ${orderNumber}، الإجمالي ${total}. شكرًا لك!`,
  orderShippedSubject: (orderNumber) => `تم شحن طلبك ${orderNumber} من جنتي`,
  orderShippedBody: (name, orderNumber, trackingUrl) =>
    trackingUrl
      ? `مرحبًا ${name}، طلبك ${orderNumber} في الطريق إليك. تتبّعه: ${trackingUrl}`
      : `مرحبًا ${name}، طلبك ${orderNumber} في الطريق إليك.`,
  orderShippedSms: (orderNumber, trackingUrl) =>
    trackingUrl
      ? `جنتي: تم شحن طلبك ${orderNumber}. تتبّع: ${trackingUrl}`
      : `جنتي: تم شحن طلبك ${orderNumber}.`,
  orderDeliveredSubject: (orderNumber) => `تم توصيل طلبك ${orderNumber} من جنتي`,
  orderDeliveredBody: (name, orderNumber) =>
    `مرحبًا ${name}، تم توصيل طلبك ${orderNumber}. نتمنى أن ينال إعجابك!`,
  orderDeliveredSms: (orderNumber) => `جنتي: تم توصيل طلبك ${orderNumber}. بالهناء!`,
};

function copyFor(language: Language): Copy {
  return language === 'ar' ? ar : en;
}

/**
 * `formatMoney` takes a full `CountryPricing` for the conversion step that
 * already happened before an order's `total_minor` was written — it only
 * ever *reads* `currency`/`currencyExponent` here. `fxRateFromOmr`/
 * `roundingStepMinor` are inert filler; `code` is the one real field,
 * derived from the order's own locale rather than invented.
 */
function formatTotal(input: NotificationInput): string {
  const pricing: CountryPricing = {
    code: parseLocale(input.locale).country,
    currency: input.currency,
    currencyExponent: input.currencyExponent,
    fxRateFromOmr: 1,
    roundingStepMinor: 1,
  };
  return formatMoney(input.totalMinor, pricing, input.locale);
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export type EmailContent = { subject: string; html: string };

/** Every field interpolated into the HTML — `customerName` above all, free text off a shipping address — is escaped; nothing here is trusted markup. */
export function buildEmailContent(input: NotificationInput): EmailContent {
  const { language } = parseLocale(input.locale);
  const c = copyFor(language);
  const name = escapeHtml(input.customerName);
  const orderNumber = escapeHtml(input.orderNumber);
  const trackingUrl = input.trackingUrl ? escapeHtml(input.trackingUrl) : null;

  switch (input.event) {
    case 'order_created':
      return {
        subject: c.orderCreatedSubject(input.orderNumber),
        html: `<p>${c.orderCreatedBody(name, orderNumber, escapeHtml(formatTotal(input)))}</p>`,
      };
    case 'order_shipped':
      return {
        subject: c.orderShippedSubject(input.orderNumber),
        html: `<p>${c.orderShippedBody(name, orderNumber, trackingUrl)}</p>`,
      };
    case 'order_delivered':
      return {
        subject: c.orderDeliveredSubject(input.orderNumber),
        html: `<p>${c.orderDeliveredBody(name, orderNumber)}</p>`,
      };
  }
}

export function buildSmsBody(input: NotificationInput): string {
  const { language } = parseLocale(input.locale);
  const c = copyFor(language);

  switch (input.event) {
    case 'order_created':
      return c.orderCreatedSms(input.orderNumber, formatTotal(input));
    case 'order_shipped':
      return c.orderShippedSms(input.orderNumber, input.trackingUrl);
    case 'order_delivered':
      return c.orderDeliveredSms(input.orderNumber);
  }
}
