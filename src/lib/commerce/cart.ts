/**
 * Server-side cart operations. There is no client-side cart state — every
 * page that shows a cart re-reads it from here, keyed by the customer's
 * `auth.uid()` (RLS-scoped) or a guest's signed session cookie (2.5 merges
 * the guest cart into the customer's on login).
 *
 * The DB-facing functions here are thin and intentionally not unit tested —
 * same posture as `src/lib/catalog/queries.ts` — because there is nothing to
 * unit test in "call PostgREST, return what it returns" beyond a live
 * database. What *is* unit tested, exhaustively, is the merge/clamp/rejection
 * decision underneath every write: `resolveAddQty` and `resolveSetQty` below
 * are pure, take plain numbers in and a plain result out, and never touch
 * Supabase — so the logic a reviewer actually cares about (does a full-stock
 * add clamp correctly? does zero stock reject rather than write a bad row?)
 * is covered without needing a hand-rolled fake query builder.
 */

import type { SupabaseClient } from '@supabase/supabase-js';

import type { CountryCode, Locale } from '@/i18n/config';
import {
  leadVariantColumns,
  leadVariantRowToProductJoin,
  type LeadVariantRow,
} from '@/lib/catalog/queries';
import { toProductSummary } from '@/lib/catalog/mappers';
import { convertFromOmr } from '@/lib/commerce/money';
import type { Database, Tables } from '@/lib/supabase/types';

import {
  calculateCartTotals,
  type CartCountry,
  type CartLine,
  type CartTotals,
} from './cart-totals';

type Client = SupabaseClient<Database>;

type CartRow = Tables<'carts'>;
type CountryRow = Tables<'countries'>;

export type CartIdentity = { customerId: string } | { sessionToken: string };

/** Thrown by a write when the requested line item cannot be added or updated at all. */
export class CartOperationError extends Error {
  constructor(public readonly reason: 'not_found' | 'out_of_stock') {
    super(`Cart operation rejected: ${reason}`);
    this.name = 'CartOperationError';
  }
}

export type QtyResolution = { status: 'ok'; qty: number } | { status: 'clamped'; qty: number };

/**
 * Resolves the quantity to write when adding to a line that may already have
 * units in it. Out of stock is a hard rejection (`stockQty <= 0`) — an empty
 * line is not a meaningful cart state, so this never silently writes a zero.
 * Anything else clamps to the available stock rather than rejecting: a
 * shopper with 8 of a 10-stock item asking for 5 more lands at 10, not a
 * confusing error over the 3 units the shop can't fulfil anyway.
 */
export function resolveAddQty(
  existingQty: number,
  requestedQty: number,
  stockQty: number,
): QtyResolution {
  if (!Number.isInteger(requestedQty) || requestedQty <= 0) {
    throw new RangeError(`Expected a positive integer quantity, received ${requestedQty}`);
  }
  if (!Number.isInteger(existingQty) || existingQty < 0) {
    throw new RangeError(
      `Expected a non-negative integer existing quantity, received ${existingQty}`,
    );
  }
  if (stockQty <= 0) throw new CartOperationError('out_of_stock');

  const wanted = existingQty + requestedQty;
  const qty = Math.min(wanted, stockQty);

  return qty === wanted ? { status: 'ok', qty } : { status: 'clamped', qty };
}

/**
 * Resolves the quantity to write for a "set the exact quantity" edit — the
 * cart page's quantity stepper, not "add to cart". `0` is a valid request
 * here (it means "remove this line"); callers delete the row rather than
 * upsert `qty: 0`, since `cart_items.qty` has a database `> 0` constraint.
 */
export function resolveSetQty(requestedQty: number, stockQty: number): QtyResolution {
  if (!Number.isInteger(requestedQty) || requestedQty < 0) {
    throw new RangeError(`Expected a non-negative integer quantity, received ${requestedQty}`);
  }
  if (requestedQty === 0) return { status: 'ok', qty: 0 };
  if (stockQty <= 0) throw new CartOperationError('out_of_stock');

  const qty = Math.min(requestedQty, stockQty);

  return qty === requestedQty ? { status: 'ok', qty } : { status: 'clamped', qty };
}

function identityFilter(identity: CartIdentity): {
  column: 'customer_id' | 'session_token';
  value: string;
} {
  return 'customerId' in identity
    ? { column: 'customer_id', value: identity.customerId }
    : { column: 'session_token', value: identity.sessionToken };
}

/** The shopper's current active (unconverted) cart, or `null` if they don't have one yet. */
export async function getActiveCart(
  client: Client,
  identity: CartIdentity,
): Promise<CartRow | null> {
  const { column, value } = identityFilter(identity);

  const { data, error } = await client
    .from('carts')
    .select('*')
    .eq(column, value)
    .is('converted_at', null)
    .maybeSingle();

  if (error) throw new Error(`reading cart: ${error.message}`);

  return data;
}

/**
 * The shopper's active cart, creating one if they don't have one yet. Called
 * only from a write path (adding the first item) — a page that merely
 * *renders* a cart should use `getActiveCart` and show an empty state
 * instead of creating a row nobody has put anything in.
 */
export async function getOrCreateActiveCart(
  client: Client,
  identity: CartIdentity,
  countryCode: CountryCode,
  currency: string,
): Promise<CartRow> {
  const existing = await getActiveCart(client, identity);
  if (existing) return existing;

  const { data, error } = await client
    .from('carts')
    .insert({
      customer_id: 'customerId' in identity ? identity.customerId : null,
      session_token: 'sessionToken' in identity ? identity.sessionToken : null,
      country_code: countryCode,
      currency,
    })
    .select('*')
    .single();

  if (error) throw new Error(`creating cart: ${error.message}`);

  return data;
}

