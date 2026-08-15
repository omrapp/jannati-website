/**
 * Order creation and lookup. `supabase/migrations/20260813000002_commerce.sql`'s
 * header is explicit that no client, authenticated or not, can insert an
 * order directly — every order is created here, using the service-role
 * client, after this module has re-read prices and stock from the database
 * and recomputed every total itself. Nothing about a cart's displayed totals
 * (`getCartWithTotals`) is trusted at this point; it was already stale the
 * moment it rendered.
 *
 * The actual write — insert order, insert order_items, insert the initial
 * order_events row, decrement stock, mark the cart converted — happens in
 * one Postgres transaction (`create_order`,
 * `supabase/migrations/20260815000001_create_order_rpc.sql`), not as
 * separate PostgREST calls, for the same reason 2.5's guest-cart merge is a
 * function and not four round trips: two shoppers racing for the same
 * variant's last unit, or the same coupon's last redemption, must not both
 * win. This module computes *what* to write (pure, unit-tested below); the
 * function decides *whether* the write is still valid at the moment it
 * actually happens.
 */

import crypto from 'node:crypto';

import type { SupabaseClient } from '@supabase/supabase-js';

import { text } from '@/lib/catalog/mappers';
import type { CountryCode, Locale } from '@/i18n/config';
import { env } from '@/lib/env';
import type { Database, Tables } from '@/lib/supabase/types';

import { calculateCartTotals, type CartCountry, type CartLine, type CartTotals } from './cart-totals';
import { validateCoupon, type CouponIdentity } from './coupons';
import { convertFromOmr } from './money';

type Client = SupabaseClient<Database>;
type CountryRow = Tables<'countries'>;
type OrderRow = Tables<'orders'>;

/** Thrown when the cart, as re-read at order time, cannot become an order. */
export class OrderCreationError extends Error {
  constructor(
    public readonly reason: 'empty_cart' | 'out_of_stock' | 'coupon_rejected' | 'country_mismatch',
    public readonly detail?: string,
  ) {
    super(`Order creation rejected: ${reason}${detail ? ` (${detail})` : ''}`);
    this.name = 'OrderCreationError';
  }
}

// Order numbers ---------------------------------------------------------------

const ORDER_NUMBER_PREFIX = 'JNT';

/**
 * Pure formatting, split out from `generateOrderNumber` so the date-and-
 * padding logic is testable without touching `crypto` — same split as
 * `session.ts`'s `sign`/`createSessionToken`.
 */
export function formatOrderNumber(date: Date, suffix: string): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, '0');
  const d = String(date.getUTCDate()).padStart(2, '0');

  return `${ORDER_NUMBER_PREFIX}-${y}${m}${d}-${suffix}`;
}

/**
 * Not unit tested, same posture as `createSessionToken` — nothing to test in
 * "call `crypto.randomBytes`" beyond a live run. 8 hex characters is 16^8
 * (~4.3 billion) combinations per day; a collision hitting `orders.order_number`'s
 * unique constraint is left to surface as a rare, retriable write failure
 * rather than built out into a check-and-retry loop up front.
 */
export function generateOrderNumber(now: Date = new Date()): string {
  return formatOrderNumber(now, crypto.randomBytes(4).toString('hex').toUpperCase());
}

// Guest confirmation tokens -----------------------------------------------------

/**
 * A guest has no session to gate `/checkout/confirmation/[orderNumber]`
 * with, and putting their email in that URL to prove ownership would leak it
 * into browser history and referrer headers for no reason. An HMAC of the
 * order number, signed with the same secret `session.ts` already uses for
 * the guest cart cookie, is a capability token instead: whoever has the link
 * (the checkout redirect handed it to them) can view the order, nobody else
 * can guess it, and nothing about it needs to be stored.
 */
function orderTokenSecret(): string {
  if (!env.cartSessionSecret) {
    throw new Error('CART_SESSION_SECRET is required to sign a guest order confirmation link');
  }

  return env.cartSessionSecret;
}

export function signOrderToken(orderNumber: string): string {
  return crypto.createHmac('sha256', orderTokenSecret()).update(orderNumber).digest('base64url');
}

