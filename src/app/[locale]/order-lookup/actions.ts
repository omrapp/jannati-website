'use server';

import { getTranslations } from 'next-intl/server';
import { z } from 'zod';

import type { Locale } from '@/i18n/config';
import { redirect } from '@/i18n/navigation';
import { getOrderByNumberAndGuestEmail, signOrderToken } from '@/lib/commerce/orders';
import { createAdminClient } from '@/lib/supabase/admin';

export type OrderLookupState = { status: 'idle' | 'error'; message?: string };

export const idleOrderLookupState: OrderLookupState = { status: 'idle' };

const schema = z.object({
  orderNumber: z.string().trim().min(1),
  email: z.email(),
});

/**
 * A guest has no session, so this is the only door into their own order —
 * gated by the same order number + email pair they checked out with, never
 * revealing which half was wrong (`getOrderByNumberAndGuestEmail`'s
 * contract). A match redirects to the confirmation page with the same
 * signed capability token 2.9's checkout redirect hands a fresh guest.
 */
export async function lookupOrder(
  locale: Locale,
  _prevState: OrderLookupState,
  formData: FormData,
): Promise<OrderLookupState> {
  const t = await getTranslations({ locale, namespace: 'orders' });

  const parsed = schema.safeParse({
    orderNumber: formData.get('orderNumber'),
    email: formData.get('email'),
  });
  if (!parsed.success) return { status: 'error', message: t('notFound') };

  const admin = createAdminClient();
  const detail = await getOrderByNumberAndGuestEmail(
    admin,
    parsed.data.orderNumber,
    parsed.data.email,
  );
  if (!detail) return { status: 'error', message: t('notFound') };

  const token = signOrderToken(detail.order.order_number);
  redirect({ href: `/checkout/confirmation/${detail.order.order_number}?token=${token}`, locale });
  return idleOrderLookupState;
}