/** Stock and price for one variant — the only columns a cart write needs to decide anything. */
async function getVariantStock(
  client: Client,
  variantId: string,
): Promise<{ stockQty: number; basePriceMinor: number } | null> {
  const { data, error } = await client
    .from('product_variants')
    .select('stock_qty, base_price_minor')
    .eq('id', variantId)
    .maybeSingle();

  if (error) throw new Error(`reading variant ${variantId}: ${error.message}`);
  if (!data) return null;

  return { stockQty: data.stock_qty, basePriceMinor: data.base_price_minor };
}

async function getExistingQty(client: Client, cartId: string, variantId: string): Promise<number> {
  const { data, error } = await client
    .from('cart_items')
    .select('qty')
    .eq('cart_id', cartId)
    .eq('variant_id', variantId)
    .maybeSingle();

  if (error) throw new Error(`reading cart item: ${error.message}`);

  return data?.qty ?? 0;
}

/**
 * Adds to a cart line, or throws `CartOperationError` if the variant doesn't
 * exist (deleted, or never did) or has none in stock. A quantity above what
 * `getVariantStock` allows is clamped, not rejected — see `resolveAddQty`.
 */
export async function addCartItem(
  client: Client,
  cartId: string,
  variantId: string,
  requestedQty: number,
): Promise<QtyResolution> {
  const variant = await getVariantStock(client, variantId);
  if (!variant) throw new CartOperationError('not_found');

  const existingQty = await getExistingQty(client, cartId, variantId);
  const resolution = resolveAddQty(existingQty, requestedQty, variant.stockQty);

  const { error } = await client
    .from('cart_items')
    .upsert({ cart_id: cartId, variant_id: variantId, qty: resolution.qty });

  if (error) throw new Error(`writing cart item: ${error.message}`);

  return resolution;
}

/** Sets a cart line to an exact quantity, deleting it if that quantity is zero. */
export async function setCartItemQty(
  client: Client,
  cartId: string,
  variantId: string,
  requestedQty: number,
): Promise<QtyResolution> {
  const variant = await getVariantStock(client, variantId);
  if (!variant) throw new CartOperationError('not_found');

  const resolution = resolveSetQty(requestedQty, variant.stockQty);

  if (resolution.qty === 0) {
    await removeCartItem(client, cartId, variantId);
    return resolution;
  }

  const { error } = await client
    .from('cart_items')
    .upsert({ cart_id: cartId, variant_id: variantId, qty: resolution.qty });

  if (error) throw new Error(`writing cart item: ${error.message}`);

  return resolution;
}

export async function removeCartItem(
  client: Client,
  cartId: string,
  variantId: string,
): Promise<void> {
  const { error } = await client
    .from('cart_items')
    .delete()
    .eq('cart_id', cartId)
    .eq('variant_id', variantId);

  if (error) throw new Error(`removing cart item: ${error.message}`);
}

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

export type CartLineDetail = ReturnType<typeof toProductSummary> & {
  variantId: string;
  qty: number;
};

export type CartWithTotals = CartTotals & { cartId: string; lines: CartLineDetail[] };

type CartItemRow = { qty: number; product_variants: LeadVariantRow };

/**
 * The full cart for display: every line (product summary + qty) plus its
 * totals, computed the same way checkout will recompute them server-side
 * (2.9) — a shopper never sees a total this function didn't just calculate
 * from current prices and stock, so nothing here is a stale snapshot.
 *
 * Reuses `leadVariantColumns`/`leadVariantRowToProductJoin` from the catalog
 * data-access layer: a cart line and a price-sorted PLP card need the exact
 * same variant-rooted shape (one variant, its parent product, brand, images),
 * so the reshape has one implementation, not two that could drift apart.
 */
export async function getCartWithTotals(
  client: Client,
  identity: CartIdentity,
  locale: Locale,
): Promise<CartWithTotals | null> {
  const cart = await getActiveCart(client, identity);
  if (!cart) return null;

  const [{ data: items, error: itemsError }, { data: countryRow, error: countryError }] =
    await Promise.all([
      client
        .from('cart_items')
        .select(`qty, product_variants!inner ( ${leadVariantColumns({})} )`)
        .eq('cart_id', cart.id),
      client.from('countries').select('*').eq('code', cart.country_code).single(),
    ]);

  if (itemsError) throw new Error(`reading cart items: ${itemsError.message}`);
  if (countryError || !countryRow) {
    throw new Error(`reading cart country: ${countryError?.message ?? 'not found'}`);
  }

  const country = countryRow;
  const pricing = toCartCountry(country);
  const rows = (items ?? []) as unknown as CartItemRow[];

  const lines: CartLineDetail[] = rows.map((row) => ({
    ...toProductSummary(leadVariantRowToProductJoin(row.product_variants), country, locale),
    variantId: row.product_variants.id,
    qty: row.qty,
  }));

  // calculateCartTotals expects a line's price already converted to the
  // checkout currency — `base_price_minor` on the variant row is OMR.
  const cartLines: CartLine[] = rows.map((row) => ({
    unitPriceMinor: convertFromOmr(row.product_variants.base_price_minor, pricing),
    qty: row.qty,
  }));

  const totals = calculateCartTotals(cartLines, pricing);

  return { ...totals, cartId: cart.id, lines };
}