/** Constant-time verify, same reasoning as `session.ts`'s `verifySessionCookie`. */
export function verifyOrderToken(orderNumber: string, token: string | undefined | null): boolean {
  if (!token) return false;

  const expected = Buffer.from(signOrderToken(orderNumber));
  const given = Buffer.from(token);

  return expected.length === given.length && crypto.timingSafeEqual(expected, given);
}

// Pure order-item logic ---------------------------------------------------------

export type OrderableLine = {
  variantId: string;
  sku: string | null;
  nameSnapshot: string;
  /** Already converted to the checkout currency's minor units. */
  unitPriceMinor: number;
  qty: number;
  stockQty: number;
};

/**
 * Every line's requested quantity against its stock as read in the same
 * moment prices were read — a defense-in-depth check ahead of the RPC's own
 * authoritative, row-locked one. Catching the common case here means a
 * shopper whose cart went stale between browsing and checking out gets a
 * clean rejection without depending on parsing the RPC's raw error text.
 */
export function assertSufficientStock(lines: readonly OrderableLine[]): void {
  for (const line of lines) {
    if (line.stockQty < line.qty) throw new OrderCreationError('out_of_stock', line.variantId);
  }
}

export type OrderItemSnapshot = {
  variantId: string;
  sku: string | null;
  nameSnapshot: string;
  unitPriceMinor: number;
  qty: number;
  lineTotalMinor: number;
};

/**
 * Snapshots each line's name/sku/price/qty into what `order_items` actually
 * needs — pure, so the "line total = unit price x qty" arithmetic is tested
 * without a database. Mirrors `sumLines`' overflow guard in `cart-totals.ts`.
 */
export function toOrderItemSnapshots(lines: readonly OrderableLine[]): OrderItemSnapshot[] {
  return lines.map((line) => {
    if (!Number.isSafeInteger(line.unitPriceMinor) || line.unitPriceMinor < 0) {
      throw new RangeError(`Expected a non-negative integer unit price, received ${line.unitPriceMinor}`);
    }
    if (!Number.isInteger(line.qty) || line.qty <= 0) {
      throw new RangeError(`Expected a positive integer quantity, received ${line.qty}`);
    }

    const lineTotalMinor = line.unitPriceMinor * line.qty;
    if (!Number.isSafeInteger(lineTotalMinor)) {
      throw new RangeError(`Order line total exceeds a safe integer: ${lineTotalMinor}`);
    }

    return {
      variantId: line.variantId,
      sku: line.sku,
      nameSnapshot: line.nameSnapshot,
      unitPriceMinor: line.unitPriceMinor,
      qty: line.qty,
      lineTotalMinor,
    };
  });
}

// Order creation ------------------------------------------------------------------

export type ShippingAddressInput = {
  fullName: string;
  phone: string;
  countryCode: CountryCode;
  city: string;
  area: string | null;
  line1: string;
};

export type CreateOrderInput = {
  cartId: string;
  identity: { customerId: string } | { guestEmail: string; guestPhone: string };
  shippingAddress: ShippingAddressInput;
  couponCode: string | null;
  /** Widen this union as real providers (2.11/2.12) land behind the same interface. */
  paymentProvider: 'cod';
  locale: Locale;
};

export type CreateOrderResult = { orderId: string; orderNumber: string; totals: CartTotals };

function toCartCountry(row: CountryRow): CartCountry {
  return {
    code: row.code as CartCountry['code'],
    currency: row.currency,
    currencyExponent: row.currency_exponent,
    fxRateFromOmr: row.fx_rate_from_omr,
    roundingStepMinor: row.rounding_step_minor,
    vatRate: row.vat_rate,
    shippingFlatMinor: row.shipping_flat_minor,
    freeShippingThresholdMinor: row.free_shipping_threshold_minor,
  };
}

type CartItemJoinRow = {
  qty: number;
  product_variants: {
    id: string;
    sku: string | null;
    title_ar: string | null;
    title_en: string | null;
    base_price_minor: number;
    stock_qty: number;
    products: { name_ar: string | null; name_en: string | null };
  };
};

