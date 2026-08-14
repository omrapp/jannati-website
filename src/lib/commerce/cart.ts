/**
 * Server-side cart operations. There is no client-side cart state — every
 * page that shows a cart re-reads it from here, keyed by the customer's
 * `auth.uid()` (RLS-scoped) or a guest's signed session cookie (2.5 merges
 * the guest cart into the customer's on login).
 *
 * A guest cart (`session_token` identity) has no RLS policy at all —
 * `supabase/migrations/20260813000002_commerce.sql` is explicit that these
 * rows are only ever touched by server actions using the service-role
 * client. Every function below takes whatever `Client` a caller passes, so
 * calling one with the anon/RLS-bound client for a guest identity doesn't
 * fail loudly: a read silently returns nothing (`customer_id = auth.uid()`
 * never matches a guest row) and a write hard-fails on the missing policy.
 * Callers building on this in 2.4+ must pass the service-role client
 * (`src/lib/supabase/admin.ts`) for guest identities.
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

/** Postgres unique-violation code — see the race note in `getOrCreateActiveCart`. */
const UNIQUE_VIOLATION = '23505';

/**
 * The shopper's active cart, creating one if they don't have one yet. Called
 * only from a write path (adding the first item) — a page that merely
 * *renders* a cart should use `getActiveCart` and show an empty state
 * instead of creating a row nobody has put anything in.
 *
 * Two concurrent first-adds (a double click, two open tabs) can both pass
 * the `getActiveCart` check above before either has inserted, and race each
 * other into `carts_one_active_per_customer_idx` (customers) or the
 * `session_token` unique constraint (guests) — see
 * `supabase/migrations/20260813000002_commerce.sql`. The loser's insert
 * fails with a unique violation rather than a made-up second cart; re-reading
 * `getActiveCart` at that point returns the winner's row instead of
 * surfacing the race as an error to the shopper.
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

  if (error) {
    if (error.code === UNIQUE_VIOLATION) {
      const winner = await getActiveCart(client, identity);
      if (winner) return winner;
    }
    throw new Error(`creating cart: ${error.message}`);
  }

  return data;
}

/** Stock for one variant — the only column a cart write needs to decide anything. */
async function getVariantStock(
  client: Client,
  variantId: string,
): Promise<{ stockQty: number } | null> {
  const { data, error } = await client
    .from('product_variants')
    .select('stock_qty')
    .eq('id', variantId)
    .maybeSingle();

  if (error) throw new Error(`reading variant ${variantId}: ${error.message}`);
  if (!data) return null;

  return { stockQty: data.stock_qty };
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

export type CartLineQty = { variantId: string; qty: number };

/**
 * Pure merge decision for 2.5: folds a guest cart's lines into a customer's
 * existing lines. Each overlapping variant reuses `resolveAddQty` — the same
 * sum-and-clamp rule that governs "add to cart" governs a merge, so there is
 * one definition of "how much of this fits" instead of two that could drift.
 * A guest line whose variant no longer exists or has no stock is dropped
 * rather than failing the whole merge — the shopper still gets everything
 * else.
 *
 * This function is *not* itself safe to re-apply — feeding its own output
 * back in as `customerLines` alongside the same `guestLines` sums a second
 * time. Idempotency is owned entirely by the caller (`mergeGuestCartIntoCustomer`
 * deletes the guest cart row once merged), not by this function.
 */
export function resolveCartMerge(
  customerLines: readonly CartLineQty[],
  guestLines: readonly CartLineQty[],
  stockByVariant: ReadonlyMap<string, number>,
): CartLineQty[] {
  const qtyByVariant = new Map(customerLines.map((line) => [line.variantId, line.qty]));

  for (const guestLine of guestLines) {
    const stockQty = stockByVariant.get(guestLine.variantId);
    if (stockQty === undefined) continue; // variant deleted since the guest added it

    const existingQty = qtyByVariant.get(guestLine.variantId) ?? 0;
    let resolution: QtyResolution;
    try {
      resolution = resolveAddQty(existingQty, guestLine.qty, stockQty);
    } catch (err) {
      if (err instanceof CartOperationError) continue; // out of stock — drop this line
      throw err;
    }
    qtyByVariant.set(guestLine.variantId, resolution.qty);
  }

  return [...qtyByVariant.entries()].map(([variantId, qty]) => ({ variantId, qty }));
}

/**
 * Merges a guest's cart into the just-authenticated customer's cart — called
 * once, right after `signInWithPassword` succeeds. Reads both carts' lines
 * and current stock, resolves the merge purely via `resolveCartMerge`,
 * writes the result, then deletes the now-fully-consumed guest cart row
 * (cascading its `cart_items`). Deleting rather than emptying the row is
 * what makes a second call over the same guest token a safe no-op: an absent
 * guest token — `session_token` is unique, and `getActiveCart` reads by it —
 * simply has nothing left to merge, without needing a separate "already
 * merged" flag.
 *
 * The guest cart has no RLS policy at all (see the file header) — callers
 * must pass the service-role client. Callers must also clear the guest
 * session cookie afterwards (`src/lib/commerce/session.ts`); this function
 * only touches the database.
 */
export async function mergeGuestCartIntoCustomer(
  client: Client,
  customerId: string,
  guestSessionToken: string,
): Promise<void> {
  const guestCart = await getActiveCart(client, { sessionToken: guestSessionToken });
  if (!guestCart) return;

  const { data: guestItems, error: guestItemsError } = await client
    .from('cart_items')
    .select('variant_id, qty')
    .eq('cart_id', guestCart.id);
  if (guestItemsError) throw new Error(`reading guest cart items: ${guestItemsError.message}`);

  const guestLines: CartLineQty[] = (guestItems ?? []).map((row) => ({
    variantId: row.variant_id,
    qty: row.qty,
  }));

  if (guestLines.length > 0) {
    const customerCart = await getOrCreateActiveCart(
      client,
      { customerId },
      guestCart.country_code as CountryCode,
      guestCart.currency,
    );

    const { data: customerItems, error: customerItemsError } = await client
      .from('cart_items')
      .select('variant_id, qty')
      .eq('cart_id', customerCart.id);
    if (customerItemsError) {
      throw new Error(`reading customer cart items: ${customerItemsError.message}`);
    }

    const customerLines: CartLineQty[] = (customerItems ?? []).map((row) => ({
      variantId: row.variant_id,
      qty: row.qty,
    }));

    const variantIds = [...new Set(guestLines.map((line) => line.variantId))];
    const { data: variantRows, error: variantError } = await client
      .from('product_variants')
      .select('id, stock_qty')
      .in('id', variantIds);
    if (variantError) throw new Error(`reading variant stock: ${variantError.message}`);

    const stockByVariant = new Map((variantRows ?? []).map((row) => [row.id, row.stock_qty]));
    const merged = resolveCartMerge(customerLines, guestLines, stockByVariant);

    // Stock is snapshotted above, then written below — a variant deleted in
    // that narrow window fails the whole upsert on the `cart_items` FK
    // (unlike `resolveCartMerge`'s own missing-variant handling, which only
    // drops that one line). Accepted as a rare-enough race for now; revisit
    // if it ever shows up in practice.
    if (merged.length > 0) {
      const { error: upsertError } = await client.from('cart_items').upsert(
        merged.map((line) => ({
          cart_id: customerCart.id,
          variant_id: line.variantId,
          qty: line.qty,
        })),
      );
      if (upsertError) throw new Error(`writing merged cart items: ${upsertError.message}`);
    }
  }

  const { error: deleteError } = await client.from('carts').delete().eq('id', guestCart.id);
  if (deleteError) throw new Error(`deleting merged guest cart: ${deleteError.message}`);
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
      // `!inner` means a line whose variant (or its product) got deleted or
      // set inactive since it was added just drops out of `rows` below —
      // it reads as "never added," not "no longer available." Fine for now;
      // worth revisiting in 2.6/2.9 if that distinction needs to reach the
      // shopper.
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