/** Sums OMR-scale line subtotals for the coupon min-order check — same overflow guard as `sumLines`. */
function sumSubtotalOmr(rows: CartItemJoinRow[]): number {
  const subtotal = rows.reduce(
    (sum, row) => sum + row.product_variants.base_price_minor * row.qty,
    0,
  );

  if (!Number.isSafeInteger(subtotal)) {
    throw new RangeError(`Cart subtotal exceeds a safe integer: ${subtotal}`);
  }

  return subtotal;
}

/**
 * Re-reads the cart's lines fresh from the database — never from a cart total
 * computed earlier in the request — converts each to the checkout currency,
 * validates any coupon, recomputes totals, checks stock, and writes the
 * order atomically via `create_order`.
 *
 * Throws `OrderCreationError` for every rejection a shopper should see a
 * translated message for (empty cart, out of stock, coupon rejected, address
 * country not matching the cart's); anything else is an unexpected failure.
 */
export async function createOrder(client: Client, input: CreateOrderInput): Promise<CreateOrderResult> {
  const { cartId, identity, shippingAddress, couponCode, paymentProvider, locale } = input;

  const [{ data: cart, error: cartError }, { data: items, error: itemsError }] = await Promise.all([
    client.from('carts').select('country_code, currency').eq('id', cartId).single(),
    client
      .from('cart_items')
      .select(
        'qty, product_variants ( id, sku, title_ar, title_en, base_price_minor, stock_qty, products ( name_ar, name_en ) )',
      )
      .eq('cart_id', cartId),
  ]);

  if (cartError || !cart) throw new Error(`reading cart ${cartId}: ${cartError?.message ?? 'not found'}`);
  if (itemsError) throw new Error(`reading cart items: ${itemsError.message}`);

  const rows = (items ?? []) as unknown as CartItemJoinRow[];
  if (rows.length === 0) throw new OrderCreationError('empty_cart');

  if (shippingAddress.countryCode !== cart.country_code) {
    throw new OrderCreationError('country_mismatch');
  }

  const { data: countryRow, error: countryError } = await client
    .from('countries')
    .select('*')
    .eq('code', cart.country_code)
    .single();

  if (countryError || !countryRow) {
    throw new Error(`reading country ${cart.country_code}: ${countryError?.message ?? 'not found'}`);
  }

  const pricing = toCartCountry(countryRow);

  const lines: OrderableLine[] = rows.map((row) => {
    const variant = row.product_variants;
    const productName = text(variant.products.name_ar, variant.products.name_en, locale);
    const variantTitle = text(variant.title_ar, variant.title_en, locale);

    return {
      variantId: variant.id,
      sku: variant.sku,
      nameSnapshot: variantTitle ? `${productName} — ${variantTitle}` : (productName ?? variant.id),
      unitPriceMinor: convertFromOmr(variant.base_price_minor, pricing),
      qty: row.qty,
      stockQty: variant.stock_qty,
    };
  });

  assertSufficientStock(lines);

  const couponIdentity: CouponIdentity =
    'customerId' in identity ? { customerId: identity.customerId } : { guestEmail: identity.guestEmail };

  const coupon =
    couponCode != null
      ? await validateCoupon(client, couponCode, couponIdentity, sumSubtotalOmr(rows))
      : null;

  if (coupon?.status === 'rejected') throw new OrderCreationError('coupon_rejected', coupon.reason);

  const cartLines: CartLine[] = lines.map((line) => ({
    unitPriceMinor: line.unitPriceMinor,
    qty: line.qty,
  }));
  const totals = calculateCartTotals(cartLines, pricing, coupon?.status === 'valid' ? coupon.coupon : undefined);

  const orderItems = toOrderItemSnapshots(lines);
  const orderNumber = generateOrderNumber();

  // Supabase's generated `Args` type marks every parameter required and
  // non-nullable because none of them has a SQL `default` — PostgREST itself
  // accepts `null` for any of them without complaint, so this is a typegen
  // gap, not a real constraint. Same category of gap as the hand-extended
  // types noted in earlier tasks; documented here rather than worked around
  // with SQL defaults that would make every guest field silently optional.
  const args = {
    p_order_number: orderNumber,
    p_customer_id: 'customerId' in identity ? identity.customerId : null,
    p_guest_email: 'guestEmail' in identity ? identity.guestEmail : null,
    p_guest_phone: 'guestPhone' in identity ? identity.guestPhone : null,
    p_country_code: cart.country_code,
    p_currency: cart.currency,
    p_fx_rate_used: Number(pricing.fxRateFromOmr),
    p_shipping_address: shippingAddress,
    p_subtotal_minor: totals.subtotalMinor,
    p_discount_minor: totals.discountMinor,
    p_shipping_minor: totals.shippingMinor,
    p_vat_minor: totals.vatMinor,
    p_total_minor: totals.totalMinor,
    p_coupon_code: coupon?.status === 'valid' ? couponCode : null,
    p_payment_provider: paymentProvider,
    p_cart_id: cartId,
    p_items: orderItems.map((item) => ({
      variant_id: item.variantId,
      name_snapshot: item.nameSnapshot,
      sku: item.sku,
      qty: item.qty,
      unit_price_minor: item.unitPriceMinor,
      line_total_minor: item.lineTotalMinor,
    })),
  } as unknown as Database['public']['Functions']['create_order']['Args'];

  const { data: orderId, error: rpcError } = await client.rpc('create_order', args);

  if (rpcError) {
    if (rpcError.message.startsWith('out_of_stock:')) {
      throw new OrderCreationError('out_of_stock', rpcError.message.split(':')[1]);
    }
    if (rpcError.message === 'coupon_limit_reached' || rpcError.message === 'coupon_per_user_limit_reached') {
      throw new OrderCreationError('coupon_rejected', rpcError.message);
    }
    throw new Error(`creating order: ${rpcError.message}`);
  }

  return { orderId: orderId as string, orderNumber, totals };
}

// Order lookup ----------------------------------------------------------------

export type OrderDetail = {
  order: OrderRow;
  items: Tables<'order_items'>[];
  events: Tables<'order_events'>[];
};

async function loadOrderDetail(client: Client, order: OrderRow): Promise<OrderDetail> {
  const [{ data: items, error: itemsError }, { data: events, error: eventsError }] = await Promise.all([
    client.from('order_items').select('*').eq('order_id', order.id),
    client.from('order_events').select('*').eq('order_id', order.id).order('created_at'),
  ]);

  if (itemsError) throw new Error(`reading order items: ${itemsError.message}`);
  if (eventsError) throw new Error(`reading order events: ${eventsError.message}`);

  return { order, items: items ?? [], events: events ?? [] };
}

/** A signed-in customer's own order, by order number — `null` if it isn't theirs or doesn't exist. */
export async function getOrderForCustomer(
  client: Client,
  customerId: string,
  orderNumber: string,
): Promise<OrderDetail | null> {
  const { data, error } = await client
    .from('orders')
    .select('*')
    .eq('order_number', orderNumber)
    .eq('customer_id', customerId)
    .maybeSingle();

  if (error) throw new Error(`reading order ${orderNumber}: ${error.message}`);
  if (!data) return null;

  return loadOrderDetail(client, data);
}

/**
 * Any order by number, with no ownership check — only for a caller that has
 * already verified the requester is entitled to it (a verified guest
 * confirmation token, or `getOrderByNumberAndGuestEmail` below).
 */
export async function getOrderByNumber(client: Client, orderNumber: string): Promise<OrderDetail | null> {
  const { data, error } = await client.from('orders').select('*').eq('order_number', orderNumber).maybeSingle();

  if (error) throw new Error(`reading order ${orderNumber}: ${error.message}`);
  if (!data) return null;

  return loadOrderDetail(client, data);
}

/**
 * Guest order tracking: order number + email, the same pair a guest checked
 * out with. Returns `null` for a wrong number *or* a mismatched email alike
 * — never distinguishing the two in the result, so this can't be used to
 * enumerate whether an order number exists.
 */
export async function getOrderByNumberAndGuestEmail(
  client: Client,
  orderNumber: string,
  guestEmail: string,
): Promise<OrderDetail | null> {
  const detail = await getOrderByNumber(client, orderNumber);
  if (!detail || detail.order.guest_email !== guestEmail.trim().toLowerCase()) return null;

  return detail;
}
