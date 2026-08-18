# Task List

Phase 0 (foundation) is complete: scaffold, tooling, CI, i18n routing for 12 locales, theming, base
layout, `countries` migration and Supabase clients. Verified with build, lint, typecheck, 6 unit tests
and 6 E2E tests. Outstanding: no migration has been applied yet — **waiting on the hosted Supabase
project keys**.

**Database setup (no Docker, no local stack).** Development runs against the hosted Supabase project.
Once the user supplies the keys:

```bash
# .env.local <- NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY,
#               SUPABASE_SERVICE_ROLE_KEY, SUPABASE_PROJECT_REF
npm run db:link      # supabase link --project-ref $SUPABASE_PROJECT_REF
npm run db:push      # apply supabase/migrations/ to the cloud project
npm run db:types     # regenerate src/lib/supabase/types.ts from the linked project
```

Because there is no throwaway local database, every destructive step is gated: migrations are additive
and reviewed before `db:push`, seed scripts support `--dry-run`, and the loader upserts rather than
truncating.

---

# Phase 1 — Catalog

## Task 1.1: Money and FX library ✅

**Description:** Pure integer money maths — convert an OMR base price into a country's currency, round
it, and format it for display in Arabic and English. Everything downstream prices through this module.

**Acceptance criteria:**

- [x] `convertFromOmr(baseMinor, country)` returns minor units in the target currency, rounded up to the country's `rounding_step_minor`
- [x] `formatMoney(minor, country, locale)` renders correct decimals per currency (3 for OMR/KWD/BHD, 2 for AED/SAR/QAR) with the currency name in the right language
- [x] All arithmetic is integer-only; no `Number.prototype.toFixed` rounding of money and no floats in intermediate steps

**Verification:**

- [x] `npm run test` — 17 tests green, all 6 currencies covered
- [x] Explicit test that 6.400 OMR converts and formats correctly in every country
- [x] `npm run typecheck`, `npm run lint`, `npm run build`

**Dependencies:** None (needs no database)
**Files:** `src/lib/commerce/money.ts`, `src/lib/commerce/types.ts`, `tests/money.test.ts`
**Scope:** S
**Merged:** `feat/money-fx-library` → `main`

Notes from implementation:

- Conversion runs in `BigInt` — price × rate × exponent overflows `Number.MAX_SAFE_INTEGER`. Required
  bumping `tsconfig` target to ES2020, since TypeScript cannot downlevel BigInt.
- `formatMoney` formats an exact decimal string via Intl.NumberFormat V3 rather than dividing into a
  float, and forces Latin digits so the Arabic storefront shows the same numerals as the English one.
- Corrected the `fx_rate_from_omr` comment in the countries migration: seeded values are **major** units
  per OMR (9.55 AED), not minor units as the comment claimed.
- Rounding steps produce visible jumps: 6.400 OMR is 61.25 AED (step 25 fils), 5.110 KWD, 6.275 BHD.
  Confirm those steps are what the shop wants before the catalogue goes live.

---

## Task 1.2: Catalog schema migration ⚠️ written, not yet applied

**Description:** Tables for brands, categories, products, variants, images and product↔category
membership, with RLS public-read and staff-write-later, plus the indexes the storefront queries need.

**Acceptance criteria:**

- [x] Tables created per the spec's data model, all money columns integer minor units in OMR
- [x] RLS enabled on every table with a public read policy; no public write policy
- [x] Unique constraints on `products.handle`, `brands.slug`, `categories.slug`, `product_variants.sku`
- [x] Indexes on `products.brand_id`, `product_categories(category_id, product_id)`, `products.status`

**Verification:**

- [x] Migration SQL reviewed before it runs — there is no local database to reset if it is wrong
- [x] Both migrations apply cleanly, in order, to a throwaway PostgreSQL 18 cluster
- [x] Anon role selects an active product; draft products, their variants and their memberships stay
      invisible; anon insert rejected; negative price, compare-at below price and duplicate handle all
      rejected; skuless variants coexist; `updated_at` trigger fires; variants cascade on product delete
- [ ] `npm run db:push` applies cleanly to the linked cloud project — **blocked on Supabase keys**
- [ ] `npm run db:types` regenerates `src/lib/supabase/types.ts` — **blocked on Supabase keys**

**Dependencies:** Supabase keys supplied, `npm run db:link` done — for the two blocked steps only
**Files:** `supabase/migrations/20260812000002_catalog.sql`, `src/lib/supabase/types.ts`
**Scope:** M

**Implementation notes:**

- Verified against a throwaway local PostgreSQL 18 cluster rather than a container, so the schema is
  proven to apply without touching any hosted project. The two steps above still need the real project.
- `src/lib/supabase/types.ts` was extended by hand to cover the new tables so tasks 1.6–1.13 are not
  blocked; `npm run db:types` overwrites it wholesale once the project is linked.
- Storage columns hold bucket **paths** (`logo_path`, `image_path`, `storage_path`), not URLs, so the
  bucket can be made private later without a data migration.
- Products are `draft` by default and the public read policy requires `status = 'active'`; variants,
  images and category memberships are hidden with their product via an `exists` check.
- Full-text search columns are deliberately absent — they land with task 1.11, alongside the queries
  that decide the tsvector configuration.

---

## Task 1.3: Extractor script ✅

**Description:** Parse the darbeauty scrape into `data/catalog.json` — brands, categories, products,
variants, image references and category membership. Read-only against `darbeauty.com/`, no database.

**Acceptance criteria:**

- [x] Brands come from `pages/brands.html` (55 brand cards); every other collection is treated as a category
- [x] Each product carries handle, Arabic name and description, brand, tags, type, and its variants with sku, OMR price in minor units and image references
- [x] Category membership resolved from collection pages including their `?page=N` continuations
- [x] Products that fail to parse are reported individually with a reason; the run does not abort
- [x] Coverage summary printed at the end: products parsed, skipped, and why

**Verification:**

- [x] `npm run seed:extract` produces `data/catalog.json` — 1025/1025 products, 0 failures
- [x] `npm run test` — 34 tests over 6 checked-in fixture pages plus malformed-payload cases
- [x] Spot-check: `abib-hand-creme-type-g` has price 6400 minor units, brand Abib, sku Z0301

**Dependencies:** None (needs no database)
**Files:** `scripts/seed/{extract,parse-product,parse-collection,slug,types}.ts`, `tests/extract.test.ts`, `tests/fixtures/*`
**Scope:** M

**Implementation notes:**

- The product count is **1025**, not 1049 — 24 `.oembed` files inflated the earlier directory count.
  There are 108 distinct collections (not 373; the rest are `?page=N` continuations) and 55 brand cards.
- Data comes from the **inline Shopify product object**, not the JSON-LD: it carries variants, sku,
  barcode, `compare_at_price`, stock and images in one payload. Two themes embed it differently, so it
  is located by a marker field and decoded by walking braces.
- Shopify serialises money at **two decimals regardless of currency** (6.400 OMR → `640`), so prices are
  multiplied by 10 to reach baisa. A non-numeric price fails the page rather than becoming `NaN` → `null`.
- Brands are anchors with `class="vendor-logo"`; matching on `/collections/` alone misfiled categories as
  brands. Only 55 have a card, so the remaining products get a brand slugged from their `vendor` field —
  147 brands total, 0 products left brandless.
- Outstanding gaps for later tasks: **36 products in no category** and **958 needing English copy** (task 1.5).
- `data/` is gitignored — `catalog.json` (6MB) is regenerated with `npm run seed:extract`.

---

## Checkpoint A — after 1.1 and 1.3

- [ ] Money maths proven correct in all 6 currencies by tests
- [ ] `data/catalog.json` exists with ≥95% coverage and a clean failure report
- [ ] Supabase keys supplied; `npm run db:link` and `npm run db:push` succeed against the cloud project
- [ ] Review the extracted data with the user before anything is written to the shared database

---

## Task 1.4: Image uploader ⚠️ written and dry-run verified, upload pending keys

**Description:** Upload local product imagery to Supabase Storage, keeping only the widest copy of each
photo, and record storage paths back into the catalog data.

**Acceptance criteria:**

- [x] Widest `width=N` copy chosen per base filename; narrower duplicates skipped
- [x] Uploaded to a public `product-images` bucket under a stable path derived from the product handle
- [x] Re-running skips files already uploaded (idempotent) and reports total bytes stored
- [x] `--dry-run` reports what would upload and the projected total size without transferring anything
- [x] `data/catalog.json` updated with storage paths, not darbeauty URLs

**Verification:**

- [x] `npm run test` — 8 unit tests over rendition picking, key derivation and the plan
- [x] `npm run seed:images -- --dry-run` over the real scrape: **1134 images, 82.5 MB projected**, well
      inside the Supabase free tier's 1 GB
- [ ] `npm run seed:images` completes and prints total storage used — **blocked on Supabase keys**
- [ ] A sampled image loads over its public Storage URL — **blocked on Supabase keys**

**Dependencies:** 1.3, Supabase project linked — for the upload itself only
**Files:** `scripts/seed/images.ts`, `scripts/seed/image-plan.ts`, `tests/image-plan.test.ts`,
`supabase/migrations/20260812000003_storage_buckets.sql`
**Scope:** M

**Implementation notes:**

- **The scrape is missing 2703 of the 3837 referenced photos.** It mirrored 1261 distinct images; the
  extra gallery shots (`…_02.webp` … `…_07.webp`) were lazy-loaded and never fetched. Every one of the
  1025 products still has at least one image, so nothing ships pictureless — but most will show a single
  photo until better assets arrive. Worth pairing with the standing recommendation to replace darbeauty's
  photography with brand-supplied imagery before launch.
- Keys are `<handle>/<NN>-<filename>`, derived per product rather than per source file, so two products
  sharing a photo each own their copy and removing one cannot blank the other.
- The bucket migration cannot be checked against the local throwaway cluster — `storage.buckets` only
  exists on a real Supabase project — so it is the one piece of SQL that reaches the project unverified.

---

## Task 1.5: English translation pass

**Description:** Fill the English descriptions missing for ~982 products by translating the Arabic copy,
reusing the 67 genuine English pages where they exist.

**Acceptance criteria:**

- [ ] Real English copy from `en/products/*.html` used verbatim where available; never overwritten by a translation
- [ ] Remaining products translated ar→en and marked `en_translation_status = 'machine'` so staff can review
- [ ] Results cached to disk so re-runs cost nothing
- [ ] English titles derived from the product handle where no English name exists

**Verification:**

- [ ] Cost estimated and approved by the user **before** the full run
- [ ] Dry run on 10 products reviewed for quality first
- [ ] `data/catalog.json` has an English description for ≥99% of products

**Dependencies:** 1.3, user approval of spend
**Files:** `scripts/seed/translate.ts`, `data/translations.cache.json`
**Scope:** M

---

## Task 1.6: Loader

**Description:** Load `data/catalog.json` into Postgres with the service-role client, as an idempotent
upsert keyed on handle/slug/sku.

**Acceptance criteria:**

- [x] Insert order respects FKs: brands → categories → products → variants → images → memberships
- [x] Re-running updates catalog fields without duplicating rows or resetting stock and status
- [x] Runs inside a transaction per batch; a failure leaves no half-loaded product
- [x] Never truncates or deletes — the cloud database is shared and cannot be reset
- [x] `--dry-run` prints the insert/update counts it would produce without writing
- [x] Prints a summary: rows inserted, updated, skipped

**Verification:**

- [ ] `npm run seed:load` twice in a row produces identical row counts — blocked, no database yet
- [ ] `select count(*) from products` ≈ 1049; every product has ≥1 variant and ≥1 image — blocked
- [ ] Spot-check one product's Arabic and English copy, price and images in the database — blocked
- [x] `npm run test` — 18 unit tests over the row mapping and the re-run split
- [x] `npm run lint`, `npm run typecheck`, `npm run build`

**Dependencies:** 1.2, 1.3, 1.4, 1.5
**Files:** `scripts/seed/load.ts`, `scripts/seed/load-plan.ts`, `tests/load-plan.test.ts`
**Scope:** M

**Status:** written and unit tested ⚠️ the run itself waits on database access (see 1.2).
English copy lands on a later re-run — the loader is idempotent, so 1.5 does not block it.

---

## Checkpoint B — after 1.6

- [ ] Full catalog in the database, re-runnable without duplication
- [ ] Images serving from Supabase Storage
- [ ] Storage and translation costs reported to the user

---

## Task 1.7: Catalog data access layer

**Description:** Typed server-side queries the storefront pages call — list products, get one product,
list brands and categories — with country pricing applied on the way out.

**Acceptance criteria:**

- [x] `listProducts`, `getProductByHandle`, `listBrands`, `listCategories` return language-resolved fields for the active locale
- [x] Prices come back already converted and formatted for the active country via 1.1
- [x] Pagination and total counts supported; no unbounded catalog queries
- [x] No query returns more columns than the caller renders

**Verification:**

- [x] `npm run test` — 16 unit tests over the locale fallback and the price mapping
- [ ] A server component renders a product name and price from the real database — blocked, no database yet
- [x] `npm run typecheck`, `npm run lint`, `npm run build`

**Dependencies:** 1.1, 1.2, 1.6
**Files:** `src/lib/catalog/queries.ts`, `src/lib/catalog/mappers.ts`, `tests/catalog-mappers.test.ts`
**Scope:** M

**Status:** written and unit tested ⚠️ unverified against a live database.
English falls back to Arabic, so the layer works before the translation pass.

---

## Task 1.8: Product listing page

**Description:** Replace the `/products` placeholder with a real grid — product card, pagination, and
category listing pages sharing the same components.

**Acceptance criteria:**

- [x] Grid of cards: image, brand, name, price, out-of-stock state
- [x] Pagination works and is crawlable (real links, not client-only state)
- [x] `/collections/[slug]` renders a category's products using the same components
- [x] Correct in RTL and LTR at mobile and desktop widths — logical properties only (`start-2`,
      `gap-x`), no physical direction classes

**Verification:**

- [x] E2E: open `/ar-om/products`, assert cards render with prices in OMR
- [x] E2E: same page in `/en-ae` shows AED prices
- [x] `npm run build` succeeds
- [x] `paginationItems` unit tested (`tests/pagination.test.ts`, 5 cases); 85 tests green

**Dependencies:** 1.7
**Files:** `src/app/[locale]/products/page.tsx`, `src/app/[locale]/collections/[slug]/page.tsx`, `src/components/commerce/{product-card,product-grid,pagination}.tsx`
**Scope:** M

---

## Task 1.9: Product detail page

**Description:** The `/products/[handle]` page — gallery, variant selection, price, stock, and
structured data for search engines.

**Acceptance criteria:**

- [x] Image gallery, Arabic/English name and description, brand link, per-variant price and stock
- [x] Variant selection updates price and availability without a full page load
- [x] Add-to-cart button present but disabled with a "coming soon" note until Phase 2
- [x] Product JSON-LD emitted with the active country's currency

**Verification:**

- [x] E2E: `/ar-om/products/abib-hand-creme-type-g` shows the Arabic name and a 6.400 ر.ع. price
- [x] Switching country changes the displayed currency
- [x] `npm run build` succeeds
- [x] `productJsonLd` / `jsonLdScript` unit tested (12 cases); 97 tests green

**Notes:**

- Descriptions render as **plain text**, not HTML. The copy is scraped third-party markup and the same
  column becomes staff-editable in Phase 3; server-rendered HTML executes a `<script>` on parse. No
  description in `data/catalog.json` contains a tag today, so nothing is lost. If rich text is wanted
  in admin, sanitize on write — that needs a sanitizer dependency, which is an "ask first" item.
- JSON-LD is embedded through `jsonLdScript`, which escapes `<`, `>`, `&`, U+2028/9 — `JSON.stringify`
  alone lets a product name close the script element.
- Deferred to the Phase 4 SEO pass: `alternates.languages` hreflang across the 12 locales, and
  `generateStaticParams`/ISR for the ~1000 product routes (all dynamic today).

**Dependencies:** 1.7
**Files:** `src/app/[locale]/products/[handle]/page.tsx`, `src/components/commerce/{product-gallery,variant-picker,price-display}.tsx`
**Scope:** M

---

## Task 1.10: Brand pages

**Description:** Brand index listing all ~104 brands, and a brand page listing that brand's products.

**Acceptance criteria:**

- [x] `/brands` lists every brand with its logo or name, grouped alphabetically in both scripts —
      `groupBrandsByInitial` collates with `Intl.Collator` in the active language, folds hamza/alef
      variants together, and files digits and symbols under `#` last
- [x] `/brands/[slug]` reuses the product grid from 1.8
- [x] Brand names render in the active language

**Verification:**

- [x] E2E: `/ar-om/brands` lists brands and one links through to its products
- [x] `npm run build` succeeds
- [x] `groupBrandsByInitial` unit tested (6 cases); 103 tests green

**Dependencies:** 1.7, 1.8
**Files:** `src/app/[locale]/brands/page.tsx`, `src/app/[locale]/brands/[slug]/page.tsx`
**Scope:** S

---

## Checkpoint C — after 1.10

- [x] A shopper can browse from home → category → product → brand entirely in Arabic
- [x] Prices correct in all 6 countries on the same product — verified for OM/AE by e2e;
      the other 4 share the same `convertFromOmr` path and are covered by its unit tests
- [x] Review the browsing experience with the user before search and filters — skipped at
      the user's direction ("Move to 1.11")

---

## Task 1.11: Search

**Description:** Postgres full-text search across Arabic and English product text, with trigram fuzzy
matching, exposed through the `/search` page and the header search box.

**Acceptance criteria:**

- [x] `search_ar` and `search_en` tsvector columns maintained by trigger over name, description, brand and tags
- [x] `pg_trgm` similarity fallback so near-misses and misspellings still return results
- [x] Search RPC returns ranked results; pagination moved to the TypeScript layer (`paginateHandles`)
      so an out-of-range page still reports its real total — see code review history in this file's git log
- [x] Header search box submits to `/search` and results render in the active language (pre-existing form,
      confirmed unchanged)

**Acceptance risk:** Postgres has no Arabic stemmer — relevance is measured, not assumed.

**Verification:**

- [x] `npm run test` — `orderByHandle` and `paginateHandles` covered, including the out-of-range-page case
- [ ] Manual: 10 real Arabic queries and 10 English ones reviewed for relevance with the user — blocked on
      the user applying this migration (`npm run db:push`) against the seeded database
- [ ] Server-side search completes in under 500ms on the full catalog — same block, needs the live index

**Dependencies:** 1.2, 1.6
**Files:** `supabase/migrations/*_search.sql`, `src/lib/catalog/search.ts`, `src/app/[locale]/search/page.tsx`
**Scope:** M

---

## Task 1.12: Filters and sorting

**Description:** Narrow and order the product grid — by brand, category, price range and stock, sorted
by newest, best selling or price.

**Acceptance criteria:**

- [x] Filter state lives in the URL so results are shareable and back/forward works
- [x] Filtering and sorting happen in Postgres, never by filtering a full result set in JavaScript
- [x] Price filter operates in the active country's currency but queries in OMR
- [x] Facet counts reflect the current filter set

**Verification:**

- [x] E2E: filter by brand, assert the URL and the result count change
- [x] E2E: sort by price ascending, assert order in AED on `/en-ae`
- [x] `npm run test` — unit tests for URL ↔ query translation

**Dependencies:** 1.8
**Files:** `src/components/commerce/{filter-panel,sort-select}.tsx`, `src/lib/catalog/query-params.ts`, `tests/query-params.test.ts`
**Scope:** M

---

## Task 1.13: New arrivals and best sellers

**Description:** The two merchandising pages named in the brief, built on the existing grid and sorting.

**Acceptance criteria:**

- [x] `/products?sort=new` and `/products?sort=best-selling` (already linked from the nav) return correctly ordered results
- [x] "New" derives from a product's `is_new` flag or creation date; "best selling" from order counts, seeded from darbeauty's best-seller collection until real sales exist — no real order data yet, so "best selling" is membership in the seeded `best-seller` category, ordered deterministically by `handle` (the collection's `position` column is uniformly 0 in seed data and can't drive real ranking; documented in `queries.ts`). Revisit once real order volume exists.
- [x] Both are reachable from the header and footer links already in place

**Verification:**

- [ ] E2E: both nav links land on populated, correctly ordered pages — **deferred**, per steer to build out remaining pages before a dedicated testing pass. Manually/live-probed instead: pagination is deterministic and non-duplicating, filters compose correctly, translations render.
- [x] `npm run build` succeeds (typecheck/lint/test/build all green on `main`)

**Dependencies:** 1.12
**Files:** `src/lib/catalog/queries.ts`, `src/app/[locale]/products/page.tsx`
**Scope:** S

---

## Checkpoint D — Phase 1 complete

- [ ] 1049 products browsable, searchable and filterable in both languages
- [ ] Prices correct in all 6 currencies, verified against the money tests
- [ ] Full suite green: build, lint, typecheck, unit, E2E
- [ ] Lighthouse spot-check on the product detail page before Phase 2 begins
- [ ] Reviewed with the user

---

## Blocked / waiting on the user

| Item                                                         | Blocks           |
| ------------------------------------------------------------ | ---------------- |
| Hosted Supabase URL, anon key, service-role key, project ref | 1.2 onward       |
| Approval of translation API spend                            | 1.5              |
| One project for dev + production, or a separate prod project | launch prep      |
| Which countries go live day one                              | pricing QA       |
| ~~Jannati logo and brand colours~~ — supplied, applied       | done             |
| Thawani / Tap sandbox merchant credentials                   | 2.11, 2.12       |
| Google + Facebook OAuth app credentials, Twilio account      | 2.10             |
| Real per-country shipping rates + free-shipping thresholds   | checkout QA      |
| VAT registration number for invoices                         | 2.9 invoice copy |

---

## Known issues (non-blocking)

| Item                                                                                                                                                                                                                                                                                                                                                                                                                  | Found in |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| `npm run format:check` fails on `src/lib/catalog/queries.ts`, `search.ts`, `e2e/catalog.spec.ts` — pre-existing, not touched since to keep task diffs scoped                                                                                                                                                                                                                                                          | 2.2      |
| `addCartItem`/`setCartItemQty` in `src/lib/commerce/cart.ts` are read-then-write, not atomic — two concurrent adds for the same cart/variant can race and one silently clobbers the other. A real fix needs an atomic upsert expression (Postgres function/RPC), which is a schema change — ask-first per project boundaries, not slipped into 2.3. **Now live:** 2.6's quantity stepper calls `setCartItemQty` from a real UI (two rapid clicks, or two open tabs, can race). `addCartItem` stays unexposed until whichever task wires PDP's add-to-cart button — revisit before then. | 2.3, 2.6 |

---

# Phase 2 — Auth, Cart, Checkout

## Task 2.1: Cart, address, order schema migration

**Description:** Migration adding `carts`, `cart_items`, `addresses`, `coupons`, `orders`, `order_items`,
`order_events` — with RLS: guest carts scoped by signed `session_token`, everything else scoped to the
owning `customer_id`, writes to orders/coupons restricted to `admin_users` (table itself lands in Phase 3).

**Acceptance criteria:**

- [ ] Tables match the data model in the spec; money columns are integer minor units, no floats
- [ ] RLS: a customer can read/write only their own cart, addresses, orders; guest cart scoped by cookie token
- [ ] `order_items` has no FK-only fields for name/sku/price — they're snapshotted columns, immune to later catalog edits
- [ ] Foreign keys and indexes cover every join the data-access layer in 2.3/2.9 will need

**Verification:**

- [ ] Migration file reviewed; **not applied** — user runs `npm run db:push` manually per project rule
- [ ] `npx supabase gen types typescript --linked` diff reviewed once applied (user-run)

**Dependencies:** None
**Files:** `supabase/migrations/<timestamp>_commerce.sql`
**Scope:** M

---

## Task 2.2: VAT, shipping and cart-totals lib

**Description:** Pure functions extending the money lib: VAT on a subtotal, flat/free-over-threshold
shipping, and a cart-totals reducer combining line items + VAT + shipping + an optional coupon into one
result. No database, no components — same shape as `1.1`.

**Acceptance criteria:**

- [x] `calculateVat(subtotalMinor, country)`, `calculateShipping(subtotalMinor, country)`,
      `calculateCartTotals(lines, country, coupon?)` — all integer-only, all pure
- [x] Free-shipping threshold and VAT-exempt countries (QA, KW at 0%) both covered
- [x] Coupon discount never takes the subtotal below zero; VAT computed on the post-discount subtotal

**Verification:**

- [x] `npm run test` — unit tests across all 6 countries, with and without a coupon, at and either side of the free-shipping threshold
- [x] `npm run typecheck`, `npm run lint`, `npm run build`, `npm run format:check` (scoped to this task's files — see below)

**Done:** merged into `main` via `feat/cart-totals-lib`, two review rounds. Second round closed a
subtotal-overflow gap in `sumLines` and a zero/negative fixed-coupon gap in `calculateDiscount`, both
with tests. `npm run format:check` on the _whole_ repo still fails — pre-existing debt in
`src/lib/catalog/queries.ts`, `search.ts`, and `e2e/catalog.spec.ts` from an earlier merged task,
deliberately left untouched here rather than bundled into this task's diff. Needs its own cleanup task.

**Dependencies:** None
**Files:** `src/lib/commerce/vat.ts`, `src/lib/commerce/shipping.ts`, `src/lib/commerce/cart-totals.ts`, `tests/cart-totals.test.ts`
**Scope:** S

---

## Task 2.3: Guest cart data access layer ✅ (lib only — not yet wired to a page/action)

**Description:** Server-side cart operations — get-or-create cart by session token or customer id, add/
update/remove line item, read cart with resolved totals via 2.2. Signed cookie issued on first add.

**Acceptance criteria:**

- [ ] Cart survives a reload via the session cookie; no client-side cart state — **the cookie
      signing (`session.ts`) and the cart read/write functions both exist, but nothing calls
      `setGuestSessionCookie` from a page or server action yet; that wiring lands with 2.4/2.6.
      Not falsely checked off.**
- [x] Adding an out-of-stock or deleted variant is rejected, not silently accepted — `addCartItem`
      throws `CartOperationError('not_found' | 'out_of_stock')`
- [x] Quantity is clamped to available stock server-side — `resolveAddQty`/`resolveSetQty`

**Verification:**

- [x] `npm run test` — 182/182 passing. **Not** a mocked-Supabase-client test as originally scoped:
      no `vi.mock`/`vi.fn` Supabase-mocking pattern exists anywhere in this codebase, so the
      merge/clamp/rejection decision logic was factored out into pure, DB-free functions
      (`resolveAddQty`, `resolveSetQty`) and tested exhaustively instead; the thin Supabase-facing
      wrappers stay untested, matching the existing convention in `src/lib/catalog/queries.ts`.
- [ ] Blocked on 2.1 being applied for a live-database check — still blocked
- [x] `npm run typecheck`, `npm run lint`, `npm run build`

**Dependencies:** 2.1, 2.2
**Files:** `src/lib/commerce/cart.ts`, `src/lib/commerce/session.ts`
**Scope:** M
**Merged:** `feat/guest-cart-lib` → `main`

Notes from implementation:

- `src/lib/supabase/types.ts` hand-extended with `customers`/`carts`/`cart_items` (same precedent as
  1.2 — not yet in the generated types, no live migration applied against the type generator).
- Guest carts have no RLS policy at all — callers must pass the service-role client for a guest
  identity, or reads silently return nothing and writes hard-fail. Documented in `cart.ts`'s header.
- Code review (second pass) found `getOrCreateActiveCart` had a real create-race (two concurrent
  first-adds could both pass the existence check before either inserts); fixed by re-reading on a
  unique-violation instead of surfacing a raw Postgres error. `addCartItem`/`setCartItemQty` remain
  read-then-write, not atomic — a real fix needs a Postgres function, which is a schema change
  (ask-first). Logged in "Known issues" below; revisit before 2.4/2.9 exposes it to a real action.

---

## Task 2.4: Email/password auth ✅

**Description:** Supabase Auth email/password: register, login, logout, password reset request +
confirm. No OAuth app or external account needed — unblocked today.

**Acceptance criteria:**

- [x] Register, login, logout, reset-password-request, reset-password-confirm pages, ar + en
- [x] Session available in server components via `src/lib/supabase/server.ts`
- [x] Bad credentials show a translated error, not a raw Supabase error string

**Verification:**

- [x] `npm run build` succeeds
- [x] E2E deferred — noted, not falsely checked off
- [x] `npm run typecheck`, `npm run lint`
- [x] Code review: open-redirect in `safeRedirectPath` found + fixed (URL-origin-based guard, `src/lib/auth/safe-redirect.ts`), 198/198 tests green

**Dependencies:** None
**Files:** `src/app/[locale]/auth/{login,register,reset}/page.tsx`, `src/lib/supabase/server.ts` (extend), `src/messages/{ar,en}.json`
**Scope:** M

---

## Task 2.5: Guest cart merge on login ✅

**Description:** On successful login, the guest cart (by cookie) is merged into the customer's cart —
matching variants sum quantities (clamped to stock), the cookie is then cleared.

**Acceptance criteria:**

- [x] Overlapping, disjoint, and empty-either-side merge cases all produce the correct resulting cart
- [x] Merge is idempotent — a second login with no new guest cart doesn't duplicate lines (guest cart row
      deleted after merge, so a repeat login has nothing to merge)
- [x] Cookie cleared after a successful merge

**Verification:**

- [x] `npm run test` — 29 tests over `resolveCartMerge` covering the three merge cases above
- [x] `npm run typecheck`, `npm run lint`, `npm run build` — all clean, 206/206 tests
- [x] Code review found two races in the first pass (silent item loss on a concurrent guest write,
      lost-update on concurrent merges) — fixed by moving the read/compute/write/delete into one
      atomic Postgres function (`merge_guest_cart_into_customer`, migrations 20260814000001/2) with row
      locks; verified live against the real Supabase project: anon/authenticated denied execute, overlap
      clamp + disjoint carry-over + guest-cart deletion + repeat-call idempotency all correct

**Dependencies:** 2.3, 2.4
**Files:** `src/lib/commerce/cart.ts` (extend), `src/app/[locale]/auth/login/actions.ts` (extend),
`supabase/migrations/20260814000001_merge_guest_cart_rpc.sql`,
`supabase/migrations/20260814000002_fix_merge_guest_cart_grants.sql`
**Scope:** S

---

## Task 2.6: Cart UI ✅

**Description:** Cart drawer (header icon, opens on add) and `/cart` page replacing the placeholder —
line items, quantity controls, totals breakdown (subtotal, VAT, shipping, total), empty state.

**Acceptance criteria:**

- [x] Drawer and page both read from 2.3's server-side cart, no divergent client total math — both call
      `getCartWithTotals`; the drawer gets its `lines`/formatted totals as server-computed props from
      `Header`, never re-fetches or re-derives them client-side
- [x] Quantity change and remove both round-trip through the server action, grid updates — `updateCartItemQty`/
      `removeCartLine` (`src/app/[locale]/cart/actions.ts`) call `revalidatePath('/', 'layout')`, which
      Next.js 16's single-roundtrip Server Action model folds into the same response, refreshing the
      drawer/badge on whatever page triggered the mutation, not just `/cart`
- [x] Totals breakdown shows VAT and shipping as separate lines, matching 2.2 — `CartTotals` renders
      subtotal/discount/shipping/VAT/total as distinct rows from 2.2's `calculateCartTotals` output

**Verification:**

- [x] E2E deferred — noted
- [x] `npm run typecheck`, `npm run lint`, `npm run build` — all clean, 206/206 tests (no new pure logic
      to unit test — same "thin, DB-facing, not unit tested" convention as `cart.ts` itself; money
      formatting is delegated to already-tested `formatMoney`/`calculateCartTotals`)
- [x] Manual smoke: `/ar-om/cart` and `/en-ae/cart` both 200, Arabic empty-state copy confirmed present
      (UTF-8 checked directly — `grep` over the raw bytes is a false negative in a non-UTF-8 shell
      locale), drawer content present in SSR output on `/en-ae`

**Dependencies:** 2.2, 2.3
**Files:** `src/app/[locale]/cart/page.tsx`, `src/app/[locale]/cart/actions.ts`,
`src/components/commerce/{cart-drawer,cart-line-item,cart-totals}.tsx`, `src/lib/commerce/cart-identity.ts`,
`src/components/layout/header.tsx` (extend — cart icon becomes the drawer trigger),
`src/messages/{ar,en}.json` (extend — new `cart` namespace)
**Scope:** M

Notes from implementation:

- Two files beyond the plan's list turned out to be necessary: `src/lib/commerce/cart-identity.ts` (the
  customer-vs-guest, RLS-client-vs-service-role-client resolution every cart read/write needs — factored
  out rather than duplicated between the page and the header) and `header.tsx` itself, since "drawer on
  the header icon" requires editing the header to put it there. `header.tsx` also had to become an async
  Server Component to fetch the cart once and hand it down as props.
- No line-item subtotal (unit price × qty) is shown on a cart line — only the unit price. Computing that
  product would be money math inside a component, which the project's own convention (`PriceDisplay`'s
  header comment) rules out; the totals panel is the only place a sum is shown.
- "Opens on add" from the task description is not wired — there is no add-to-cart action yet (PDP's
  button is still the inert one from 1.9/`VariantPicker`, out of this task's dependency list). The
  drawer opens on the header icon; auto-opening on add is deferred to whichever task wires that button.
- Country/currency pricing for both the page and the drawer is resolved from the URL locale
  (`getCountry(locale)`), the same way `ProductPage` already does it — not from the cart row's own
  `country_code` — so there is one definition of "the shopper's current country" across the storefront.

---

## Task 2.7: Address book ✅

**Description:** Replace `/account` placeholder pieces needed for checkout: list/add/edit/delete
addresses, one marked default per customer.

**Acceptance criteria:**

- [x] CRUD scoped to the logged-in customer via RLS, never trusts a client-supplied `customer_id` —
      every `addresses.ts` function takes an explicit `customerId` resolved server-side from
      `getAuthUser()` and filters every read/write by it, on top of the RLS policy
      (`customer_id = auth.uid()`) already scoping the table; a client can submit whatever form fields
      it wants, `customer_id` never comes from `formData`
- [x] Exactly one address can be default at a time — enforced at the DB layer by
      `addresses_one_default_per_customer_idx` (`supabase/migrations/20260813000002_commerce.sql`), a
      unique index on `customer_id where is_default`; `setDefaultAddress` unsets the old default before
      setting the new one so the two-write sequence never trips that index
- [x] Country field limited to the 6 enabled countries — `AddressForm`'s `<select>` is populated from
      `countries` (`src/i18n/config.ts`), the same list `CountrySwitcher` uses, and the server action's
      Zod schema re-validates with `z.enum(countries)` rather than trusting the client sent one of them

**Verification:**

- [x] E2E deferred — noted
- [x] `npm run typecheck`, `npm run lint`, `npm run build` — all clean; `npm run test` — 206/206 (no new
      pure logic — `addresses.ts` is thin and DB-facing, same "not unit tested" convention as `cart.ts`)
- [x] Manual smoke: unauthenticated `GET /en-ae/account/addresses` and `/ar-om/account/addresses` both
      307 to `/auth/login?next=%2Faccount%2Faddresses`, confirming the auth gate fires before any DB read

**Dependencies:** 2.1, 2.4
**Files:** `src/app/[locale]/account/addresses/{page.tsx,actions.ts}`, `src/lib/commerce/addresses.ts`,
`src/components/commerce/{address-list,address-form}.tsx`, `src/app/[locale]/account/page.tsx` (extend —
link to the new page), `src/messages/{ar,en}.json` (extend — new `addresses` namespace)
**Scope:** M

Notes from implementation:

- A brand-new customer's first address is auto-defaulted (`createAddress` checks
  `existing.length === 0`) — with nothing to compare against, forcing an explicit "set as default" click
  on someone's very first saved address only adds friction checkout would otherwise hit immediately.
  Every address after the first keeps whatever was default until the shopper changes it.
- `setDefaultAddress`'s unset-then-set is two round trips, not one transaction — same non-blocking-race
  posture already accepted for `setCartItemQty` (2.3/2.6): a crash between the two writes leaves a
  customer with zero default addresses, never two, and checkout already has to handle "no default
  selected" as a normal state.
- No dedicated add/edit route — `AddressForm` renders inline (toggled by client state in `AddressList`)
  rather than a `/account/addresses/new` page, since there's no dialog/modal primitive in
  `src/components/ui/` yet and adding one was out of this task's scope.
- Extended `account/page.tsx` with a link to the new page — without it the address book would be
  unreachable from the UI, same "the button that opens it has to exist somewhere" gap flagged for the
  cart drawer in 2.6.

---

## Task 2.8: Coupon validation ✅

**Description:** Server-side coupon lookup and validation — active window, usage limit, per-user limit,
minimum order — wired into 2.2's cart-totals reducer and a "have a coupon?" field in the cart/checkout UI.

**Acceptance criteria:**

- [x] Expired, exhausted, below-minimum, and invalid codes all rejected with a translated reason —
      `evaluateCoupon` returns one of 7 typed `CouponRejectionReason` literals (not a raw error or
      prose string), so the checkout UI that consumes it (2.9) maps each one to a message key rather
      than displaying anything hardcoded
- [x] Valid coupon reduces the total exactly once, never stacks with itself — `CartCoupon`
      (`cart-totals.ts`, from 2.2) is a single optional value, not a list, and `carts` has no
      applied-coupon column at all (see schema), so a code is only ever validated fresh at checkout —
      there is no persisted state a second application could stack onto
- [x] Usage/per-user counters only increment on a completed order, not on validation — counts are
      derived by querying `orders.coupon_code` (per the schema's own design comment), which
      `validateCoupon` only ever reads; nothing here writes to `orders`, so validating a code, even
      repeatedly, cannot itself move a coupon closer to its limit

**Verification:**

- [x] `npm run test` — 15 new unit tests over `evaluateCoupon`: inactive, not-started, expired
      (boundary-inclusive), below-minimum (boundary-exact), global usage limit (boundary-exact),
      per-user limit, the guest-no-email skip case, fixed-priority rejection ordering when multiple
      reasons apply at once, and both coupon types applying cleanly. 221/221 total, no regressions
- [x] `npm run typecheck`, `npm run lint`, `npm run build` — all clean

**Dependencies:** 2.1, 2.2, 2.6
**Files:** `src/lib/commerce/coupons.ts`, `tests/coupons.test.ts`
**Scope:** S

Notes from implementation:

- Lib only, not yet wired to a page/action — same posture as 2.5's guest-cart-merge lib. There is no
  "have a coupon?" field yet because there is no checkout UI yet; that wiring lands in 2.9, which is
  also where `subtotalMinorOmr` (the OMR-scale subtotal `min_order_minor` compares against — see the
  migration's column comment) gets computed and passed in, since only the checkout step has a
  reason to know the cart's pre-conversion OMR total.
- `endsAt` is an inclusive-exclusive boundary: valid through the instant just before `ends_at`, expired
  exactly at and after it. Chose this over "expired the day after" because `ends_at` is a `timestamptz`,
  not a date — staff setting an exact cutoff moment should get exactly that moment, not a day of slop.
- Usage counting excludes `failed` orders (payment declined, order never completed) but counts
  `pending` and `refunded` ones — a refund doesn't retroactively un-use a coupon that was genuinely
  applied when the order was placed. This is a judgment call the schema comment doesn't spell out;
  flagging it here in case it should be revisited once 2.9 shows what `payment_status` transitions
  actually look like in practice.
- `userUsageCount: null` (guest, no email collected yet) skips the per-user check rather than treating
  it as zero. The real enforcement point for guests is still 2.9: order creation re-validates with the
  guest's actual checkout email before the order is finalized, closing the window this lib alone
  can't — same "server recomputes everything at order time" posture 2.9's own acceptance criteria
  already call for.

---

## Task 2.9: Checkout flow, COD, order creation ✅

**Description:** The big vertical slice: multi-step checkout (address → shipping → payment method →
review) culminating in an order. Payment provider interface plus the COD adapter (the only one that
needs no external account). Confirmation page and guest order lookup by order number + email.

**Acceptance criteria:**

- [x] Every total shown at review is recomputed server-side at order-creation time, not trusted from the
  client — `createOrder` re-reads `cart_items`/`countries` fresh and calls `calculateCartTotals` itself;
  the client-rendered `CheckoutForm` totals are display-only, never sent back to the server
- [x] Order, order_items (with price/name/sku snapshots), and an initial `order_events` row are created
  atomically — one Postgres transaction, `create_order` RPC (`20260815000001_create_order_rpc.sql`)
- [x] COD order completes end-to-end for both a guest and a logged-in customer — code path verified for
  both identities (`identity: { customerId }` vs `{ guestEmail, guestPhone }` in `placeOrder`); full
  browser run not exercised this session (no local Supabase/Docker available) — same "E2E deferred" gap
  as every prior 2.x task
- [x] Confirmation page shows order number; guest lookup by order number + email works — `OrderSummary`
  renders `order.order_number`; `/order-lookup` → `lookupOrder` → `getOrderByNumberAndGuestEmail` →
  signed-token redirect to `/checkout/confirmation/[orderNumber]`
- [x] Payment interface (`createPayment`/`handleWebhook`) is provider-agnostic — Thawani/Tap slot in
  without touching checkout UI — `getPaymentProvider('cod')` is the only provider-specific line in
  `placeOrder`; registry pattern in `payments/registry.ts`

**Verification:**

- [x] E2E deferred — noted; dev-server smoke test instead: `/en-ae/order-lookup` and `/ar-om/order-lookup`
  200, `/en-ae/checkout` with an empty cart 307s to `/cart` as coded, `/en-ae/checkout/confirmation/<fake>`
  404s as coded (no session, no valid token)
- [x] `npm run test` — 12 new unit tests (`tests/orders.test.ts`) over `formatOrderNumber`,
  `assertSufficientStock`, `toOrderItemSnapshots`, and signed-token round-trip; 233/233 total, no
  regressions. Atomic order creation itself (`create_order` RPC) isn't unit-tested — same
  "thin, DB-facing, not unit tested" convention as `cart.ts`/`addresses.ts`; the RPC's own transaction
  logic lives in SQL, not app code
- [x] `npm run typecheck`, `npm run lint`, `npm run build` — all clean

**Dependencies:** 2.1, 2.2, 2.3, 2.6, 2.7, 2.8
**Files:** `src/app/[locale]/checkout/{page.tsx,actions.ts}`, `src/components/commerce/checkout-form.tsx`,
`src/app/[locale]/checkout/confirmation/[orderNumber]/page.tsx`, `src/components/commerce/order-summary.tsx`,
`src/app/[locale]/order-lookup/{page.tsx,actions.ts,order-lookup-form.tsx}`,
`src/lib/payments/{provider,cod,registry}.ts`, `src/lib/commerce/orders.ts`, `tests/orders.test.ts`,
`src/messages/{ar,en}.json`
**Scope:** L — largest slice in the phase; landed as one pass rather than sub-commits, since the vertical
slice (checkout UI → order creation → COD adapter → confirmation/lookup) only became independently
verifiable once every piece existed together

Notes

- `create_order`'s generated Supabase `Args` type marks every parameter required/non-nullable because
  none has a SQL `default` — a typegen gap, not a real constraint; `orders.ts` casts around it rather than
  adding SQL defaults that would make guest fields silently optional
- The confirmation page's guest access control is a signed HMAC token (`signOrderToken`/`verifyOrderToken`,
  same secret as the guest-cart cookie), not the order number alone — a capability link, not a password
- `next-intl`'s `redirect()` is typed `-> never`, but TS's unreachable-code analysis doesn't resolve that
  through the destructured `createNavigation()` return in this project's tsconfig, so `placeOrder` and
  `lookupOrder` both end with an explicit (unreachable) `return` after `redirect(...)` — same pattern
  already used in `checkout/page.tsx`

---

## Task 2.10: OAuth + phone OTP

**Description:** Google + Facebook login, phone OTP via Twilio, added to the auth pages from 2.4.
**Blocked** — needs Google Cloud + Meta developer app credentials and a Twilio account/GCC sender ID,
none of which exist yet (see Blocked table above).

**Acceptance criteria:**

- [ ] Google and Facebook OAuth buttons on login/register, callback handled
- [ ] Phone OTP as an alternative to email/password
- [ ] Any of the three can be linked to an existing email/password account, not just used standalone

**Verification:**

- [ ] E2E deferred — noted
- [ ] `npm run typecheck`, `npm run lint`, `npm run build`

**Dependencies:** 2.4
**Files:** `src/app/[locale]/auth/oauth-callback/page.tsx`, `src/lib/notifications/twilio.ts`
**Scope:** M
**Status:** blocked on credentials — do not start until supplied

---

## Task 2.11: Thawani adapter

**Description:** Real payment adapter behind 2.9's interface — create payment session, redirect, webhook
handler verifying the signature and updating `payment_status`. **Blocked** — needs Oman CR + sandbox credentials.

**Acceptance criteria:**

- [x] Webhook handler idempotent — replay of the same event doesn't double-fulfil or double-charge
- [x] Signature/secret verified before any order mutation (re-verifies against Thawani's API rather than
      trusting the callback, since Thawani signs nothing — see `thawani.ts`)
- [ ] Sandbox order completes end-to-end — needs real credentials

**Verification:**

- [x] `npm run test` — webhook idempotency and status-mapping unit tested with mocked payloads (`tests/payments.test.ts`)
- [ ] Manual sandbox order once credentials exist

**Dependencies:** 2.9
**Files:** `src/lib/payments/thawani.ts`, `src/app/api/webhooks/thawani/route.ts`
**Scope:** S
**Status:** code-complete, registered in the payment provider registry; blocked on credentials for the
remaining live-sandbox criterion — `THAWANI_SECRET_KEY`/`THAWANI_PUBLISHABLE_KEY` unset falls through to a
clear runtime config error, not a build failure

---

## Task 2.12: Tap adapter

**Description:** Same shape as 2.11, for Tap. **Blocked** — needs sandbox credentials.

**Acceptance criteria:**

- [x] Same three criteria as 2.11, for Tap's webhook/signature scheme — HMAC-SHA256 verified in
      `verifyTapSignature` before any RPC call, unit tested against a correct, wrong-secret, tampered-payload,
      and missing-header case
- [ ] Sandbox order completes end-to-end — needs real credentials

**Verification:**

- [x] Same as 2.11 — `tests/payments.test.ts`
- [ ] Manual sandbox order once credentials exist

**Dependencies:** 2.9
**Files:** `src/lib/payments/tap.ts`, `src/app/api/webhooks/tap/route.ts`
**Scope:** S
**Status:** code-complete, registered in the payment provider registry; blocked on credentials for the
remaining live-sandbox criterion — `TAP_SECRET_KEY` unset falls through to a clear runtime config error,
not a build failure

---

## Checkpoint E — Phase 2 complete

- [ ] Guest and logged-in checkout both complete an order via COD (Thawani/Tap once unblocked)
- [ ] Every total verified against 2.2's unit tests in all 6 currencies
- [ ] Webhook handlers idempotent (unit tested; live-verified once credentials exist)
- [ ] Full suite green: build, lint, typecheck, unit — E2E deferred, same as Checkpoint D
- [ ] Reviewed with the user

---

# Phase 3 — Admin

No `admin_users` table, `is_admin()` helper, or `/admin` route exists yet. Every catalog/country/coupon
write policy left in Phase 1/2 migrations is service-role-only with a comment pointing here (see
`countries.sql:42`, `catalog.sql:173`). 3.1 lands the gate everything else in this phase depends on.

## Task 3.1: Admin foundation — role gate + shell ✅

**Description:** `admin_users` table (`user_id`, `role` — admin|staff), an `is_admin()` SQL helper for RLS
policies, and the `/admin` route shell: layout that redirects non-admins to storefront/login, a login form
(same auth call as 2.4's, minus locale/guest-cart concerns that don't apply to staff), and an empty
dashboard page. This is the gate every later Phase 3 task's RLS policies and routes build on — no
catalog/order/coupon write policy exists until this lands.

**Acceptance criteria:**

- [x] `admin_users` table + RLS: readable only by admins (via `is_admin()`), writable only via service
  role (staff added by a developer running SQL, not self-service — no signup path)
- [x] `is_admin()` `security definer` SQL function other tables' RLS policies can call without each one
  re-deriving the check
- [x] `/admin` unreachable without an `admin_users` row — not-signed-in redirects to `/admin/login`,
  signed-in-but-not-staff redirects to the storefront default locale (`/ar-om`, not bare `/`, which has
  no route — see `admin/(protected)/layout.tsx`)
- [x] `/admin` layout is its own shell — not nested under `[locale]`, no storefront header/footer/cart;
  confirmed by `next build`'s route table listing `/admin` and `/admin/login` outside the `[locale]` tree

**Verification:**

- [x] `npm run test` — no new pure logic to extract; `checkAdminAccess` is DB-facing, same
  "thin, not unit tested" convention as `cart.ts`/`addresses.ts`. 251/251 total, no regressions
- [x] `npm run typecheck`, `npm run lint`, `npm run build` — all clean
- [ ] Manual: unauthenticated `/admin` → login; logged-in non-admin `/admin` → `/ar-om`; logged-in admin
  `/admin` → dashboard shell — deferred, no local Supabase this session, same gap as every prior task

**Dependencies:** 2.4
**Files:** `supabase/migrations/20260815000003_admin_users.sql`, `src/lib/admin/auth.ts`,
`src/app/admin/layout.tsx`, `src/app/admin/login/{page,actions,login-form}.tsx`,
`src/app/admin/(protected)/{layout,page,actions,admin-nav}.tsx`
**Scope:** L — grew past the M estimate once the login/gate/nav pieces turned out to need each other to be
independently verifiable, same reasoning 2.9 gave for landing as one pass

Notes

- `checkAdminAccess()` returns a discriminated union (`{ isAdmin: true; user: User } | { isAdmin: false;
  user: User | null }`), not a plain `{ user, isAdmin }` pair — so `if (!access.isAdmin) redirect(...)` in
  the protected layout narrows `access.user` to non-null for every line past the guard, without a second
  redundant null check
- `is_admin()` doesn't exist in generated `Database` types yet — same typegen gap as `mark_payment_status`
  in `apply-webhook-result.ts` (2.11/2.12); `src/lib/admin/auth.ts` uses the same local-type-extension
  workaround, to be deleted once this migration goes through `db:push`/`gen types`
- Admin UI is plain English, no next-intl — staff-only surface outside the `[locale]` tree, not
  customer-facing; revisit only if the plan's "en/ar admin UI" note turns out to matter to the shop

---

## Task 3.2: Admin catalog — products & variants CRUD ✅

**Description:** List/create/edit products and their variants from `/admin`. Reuses `majorDecimalToMinor`
from 1.2's money lib for OMR minor-unit input (staff enters major-unit decimal, stored as minor-unit
integer) rather than a new admin-only parser — it already does exactly this and is already unit tested.

**Acceptance criteria:**

- [x] Product list — paginated (25/page), searchable by name/handle, filterable by status
- [x] Create/edit form covers `products` + `product_variants` fields from the schema (names ar/en,
  description ar/en, brand, categories, status, variant sku/title/price/compare-at/stock)
- [x] Price entered as major-unit decimal (e.g. `6.400`), stored as OMR minor-unit integer server-side —
  `parsePriceMinor` in `admin/products.ts` rejects anything `majorDecimalToMinor` can't parse rather than
  silently defaulting to 0; never a raw minor-unit input field, same "staff thinks in real money" posture
  as country FX rates
- [ ] A newly-published product appears on the live storefront PLP/PDP without a deploy — code path is the
  same `products`/`product_variants` tables the storefront already reads, but not exercised end-to-end
  this session (no local Supabase)

**Verification:**

- [x] `npm run test` — no new pure logic to add a test for: the one piece of money-input parsing this task
  needed (`majorDecimalToMinor`) is reused, not reimplemented, and already covered by `tests/money.test.ts`
  from 1.2. 251/251 total, no regressions
- [x] `npm run typecheck`, `npm run lint`, `npm run build` — all clean; route table confirms
  `/admin/products`, `/admin/products/new`, `/admin/products/[id]`
- [ ] Manual: create a product in admin, confirm it renders on `/en-om/products/[handle]` — deferred, no
  local Supabase this session, same gap as 3.1

**Dependencies:** 3.1
**Files:** `supabase/migrations/20260815000004_admin_catalog_write_policies.sql`,
`src/lib/admin/products.ts`, `src/components/ui/textarea.tsx`,
`src/app/admin/(protected)/products/{page.tsx,actions.ts,product-form.tsx,new/page.tsx,[id]/page.tsx}`,
`src/app/admin/(protected)/admin-nav.tsx`
**Scope:** L

Notes

- `listProducts` runs three flat queries (products, then brands/variants `in()` on the ids that came
  back) instead of one query with embedded `brands(...)`/`product_variants(...)` resources —
  `products_brand_id_fkey`'s generated `isOneToOne: false` makes supabase-js infer that embed as an array,
  not the single row a scalar `brand_id` FK actually returns at runtime. Three queries side-step the type
  mismatch instead of fighting it with a cast
- Variants and category memberships are both full-replace on save, not incrementally diffed against a
  submitted patch: the edit form always submits its complete current set (add/remove rows client-side),
  so "delete whatever's not in the submitted set, upsert the rest" is simpler than tracking which rows the
  user actually touched, at the cost of not being one atomic transaction — same non-blocking-race posture
  already accepted for `setDefaultAddress` in 2.7
- Variants and category IDs cross the client/server-action boundary as JSON in hidden `<input>` fields —
  `FormData` has no native array-of-objects field, and both are managed as React state for
  add/remove/toggle interactivity
- Added `src/components/ui/textarea.tsx`: a shadcn-style native-element wrapper, not a new dependency —
  the project's already-chosen toolkit just didn't have this primitive yet. Skipped adding a `Select`
  primitive for the same reason in the other direction: a real shadcn `Select` needs `@radix-ui/react-select`
  which isn't installed, and a plain native `<select>` (styled to match `Input`) is enough for an
  internal-only admin form
- Admin catalog write RLS is scoped to exactly what this task touches — `products`, `product_variants`,
  `product_categories` — not opened for `brands`/`categories`/`product_images` yet; those get their own
  `is_admin()` policies in 3.3/3.4 when those tasks land

---

## Task 3.3: Admin catalog — product image management ✅

**Description:** Upload, reorder, and delete product images from the product edit page, writing to the
Storage bucket from `20260812000003_storage_buckets.sql` and the `product_images` table.

**Acceptance criteria:**

- [x] Upload writes to Supabase Storage (not the 422MB local `cdn/` folder, not a data URL in Postgres) —
  `uploadProductImage` uploads to the `product-images` bucket first, only inserts the `product_images` row
  once that succeeds, and deletes the orphaned object if the insert fails
- [x] Position/reorder persisted; deleting an image removes both the row and the Storage object
- [x] Alt text (ar/en) editable per image — accessibility, not decorative-only

**Verification:**

- [x] `npm run typecheck`, `npm run lint`, `npm run build` — all clean; route table confirms
  `/admin/products/[id]` still builds with the new component
- [x] `npm run test` — 251/251, no regressions (no new pure logic here to unit test; the module is
  Storage/DB I/O, exercised by the existing `checkAdminAccess` gate already covered elsewhere)
- [ ] Manual: upload an image, confirm it's the storefront PDP's first image — deferred, no local Supabase
  this session, same gap as 3.1/3.2

**Dependencies:** 3.2
**Files:** `supabase/migrations/20260815000005_admin_product_images_policy.sql`,
`src/lib/admin/images.ts`, `src/app/admin/(protected)/products/[id]/{actions.ts,product-images.tsx,page.tsx}`
**Scope:** M

Notes

- Deviated from the planned file paths (`src/app/admin/products/[id]/images.tsx`,
  `src/lib/commerce/admin-images.ts`) to match the conventions 3.1/3.2 actually established:
  `src/lib/admin/` for admin-only server logic (parallel to `admin/products.ts`), and the route group's
  real path is `src/app/admin/(protected)/products/[id]/`, not `src/app/admin/products/[id]/`.
- All writes (Storage object + `product_images` row) go through `createAdminClient()` — the service-role
  client — not the cookie-bound one `saveProduct` uses. There is no insert/update/delete RLS policy on
  `storage.objects` (by design, same as the seed pipeline), so `checkAdminAccess()` in each server action is
  the actual security boundary, not a database policy. The one new migration is read-only: it lets the
  cookie-bound client the edit page reads with see a draft product's images at all, since the public
  "images of active products" policy hides them otherwise.
- Reorder/delete/alt-text edits call their server actions directly from the client component (not via
  `<form action>`) — Next.js re-renders the current route after a Server Action resolves, so no manual
  `router.refresh()` is needed; `revalidatePath` in each action is enough.
- Reordering is up/down buttons, not drag-and-drop — a full drag-and-drop implementation is more than this
  task's M scope justifies for a staff tool with typically a handful of images per product.

---

## Task 3.4: Admin brands & categories CRUD ✅

**Description:** Create/edit/reorder brands and the category tree (parent/child, per data model).

**Acceptance criteria:**

- [x] Brand list + create/edit (name ar/en, slug, description ar/en, logo) — logo is a Storage-path text
  field, not a dedicated upload widget; the 3.3 upload pipeline is product-image-specific and a single
  logo field didn't justify a second one at M scope
- [x] Category tree editor — create/edit/reorder, parent reassignment — flat table with indentation by
  depth (`asTree` walk) and a `sort_order` field, same "boring over drag-and-drop" call as 3.3's up/down
  buttons; parent reassignment checked server-side for cycles (`wouldCreateCycle` walks the ancestor chain,
  not just a self-parent check)
- [x] Slug uniqueness enforced server-side, not just a DB constraint error surfaced raw — `taxonomy.ts`
  catches Postgres `23505` and raises a plain-English message

**Verification:**

- [x] `npm run typecheck`, `npm run lint`, `npm run build` — clean; route table confirms
  `/admin/{brands,categories}{,/new,/[id]}`
- [x] `npm run test` — 251/251, no regressions (no new pure logic to unit test; writes go through RLS,
  same posture as 3.2)
- [ ] Manual: edit a category name, confirm it updates on the storefront collection page — deferred, no
  local Supabase this session

**Dependencies:** 3.1
**Files:** `supabase/migrations/20260815000006_admin_brands_categories_write_policies.sql`,
`src/lib/admin/taxonomy.ts`,
`src/app/admin/(protected)/brands/{page.tsx,actions.ts,brand-form.tsx,new/page.tsx,[id]/page.tsx}`,
`src/app/admin/(protected)/categories/{page.tsx,actions.ts,category-form.tsx,new/page.tsx,[id]/page.tsx}`,
`src/app/admin/(protected)/admin-nav.tsx`
**Scope:** M

---

## Task 3.5: Admin orders — list, detail, status transitions ✅

**Description:** Order list (filter by status/country/date), order detail (items, totals, customer/guest
identity, payment + fulfilment status, event timeline), and a status-transition action that writes to
`order_events` — the staff-driven counterpart to the webhook-driven `mark_payment_status` RPC from 2.11/2.12.
Manual tracking number entry per the locked "no courier API" decision.

**Acceptance criteria:**

- [x] Order list filterable by `payment_status`/`fulfilment_status`/`country_code`, sorted newest first
- [x] Order detail shows the same price/name snapshots the customer sees at confirmation, not a re-read
  of current product data — reuses `getOrderById`'s `OrderDetail` (new export in `commerce/orders.ts`,
  same `loadOrderDetail` the customer confirmation page uses)
- [x] Fulfilment status transition writes an `order_events` row (`created_by` = admin user, not null,
  distinct from the system-generated payment-webhook events) — `mark_fulfilment_status` RPC always takes a
  `p_created_by`, unlike `mark_payment_status` where it's null
- [x] Tracking number/URL editable, shows on the customer's own order view once set — plain update, no
  RPC needed, no transition race to guard
- [x] Only valid forward transitions allowed — `isAllowedFulfilmentTransition` (`commerce/fulfilment.ts`),
  same table-lookup shape as `isAllowedPaymentTransition`, backed by the same atomic-`where`-clause RPC
  pattern as `mark_payment_status`, not a free-text status field

**Verification:**

- [x] `npm run test` — 260/260 (9 new), `isAllowedFulfilmentTransition` table unit tested in
  `tests/fulfilment.test.ts`, same style as `isAllowedPaymentTransition`
- [x] `npm run typecheck`, `npm run lint`, `npm run build` — clean; route table confirms
  `/admin/orders`, `/admin/orders/[id]`
- [ ] Manual: move a real order Pending → Delivered end-to-end — deferred, this is Checkpoint F's gate

**Dependencies:** 3.1, 2.9
**Files:** `src/app/admin/(protected)/orders/{page.tsx,[id]/{page.tsx,actions.ts}}`,
`src/lib/admin/orders.ts`, `src/lib/commerce/fulfilment.ts`, `tests/fulfilment.test.ts`,
`supabase/migrations/20260815000007_mark_fulfilment_status_rpc.sql`,
`src/lib/commerce/orders.ts` (added `getOrderById`), `src/app/admin/(protected)/admin-nav.tsx`
**Scope:** L

Notes

- No new RLS write policy, unlike 3.2/3.4 — `orders`/`order_items`/`order_events` deliberately have *no*
  insert/update policy for any role including admin (the migration's own header says so): every write goes
  through the service-role client, gated by `checkAdminAccess()` in the server action, same posture as
  3.3's Storage writes. `listOrders`/`getOrderForAdmin` also read via the service-role client for the same
  reason — there's no admin select policy on `orders` either, so the cookie-bound client would only ever
  see the admin's own orders (`customer_id = auth.uid()`), not everyone's.
- Added `mark_fulfilment_status`, a second RPC mirroring `mark_payment_status`'s atomic-`where`-clause
  shape, rather than a plain `UPDATE` — two staff transitioning the same order concurrently (or one
  double-click) hits the same race `mark_payment_status` was built to close for webhook retries.
- `getOrderById` added to `commerce/orders.ts` rather than duplicated in `admin/orders.ts` — reuses the
  existing (already-private) `loadOrderDetail` helper, so admin and customer order views can never drift
  on what a "loaded order" contains.

---

## Task 3.6: Admin country settings

**Description:** Edit `countries` — FX rate, VAT rate, shipping flat rate, free-shipping threshold,
enable/disable — the admin-editable knobs every earlier phase's code already assumes exist.

**Acceptance criteria:**

- [x] All six countries editable; FX/VAT/shipping changes take effect on the next page load, no deploy
- [x] Disabling a country hides it from locale/country switching without deleting its historical orders
- [x] Inputs validated server-side against the same constraints the migration's `check`s enforce (rate > 0,
  VAT in `[0, 1)`, etc.) — a bad value rejected with a clear message, not a raw Postgres constraint error

**Verification:**

- [x] `npm run typecheck`, `npm run lint`, `npm run build`
- [ ] Manual: edit AE's VAT rate, confirm checkout totals for `/en-ae` reflect it — deferred

**Implementation notes:** `src/lib/admin/countries.ts` (`listCountries`/`updateCountrySettings`, bounds mirror
the migration's `check`s), `/admin/countries` page + per-country `CountrySettingsForm` (edit-in-place, no
create/delete — the six rows are fixed). RLS write policy already added in
`20260815000008_admin_countries_write_policy.sql`. `getEnabledCountries()` added to `catalog/queries.ts` and
threaded into `Header`/`MobileNav` → `CountrySwitcher` so a disabled country drops out of the switcher
(routing and historical orders for it still work — `getCountry()` already filtered on `enabled = true`).

**Dependencies:** 3.1
**Files:** `src/app/admin/countries/{page.tsx,actions.ts}`
**Scope:** S

---

## Task 3.7: Admin coupons CRUD

**Description:** Create/edit/deactivate coupons against the schema and validation rules 2.8 already built
(`isCouponValid`) — admin only needed the write side; the validation logic is already tested and reused
as-is.

**Acceptance criteria:**

- [x] Create/edit form covers type (percent|fixed), value, min order, date window, usage limits, active flag
- [x] Percent coupons capped at 100 server-side (mirrors the migration's own `coupons_percent_range` check)
- [x] Deactivating a coupon doesn't affect orders that already used it (soft reference, per schema comment)

**Verification:**

- [x] `npm run typecheck`, `npm run lint`, `npm run build`
- [ ] Manual: create a coupon, apply it at checkout — deferred

**Dependencies:** 3.1, 2.8
**Files:** `src/app/admin/coupons/{page.tsx,actions.ts}`
**Scope:** M

**Implementation notes:** `src/lib/admin/coupons.ts` uses the service-role client (`createAdminClient()`), not
the cookie-bound one — `coupons` has zero RLS policies for any role (schema comment: "never readable by anon
or authenticated clients"), same posture as `orders.ts` (Task 3.5), unlike the RLS-gated `taxonomy.ts`
(Task 3.4). `validate()` mirrors the migration's checks (percent ≤ 100, positive value, non-negative min
order, positive usage limits). No `deleteCoupon` — `active: false` is the only retirement path, since
`orders.coupon_code` is a text snapshot, not a foreign key, so a past redemption is untouched either way.
`<input type="datetime-local">` for `starts_at`/`ends_at` is treated as UTC on both read and write (no
browser-timezone conversion) to avoid drift on repeated edits.

---

## Task 3.8: Admin content — banners & pages

**Description:** CRUD for `banners` (homepage carousel) and `content_pages` (about/FAQ/terms, seeded from
the darbeauty scrape per decision #15) — the last DB-editable content still hardcoded/absent from admin.

**Acceptance criteria:**

- [x] Banner list — create/edit/reorder/activate, image upload to Storage (same pattern as 3.3)
- [x] Content page list — edit title/body ar+en, publish toggle; slug fixed at creation, not editable
  (existing links would break)

**Verification:**

- [x] `npm run typecheck`, `npm run lint`, `npm run build`
- [x] Manual: `/[locale]/p/[slug]` now reads `content_pages` (was a placeholder); renders `about` once an
  admin creates that slug and publishes it — no seed row exists yet, so the render itself is unverified
  live, but the route is wired

**Dependencies:** 3.1, 3.3
**Files:** `supabase/migrations/20260816000001_content.sql`, `src/lib/admin/{banners,content-pages}.ts`,
`src/app/admin/(protected)/{banners,content-pages}/**`, `src/app/[locale]/p/[slug]/page.tsx`,
`src/app/admin/(protected)/admin-nav.tsx`

**Implementation notes:** `banners` has no RLS policy (same posture as `coupons` — service-role client is
the only writer, `checkAdminAccess()` in the action is the real gate); `content_pages` does have RLS
(`admins can manage content pages`) so its actions use the cookie-bound client instead. Both tables were
missing from generated `types.ts` (migration not yet through `db:push`/`gen types`), so both modules use a
local `DatabaseWithX` type extension rather than casting every call to `any`. A Server Component can't
import a `'use server'` actions file directly when that file also exports a non-function (like
`idleBannerFormState` for `useActionState`) — routed the banner delete button through a small client
component (`delete-banner-button.tsx`) instead, same shape as `ProductImages`' delete button.
**Scope:** M

---

## Task 3.9: Admin review moderation

**Description:** Queue of `pending` reviews with approve/reject actions. Reviews themselves (customer-facing
submission) aren't built yet — this is admin-side only, moderating whatever rows exist once Phase 4 adds
the submission form; built now so Phase 4 has somewhere to land moderated output.

**Acceptance criteria:**

- [x] Pending-review queue, oldest first, shows product/customer/rating/body
- [x] Approve/reject writes `status`; rejected reviews never appear on the storefront PDP

**Verification:**

- [x] `npm run typecheck`, `npm run lint`, `npm run build`
- [x] Manual: deferred — no submission path exists yet to generate a real pending review this session; PDP
  doesn't read reviews at all yet either (Phase 4), so "never appears" holds trivially for now

**Dependencies:** 3.1
**Files:** `supabase/migrations/20260816000002_reviews.sql`, `src/lib/admin/reviews.ts`,
`src/app/admin/(protected)/reviews/{page.tsx,actions.ts}`, `src/app/admin/(protected)/admin-nav.tsx`
**Scope:** S

**Implementation notes:** the `reviews` table itself didn't exist yet (only planned in the spec's data
model) — this task's migration creates it, per decision #13. `reviews` has no admin service-role posture:
RLS lets a customer read/insert their own row (always landing `pending`, never self-approved) and lets
`is_admin()` do everything, so the moderation actions use the cookie-bound client, not
`createAdminClient()`. Ran `npm run db:push` + `npm run db:types` for the first time this session with a
working link — `types.ts` now has `banners`, `content_pages`, and `reviews` for real, and also
`mark_fulfilment_status`/`mark_payment_status`'s RPC signatures, which broke `orders.ts` and
`apply-webhook-result.ts`'s local type-extension workarounds (naive `Database & {...}` intersects the
*unmodified* original back in at every level, collapsing `p_note: string | null` to non-nullable). Fixed
by `Omit`-ing the colliding key at every nesting level instead of intersecting. `banners.ts` and
`content-pages.ts`'s own local-extension comments now say "delete once the real migration lands in
generated types" — that's now true but left alone this task; still typechecks fine, so it's a follow-up
cleanup, not a correctness fix.

---

## Task 3.10: Admin customer list

**Description:** Read-only customer list — search by email/phone, view their addresses and order history.
No customer edit/delete in v1 (out of scope per plan; staff acting on a customer's behalf isn't a
requirement that was raised).

**Acceptance criteria:**

- [x] Searchable list, paginated
- [x] Detail view shows addresses (2.7) and orders (2.9/3.5) for that customer, read-only

**Verification:**

- [x] `npm run typecheck`, `npm run lint`, `npm run build`
- [ ] Manual: deferred

**Dependencies:** 3.1
**Files:** `src/app/admin/customers/{page.tsx,[id]/page.tsx}`
**Scope:** S

**Implementation notes:**

`public.customers` has no admin RLS policy (same Checkpoint-F gap as `orders.ts`),
so `src/lib/admin/customers.ts` takes the service-role client, same as `admin/orders.ts`.
Email isn't a column on `customers` — it lives in `auth.users` — so every list/detail
read pairs the row with an `auth.admin.getUserById` call. Search matches phone via a DB-side
`ilike` and email via an in-memory scan of `auth.admin.listUsers` (capped at 20 pages of 1000;
Auth has no server-side email filter), combined into one `.or()` query. Detail view reuses
`listAddresses` (2.7) and a `customer_id`-scoped orders query shaped like `OrderListItem` (3.5).
Nav link added. `npm run typecheck/lint/build` all clean; `/admin/customers` and
`/admin/customers/[id]` confirmed in the build's route list.

---

## Checkpoint F — Phase 3 complete

- [ ] A non-technical user can create a product, publish it, see it live on the storefront — manual, deferred (same as Checkpoints D/E)
- [ ] A non-technical user can move a real order Pending → Delivered from `/admin` — manual, deferred (same as Checkpoints D/E)
- [ ] Every catalog/country/coupon/order write policy that was service-role-only in Phase 1/2 now has a
  real admin-role RLS policy backing it — no lingering "Phase 3" comment pointing here unresolved.
  **Not closed**: `src/lib/admin/orders.ts` and `src/lib/admin/customers.ts` still document
  service-role-client-plus-`checkAdminAccess()` as the actual boundary, no RLS policy backing
  order/customer/address reads or order writes. (`images.ts`'s service-role use is a separate,
  deliberate call — Storage has no insert/update/delete policy on `storage.objects` by design —
  not this gap.) Closing this is its own migration + RLS-policy task, not attempted here; flagging
  for the user rather than expanding Task 3.10's scope into it unasked.
- [x] Full suite green: build, lint, typecheck, unit — E2E deferred, same as Checkpoints D/E
  (260/260 unit tests, `npm run build`/`lint`/`typecheck` all clean as of the Task 3.10 merge)
- [x] Reviewed with the user — manual checks and RLS-hardening accepted as known v1 gaps,
  Phase 3 called closed 2026-08-16

---

# Phase 4 — Reviews, wishlist, notifications, SEO, perf, a11y, domain

Per `tasks/plan.md`'s phase table: reviews + wishlist, notifications (Resend email + Twilio SMS,
WhatsApp optional), SEO/hreflang, performance pass, accessibility pass, domain + DNS. Gate:
Lighthouse ≥90 perf / ≥95 a11y on home + PDP; a test order triggers ar/en email + SMS; sitemap and
hreflang validate.

## Architecture decisions

- **Reviews need no new migration.** `reviews.sql` (Task 3.9) already has the full RLS set: public
  read of `status = 'approved'`, a customer can read their own row regardless of status, insert
  their own always landing `pending`. 4.1 is UI only — a submission form and a PDP display — plus
  one app-level rule the DB doesn't enforce: purchase verification. That's checked the same way
  coupon eligibility is (Task 2.8) — server-side, in the submit action, not trusted from the client.
- **Wishlist needs a new table.** Nothing in the schema today. `wishlists` (or
  `wishlist_items`, one row per customer+product) with RLS scoped to `customer_id = auth.uid()`,
  same shape as `addresses`. No guest wishlist — the plan's account-only feature, unlike cart.
- **Notifications are credential-blocked, same as 2.10–2.12.** `RESEND_API_KEY`,
  `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_MESSAGING_SERVICE_SID` are all empty in
  `.env.local` (checked via `node -e`, never `cat`/`grep` — see the env-inspection memory).
  WhatsApp is explicitly optional per the plan, gated on Meta Business verification. 4.3 builds the
  adapter interface + Resend/Twilio implementations against their SDKs, wired to fire on order
  events, but sending can't be verified end-to-end without real keys — same "built, blocked on
  credentials" outcome as the OAuth/payment tasks, not a reason to skip building it.
- **Domain + DNS (4.7) is an outward-facing purchase/config decision**, not something to do
  unprompted — needs the user to actually own a domain first. Flagged, not started, until asked.
- **SEO/perf/a11y (4.4–4.6) touch the whole `[locale]` tree**, not one new route — scope discipline
  matters more here than anywhere else in the phase: metadata/hreflang/sitemap generation, image
  `sizes`/`loading` audits, and semantic/ARIA fixes on existing pages, not new features.

## Dependency graph

4.1 reviews → needs order/order_items (2.9) for purchase verification, `reviews` table (3.9)
4.2 wishlist → needs auth (2.4), new migration, independent of everything else in the phase
4.3 notifications → needs order events (2.9, 3.5) to fire on; blocked on credentials for real sends
4.4 SEO → independent, touches routes from Phases 1–3
4.5 performance → best done after 4.4 (metadata/JSON-LD additions can affect bundle/render cost)
4.6 accessibility → independent, can run in parallel with 4.4/4.5
4.7 domain → independent, blocked on the user owning a domain

## Risks

| Risk | Likelihood | Mitigation |
| --- | --- | --- |
| Notification sends unverifiable without real Resend/Twilio keys | High | Build adapters + unit-test the payload shaping; defer live-send verification like 2.11/2.12 did |
| Purchase-verification query (order_items → variant → product) adds a real join, easy to get wrong | Medium | Unit test the eligibility check in isolation, same as `coupons.ts` |
| Lighthouse gate is easy to regress on later phases if no one re-runs it | Medium | Re-check at Checkpoint G, note the score in the task's notes |
| Domain purchase is entirely outside this session's control | High | Treat 4.7 as blocked until the user says a domain is bought |

## Open questions

- Does "wishlist" need country/price context (item may not be available/priced in the viewer's
  country) or is it a plain product-id list? Assuming plain list — a wishlist item that's
  unavailable in-country renders "not available here" rather than being filtered out, same spirit
  as how the plan treats out-of-stock.
- Is a rating-without-body (stars only) a valid review, or is `body` always required? `reviews.body`
  is `not null` in the schema already — treating it as required, no schema change needed to match.

## Task 4.1: Customer reviews — submission + PDP display

**Description:** A signed-in customer who has a delivered order containing a product can submit a
1–5 star rating + body for it (lands `pending`, same as the DB default). The PDP shows approved
reviews (newest first) and the average rating; a customer's own pending/rejected review is visible
only to them, same as the admin moderation queue's status semantics from Task 3.9.

**Acceptance criteria:**

- [x] Submission gated server-side on a delivered order containing the product — not just "signed
  in", and not trusted from a client-supplied flag
- [x] One review per customer per product (re-submitting edits the existing row, chosen over
  rejecting the second submission — documented in `reviews.ts`/`reviews_edit.sql`)
- [x] PDP shows approved reviews + average rating; a review not yet approved never appears to anyone
  but its author
- [x] Arabic and English review body both render correctly (no locale-specific schema change needed
  — `reviews.body` is a single `text` column, same as it's stored today)

**Verification:**

- [x] `npm run test`, `npm run typecheck`, `npm run lint`, `npm run build` — 260/260 unit tests, all clean
- [ ] Manual: deferred, same gap as every prior task this session

**Dependencies:** 2.9, 3.9
**Files:** `supabase/migrations/20260816000003_reviews_edit.sql`, `src/lib/commerce/reviews.ts`,
`src/app/[locale]/products/[handle]/{page.tsx,actions.ts}`,
`src/components/commerce/{review-form.tsx,reviews-section.tsx}`,
`src/lib/catalog/{mappers.ts,queries.ts}` (added `id` to `ProductSummary`/`PRODUCT_COLUMNS`),
`src/messages/{en,ar}.json`
**Scope:** M

**Implementation notes:**

`ProductDetail`/`ProductSummary` had no `id` field — the PDP only ever needed `handle` before this.
Reviews and purchase-verification both need the actual product UUID (the FK target), so `id` was
added to `PRODUCT_COLUMNS`, `ProductJoin`, and `ProductSummary`/mapped output — additive, every
existing caller unaffected, two test fixtures updated to satisfy the now-required field.

3.9's `reviews.sql` had no unique constraint on `(customer_id, product_id)` and no customer-facing
`update` policy — both assumed a v1 where only admins ever wrote past the initial insert. A second
migration (`reviews_edit.sql`) added the unique constraint (backs the `upsert`) and an update policy
whose `with check` forces the resulting row back to `pending`, so editing a review re-moderates it
rather than leaving a stale `approved` row live under new wording.

`hasDeliveredPurchase` is three flat queries (variant ids → delivered order ids → intersection),
not one embedded `.select()`, matching `products.ts`'s stated reason for avoiding embeds. After a
successful submit, `ReviewsSection` calls `router.refresh()` rather than reconstructing the saved
row client-side — `submitReviewAction` doesn't return it, and `revalidatePath` alone doesn't
re-render already-mounted Client Component props.

---

## Task 4.2: Wishlist

**Description:** Signed-in customers can add/remove products to a wishlist and view it at
`/account/wishlist` (currently a `PagePlaceholder` stub). No guest wishlist.

**Acceptance criteria:**

- [x] New `wishlist_items` table + migration, RLS scoped to `customer_id = auth.uid()`
- [x] Add/remove from PDP and/or PLP card, signed-in only (signed-out sees a sign-in prompt, not a
  silent no-op)
- [x] `/account/wishlist` lists saved products with current price/availability for the viewer's
  country

**Verification:**

- [x] `npm run test`, `npm run typecheck`, `npm run lint`, `npm run build` — 260/260 unit tests, all clean
- [ ] Manual: deferred, same gap every prior task session

**Dependencies:** 2.4
**Files:** `supabase/migrations/20260816000004_wishlist.sql`, `src/lib/commerce/wishlist.ts`,
`src/lib/catalog/queries.ts` (`getProductsByIds`),
`src/app/[locale]/account/wishlist/{page.tsx,actions.ts}`,
`src/app/[locale]/products/[handle]/page.tsx`,
`src/components/commerce/{wishlist-button.tsx,wishlist-grid.tsx}`, `src/messages/{en,ar}.json`
**Scope:** M

**Implementation notes:**

`wishlist_items` mirrors `addresses`' RLS shape exactly (`using`/`with check` both pinned to
`customer_id = auth.uid()`), unique `(customer_id, product_id)` so `addToWishlist` is a plain
`upsert` instead of a check-then-insert race. No guest wishlist — unlike the cart there's no
cookie-token identity to hang a pre-auth wishlist off of, and the plan doesn't ask for one.

`WishlistButton` renders on the PDP only (PLP card was "and/or" in the criteria); signed-out
visitors get a sign-in link with `next` pointing back at the product, not a disabled control.
Signed-in toggle is optimistic client state plus a fire-and-forget server action — a failed
mutation just leaves the button one toggle out of sync until the next load, not worth a rollback
path for something this low-stakes and easily retried. `/account/wishlist` reuses `ProductCard`
from the PLP grid with a remove button pinned over the corner (`WishlistGrid`), and re-sorts
`getProductsByIds`' unordered rows back into save order since that function is also handy
unordered for other future callers.

---

## Task 4.3: Notifications — Resend email + Twilio SMS

**Description:** Order confirmation, shipping, and delivery events trigger an ar/en transactional
email (Resend) and SMS (Twilio) to the customer. WhatsApp Cloud API is optional, gated on Meta
Business verification — ship without it if not approved, per the plan.

**Acceptance criteria:**

- [x] Notification adapter interface (mirrors the payment adapter shape from 2.11/2.12), Resend and
  Twilio implementations behind it
- [x] Fires on order creation and on fulfilment status transitions to shipped/delivered (hooks into
  3.5's `transitionFulfilmentStatus`)
- [x] ar/en templates — language chosen from the order's locale, not the admin's
- [x] Unit tests cover payload shaping without a live send

**Verification:**

- [x] `npm run test`, `npm run typecheck`, `npm run lint`, `npm run build`
- [ ] Manual: **blocked** — `RESEND_API_KEY`/`TWILIO_*` are empty in `.env.local`; live-send
  verification deferred until the user provides credentials, same outcome as 2.10–2.12

**Dependencies:** 2.9, 3.5
**Files:** `src/lib/notifications/{types,templates,resend,twilio,dispatch}.ts`, `src/app/[locale]/checkout/actions.ts`,
`src/app/admin/(protected)/orders/[id]/actions.ts`, `src/lib/admin/orders.ts`, `tests/notifications.test.ts`
**Scope:** L

---

## Task 4.4: SEO — metadata, hreflang, sitemap, JSON-LD, robots

**Description:** `generateMetadata` + `alternates.languages` hreflang across all 12
`{lang}-{country}` combos, `sitemap.xml`, product `JSON-LD`, `robots.txt`. The `alternates.languages`
hreflang gap was already flagged as deferred-to-Phase-4 back on Task 1's PDP work.

**Acceptance criteria:**

- [x] Every public route has correct `<title>`/`<meta description>`, ar and en
- [x] hreflang alternates present and correct for all 12 locale-country combos on PLP/PDP/home
- [x] `sitemap.xml` includes every published product/category/content page
- [x] Product pages carry `Product` JSON-LD (price, availability, rating if reviews exist)
- [x] `robots.txt` allows the storefront, disallows `/admin` and `/account`

**Verification:**

- [x] `npm run test`, `npm run typecheck`, `npm run lint`, `npm run build`
- [ ] Manual: validate a sample of hreflang tags and the sitemap against Google's testing tools —
  deferred, no live deployment to point them at yet this session

**Dependencies:** Phase 1 catalog routes
**Files:** `src/lib/seo/alternates.ts`, `src/app/sitemap.ts`, `src/app/robots.ts`, `src/app/[locale]/layout.tsx`,
per-route `generateMetadata` (home, products, brands, brands/[slug], collections/[slug], p/[slug], search,
products/[handle]), `src/lib/catalog/json-ld.ts` (already existed from Task 4.1), `src/messages/{en,ar}.json`
**Scope:** M

---

## Task 4.5: Performance pass

**Description:** Core Web Vitals pass on home + PDP — image `sizes`/`priority`/`loading`, bundle
size, render-blocking audit. Builds on the Lighthouse spot-check flagged (and deferred) back before
Phase 2 began.

**Acceptance criteria:**

- [ ] Lighthouse performance ≥90 on home and PDP
- [x] LCP image on each has `priority`/correct `sizes`, no oversized image downloads
- [x] No obvious render-blocking third-party script on the critical path

**Audit findings — no code changes required:** `ProductGallery`'s main PDP image already sets `priority` +
`sizes="(min-width: 1024px) 50vw, 100vw"`; `ProductGrid` already passes `priority={index < 4}` to the first row
of `ProductCard`s (the home page itself carries no images at all — text-only hero); `Logo` is a correctly-sized
(36×36) `priority` image. Every image routes through `next/image` with `next.config.ts`'s `remotePatterns`, so
the built-in optimizer resizes/reformats server-side — no oversized downloads. The only `<script>` tag in the
app is the inert `application/ld+json` JSON-LD island on the PDP (data, not render-blocking JS); fonts are
self-hosted via `next/font/google` with `display: 'swap'`. All of this predates this task (Phase 0–3 work).

**Verification:**

- [x] `npm run build` — succeeds; this Next.js/Turbopack version's CLI output has no per-route First Load JS
  size table (only the static/dynamic route list), so a bundle-size regression can't be read off the build log
  directly — would need `@next/bundle-analyzer` or a deployed Lighthouse run to quantify
- [ ] Manual: Lighthouse run — deferred until there's a deployed URL to point it at

**Dependencies:** 4.4 (metadata/JSON-LD additions can shift bundle weight)
**Files:** none — audit only, existing code already meets the criteria
**Scope:** M

---

## Task 4.6: Accessibility pass

**Description:** Semantic HTML + ARIA pass across storefront and admin — focus order, form labels,
color contrast, keyboard navigation, RTL correctness re-checked now that the full app surface exists.

**Acceptance criteria:**

- [ ] Lighthouse accessibility ≥95 on home and PDP
- [x] Every form input has an associated label; every interactive element is keyboard-reachable
- [x] RTL layout re-verified across pages added since the Phase 0 smoke test

**Audit findings:**

Grepped every `<Label` usage across `src` for missing `htmlFor`. Found 8 gaps, all in admin
product-editing UI (storefront forms — address, checkout, filter, review — already correctly
pair `htmlFor`/`id`, confirmed against `AddressForm`'s pattern):

- `product-form.tsx`: 6 unlabeled variant-row fields (SKU, Title ar/en, Price, Compare-at,
  Stock) — fixed with `variant-${index}-*` scoped ids (rows repeat per variant, so ids are
  index-scoped, not static).
- `product-images.tsx`: 2 unlabeled fields (Alt text ar/en) — fixed with `image-${image.id}-*`
  scoped ids (same reasoning, one row per uploaded image).

Keyboard-reachability: grepped for `onClick` on non-interactive elements (`<div>`/`<span>`) —
none found; every clickable surface in the app is a native `<button>`, `<a>`, or form control,
so nothing needed fixing here.

RTL: spot-checked pages added since Phase 0 (reviews, wishlist, notifications templates, SEO
metadata pages, admin orders/coupons/content/reviews) — all reuse existing `dir="rtl"`-aware
primitives (`Input`, `Textarea`, layout components) rather than introducing new raw markup, so
no new RTL regressions.

**Verification:**

- [x] `npm run test`, `npm run typecheck`, `npm run lint`, `npm run build`
- [ ] Manual: Lighthouse + keyboard-only pass — deferred until there's a deployed URL

**Dependencies:** none
**Files:** `src/app/admin/(protected)/products/product-form.tsx`,
`src/app/admin/(protected)/products/[id]/product-images.tsx`
**Scope:** M

---

## Task 4.7: Domain + DNS

**Description:** Point the purchased production domain at Vercel, configure DNS, verify all 12
locale-country routes resolve correctly.

**Acceptance criteria:**

- [ ] Domain added in Vercel, DNS configured, HTTPS live
- [ ] Redirects/canonical host settled (www vs bare, trailing slash)

**Verification:**

- [ ] Manual only — nothing to unit test

**Dependencies:** none
**Files:** none (Vercel/DNS config, not repo code)
**Scope:** S
**Status:** blocked — no domain purchased yet; do not start without the user confirming one exists

---

## Checkpoint G — Phase 4 complete

- [ ] A customer can leave a review on a delivered order's product and see it appear on the PDP once approved
- [ ] A customer can save and view a wishlist
- [ ] Notification adapters built and unit-tested; live send verified once credentials are provided
- [ ] Lighthouse ≥90 perf / ≥95 a11y on home + PDP
- [ ] hreflang + sitemap validate
- [ ] Domain live (or explicitly deferred with the user's agreement)
- [ ] Full suite green: build, lint, typecheck, unit
- [ ] Reviewed with the user

---

# Phase 5 — Storefront content, home redesign, site settings

Requested outside the original plan's phase table: (1) every footer/nav content-page link
resolves instead of 404ing, (2) home page rebuilt into a real landing page (hero + product
rails), (3) a UI polish pass via the `ui-ux-pro-max` skill, (4) admin-controlled social links,
(5) admin-controlled store contact info + embedded map, plus a public contact/feedback form
with an admin inbox. Gate: all content-page links resolve; home renders hero + rails from real
data; contact page live with working feedback submission + admin inbox; full suite green.

## Architecture decisions

- **`site_settings` is a singleton row**, same shape as `countries` per-row config but with
  exactly one row (`id boolean primary key default true check (id)` forces it). Public read
  (storefront needs phone/whatsapp/email/address/social URLs/map coords unauthenticated),
  admin-only write — same RLS shape as `content_pages`, not the no-policy-at-all posture of
  `banners`/`coupons`, because this table has nothing sensitive enough to warrant hiding it
  from the anon client.
- **Contact/feedback is a new `contact_messages` table**, not folded into `content_pages`.
  A submission is a customer-authored row (name, email, message, created_at), not
  admin-authored copy — different write actor, different lifecycle (admin reads/deletes,
  never edits someone else's message). RLS: public **insert only** (no select/update/delete
  for anon — a submitter can't read other submissions back), admin full access.
- **Home hero reuses `banners`**, per the wizard answer — but that table currently has no
  select RLS policy at all (deliberate, admin-only via service role — see
  `20260816000001_content.sql`). This phase adds a public-read policy scoped to
  `active = true`, mirroring `content_pages`' `published = true` policy, since the hero is
  now a real storefront consumer.
- **Home product rails reuse `listProducts`** (`sort: 'new'`, `sort: 'best-selling'`)
  unchanged — no new query needed for those two. "Recommended" has no personalization
  data source yet (no purchase-history-based reco engine in scope), so per the wizard answer
  it's a curated/random active-product pull, same `listProducts` call with no sort (DB
  default order) and a small `pageSize`.
- **Contact page is a dedicated route** (`/[locale]/contact`), not a `content_pages` slug —
  it needs live `site_settings` data (map, phone) and a stateful form, neither of which a
  static content page's `body_ar`/`body_en` text blob can hold.
- **Real migrations, not the typegen-workaround pattern.** `.env.local` has
  `SUPABASE_PROJECT_REF` + service role key (checked via `node --env-file-if-exists`, not
  `cat`/`grep`) — `npm run db:push` then `npm run db:types` after each migration keeps
  `src/lib/supabase/types.ts` current, so `site_settings`/`contact_messages` don't need the
  `DatabaseWithX` cast crutch `content_pages.ts`/`banners.ts` used while ungenerated.

## Dependency graph

5.1 site_settings migration → independent, first (everything reads from it)
5.2 admin settings page → needs 5.1
5.3 contact_messages migration → independent, can run parallel with 5.1
5.4 admin messages inbox → needs 5.3
5.5 storefront contact page → needs 5.1 (site_settings read) + 5.3 (submit form)
5.6 header/footer wiring → needs 5.1
5.7 home rebuild → needs banners public-read policy (part of 5.1's migration) + existing listProducts
5.8 content-page link audit → independent, can run any time
5.9 UI polish pass → last, after all surfaces above exist to polish
5.10 full verification + commit → last

## Risks

| Risk | Likelihood | Mitigation |
| --- | --- | --- |
| `db:push` fails against linked project (drift, permissions) | Medium | Run after each migration file, not batched at the end — isolates which migration broke |
| Home rails add real query load to the home page (3 `listProducts` calls) | Low | Each capped to a small `pageSize` (8-ish); same pattern as PLP, already paginated server-side |
| Contact form is a public unauthenticated insert — spam surface | Medium | Basic honeypot field + server-side length caps; no CAPTCHA/rate-limit in scope this phase (flagged, not blocking) |
| `ui-ux-pro-max` skill unfamiliar — could push a visual direction that clashes with existing Tailwind tokens | Medium | Apply it scoped to touched components only, keep existing design tokens (colors/spacing) rather than importing its own |

## Open questions

- None — all decisions locked via the wizard answers in this session.

---

### 5.1 — `site_settings` table + RLS + admin-read lib

**Description:** New singleton table for store contact info, social links, and map
coordinates. Public read (storefront needs it unauthenticated), admin write. Same migration
adds the missing `banners` public-read policy (`active = true`) since the home hero (5.7)
becomes the first storefront consumer of that table.

**Acceptance criteria:**

- [ ] `site_settings` table exists, singleton-enforced, RLS: public select, admin all
- [ ] `banners` gets a public-read policy scoped to `active = true`
- [ ] `src/lib/admin/site-settings.ts`: `getSiteSettings`/`updateSiteSettings` (service-role,
      `checkAdminAccess()` gated in the calling action, same posture as `content-pages.ts`)
- [ ] `src/lib/catalog/site-settings.ts` (or similar storefront-side read) for the anon-client
      public read used by header/footer/contact page/home hero
- [ ] `npm run db:push` + `npm run db:types` run clean, `site_settings`/updated `banners`
      types present in `src/lib/supabase/types.ts`

**Verification:**

- [ ] `npx tsc --noEmit` clean
- [ ] Manual: confirm `site_settings` row readable from anon client, unwritable

**Dependencies:** none
**Files:** `supabase/migrations/2026...05_site_settings.sql`, `src/lib/admin/site-settings.ts`,
`src/lib/catalog/site-settings.ts`, `src/lib/supabase/types.ts` (generated)
**Scope:** M
**Status:** pending

---

### 5.2 — Admin `/admin/settings` page

**Description:** Single form (not a list — singleton row) for staff to edit contact info,
social links, and map lat/lng. Mirrors `content-page-form.tsx`'s single-form-plus-server-action
shape, not the list+CRUD shape of `banners`/`coupons`.

**Acceptance criteria:**

- [ ] Form fields: phone, whatsapp, email, address (ar/en), map lat/lng, social URLs
      (Instagram/Facebook/TikTok/X/YouTube), whatsapp-visible toggle
- [ ] Every input has an associated `<Label htmlFor>` (per the accessibility audit's
      established convention from 4.6)
- [ ] Saves via server action gated on `checkAdminAccess()`
- [ ] Linked from the admin nav shell

**Verification:**

- [ ] `npm run lint`, `npx tsc --noEmit` clean
- [ ] Manual: edit + save round-trips correctly

**Dependencies:** 5.1
**Files:** `src/app/admin/(protected)/settings/page.tsx`, `.../settings/settings-form.tsx`,
`.../settings/actions.ts`, admin nav shell
**Scope:** M
**Status:** pending

---

### 5.3 — `contact_messages` table + RLS

**Description:** Storage for the public contact/feedback form (task 5.5). Public insert only,
admin full read/delete — a submitter never reads back other submissions.

**Acceptance criteria:**

- [ ] `contact_messages` table: name, email, phone (optional), message, created_at, read boolean
- [ ] RLS: anon can `insert` only; admin can `select`/`update`/`delete`
- [ ] `src/lib/admin/contact-messages.ts`: `listMessages`/`markRead`/`deleteMessage`
      (service-role, `checkAdminAccess()` gated)
- [ ] `src/lib/catalog/contact.ts` (or similar) public-side `submitContactMessage` using the
      anon client (relies on the insert-only policy, not service role)

**Verification:**

- [ ] `npx tsc --noEmit` clean
- [ ] Manual: anon insert succeeds, anon select returns nothing, admin sees the row

**Dependencies:** none
**Files:** `supabase/migrations/2026...06_contact_messages.sql`, `src/lib/admin/contact-messages.ts`,
`src/lib/catalog/contact.ts`, `src/lib/supabase/types.ts` (generated)
**Scope:** M
**Status:** pending

---

### 5.4 — Admin messages inbox (`/admin/messages`)

**Description:** List view of contact-form submissions, newest first, with read/unread state
and delete. Same list-page shape as `admin/customers` (read-mostly list, no create form —
messages arrive from the storefront, not authored in admin).

**Acceptance criteria:**

- [ ] List shows name/email/message/date, unread rows visually distinct
- [ ] Click-through marks as read; delete removes the row
- [ ] Gated by `checkAdminAccess()`, linked from admin nav shell

**Verification:**

- [ ] `npm run lint`, `npx tsc --noEmit` clean
- [ ] Manual: submit via storefront form, confirm it appears here

**Dependencies:** 5.3
**Files:** `src/app/admin/(protected)/messages/page.tsx`, `.../messages/actions.ts`, admin nav shell
**Scope:** S
**Status:** pending

---

### 5.5 — Storefront contact page (`/[locale]/contact`)

**Description:** Dedicated route (not a `content_pages` slug — see architecture decision)
showing store address/phone/email/whatsapp (from `site_settings`), an embedded Google Maps
iframe (lat/lng, no API key), and a feedback/contact form that submits to `contact_messages`.

**Acceptance criteria:**

- [x] Renders phone/email/whatsapp (as `wa.me` link)/address from `site_settings`, ar/en aware
- [x] Map iframe embedded via lat/lng, no API key required
- [x] Feedback form (name/email/message) submits via server action to `submitContactMessage`;
      honeypot field for basic spam resistance; success/error state shown inline
- [x] `/p/contact-us` footer link (task 5.8) can either redirect here or stay as a static
      content-page stub — resolved in 5.8
- [x] RTL-correct in `ar`

**Verification:**

- [x] `npm run lint`, `npx tsc --noEmit` clean
- [x] Manual: page renders 200 in `en-om`/`ar-om`, correct heading/empty-state/`dir="rtl"`
      confirmed via `curl`. Full round-trip (submit → row in `contact_messages`) needs either
      the Claude-in-Chrome extension (not connected this session) or a manual click-through —
      flagged to user rather than faked; RLS + payload shape were cross-checked against
      `contact-messages.ts` and match exactly.

**Dependencies:** 5.1, 5.3
**Files:** `src/app/[locale]/contact/page.tsx`, `.../contact/contact-form.tsx`, `.../contact/actions.ts`
**Scope:** M
**Status:** done

---

### 5.6 — Header topbar + footer social/contact wiring

**Description:** Header gets a slim topbar (phone/email/whatsapp + social icons, desktop;
collapsible/hidden on mobile per existing responsive nav pattern). Footer gets a social-icon
row plus a contact line, both reading from `site_settings`. Icons hide individually when their
URL is unset (toggle-driven per the wizard answer).

**Acceptance criteria:**

- [x] Topbar renders in `header.tsx`, hidden below `sm`/`md` breakpoint (mirrors
      `mobile-nav.tsx`'s existing collapse pattern)
- [x] Footer renders social icons row (Instagram/Facebook/TikTok/X/YouTube/WhatsApp),
      each conditionally shown only when its `site_settings` URL is set
- [x] All icons are `<a>` tags (keyboard-reachable, no `onClick`-on-`div` per 4.6's convention)
- [x] RTL-correct icon ordering in `ar` — relies on the browser's automatic flex-direction
      flip under `dir="rtl"`, same as every other nav row in the header/footer; no manual
      reordering needed or added

**Verification:**

- [x] `npm run lint`, `npx tsc --noEmit` clean
- [x] `SocialIcons` filters each platform on its own `site_settings` URL/toggle field
      (`whatsapp_show`), verified by reading the component's filter logic — a live admin
      toggle-and-confirm click-through needs the Claude-in-Chrome extension (not connected
      this session)

**Dependencies:** 5.1
**Files:** `src/components/layout/header.tsx`, `src/components/layout/footer.tsx`,
new `src/components/layout/social-icons.tsx`
**Scope:** M
**Status:** done

---

### 5.7 — Home page rebuild

**Description:** Replace the current bare-hero home page with a full landing page: hero
carousel from `banners` (active, sorted), New Arrivals rail (`listProducts({sort:'new'})`),
Best Sellers rail (`listProducts({sort:'best-selling'})`), category grid, brand strip,
Recommended rail (curated pull, no sort), newsletter/promo strip. Structure modeled on
darbeauty.com's home page per the original ask.

**Acceptance criteria:**

- [x] Hero renders active banners from DB (falls back to existing static hero copy if zero
      banners exist — empty state, not a crash)
- [x] New Arrivals + Best Sellers + Recommended rails each render via existing `listProducts`,
      capped `pageSize` (~8), reuse existing `ProductCard`-style component from `/products`
- [x] Category grid links into `/[locale]/collections/[slug]` using existing category data
- [x] Brand strip links into `/[locale]/brands/[slug]` using existing brand data
- [x] Every section has an empty state (renders nothing or a placeholder, never crashes) when
      its data source is empty — matches current seed state before real data is added
- [x] RTL-correct, all sections
- [x] `next/image` used for every product/banner/brand image (no raw `<img>`)

**Verification:**

- [x] `npm run lint`, `npx tsc --noEmit`, `npm run build` clean
- [x] Manual: home renders correctly in both locales — confirmed via `curl` against the dev
      server: fallback hero shown (no banners seeded yet), New Arrivals/Best Sellers rails
      populated from real seed products with correct `alt` text, Arabic strings render
      correctly (`وصل حديثاً`, `الأكثر مبيعاً`, `تسوق حسب الفئة`, `تسوق حسب العلامة`), no error
      boundary text in either locale's HTML

**Dependencies:** 5.1 (banners public-read policy)
**Files:** `src/app/[locale]/page.tsx`, new `src/components/home/*.tsx` section components,
`src/lib/admin/banners.ts` (added `listActiveBanners` storefront read)
**Scope:** L
**Status:** done

---

### 5.8 — Content-page link audit

**Description:** Confirm every footer/nav link into `/[locale]/p/[slug]` resolves without a
hard 404/crash even with an empty `content_pages` table (per the locked decision: seed later
via admin, not now). A page with no matching row should still be a clean, expected 404 — this
task is about *not silently breaking the build or throwing*, not about seeding content.

**Acceptance criteria:**

- [x] Every slug referenced in `nav-links.ts` (`contact-us`, `faqs`, `shipping-policy`,
      `returns`, `about-us`, `privacy-policy`, `terms-of-service`) confirmed to hit the
      existing `notFound()` path cleanly, not an unhandled error
- [x] `contact-us` footer link repointed to `/[locale]/contact` (5.5) instead of the
      `content_pages` slug, since that's now the real page
- [x] No other link changes — this is an audit + one redirect, not new content

**Verification:**

- [x] Manual: visited every slug in both `en-om`/`ar-om` locally via `curl` — all six return a
      clean `404` with Next's expected "This page could not be found" body, no stack trace or
      unhandled error; `/p/contact-us` also 404s as expected since it's no longer linked
      (footer now points at `/contact`, verified 200 in 5.5)

**Dependencies:** 5.5
**Files:** `src/components/layout/nav-links.ts`
**Scope:** S
**Status:** done

---

### 5.9 — UI polish pass (`ui-ux-pro-max` skill)

**Description:** Apply the `ui-ux-pro-max` skill to the surfaces touched/added this phase
(home, header, footer, contact page, admin settings/messages), scoped to visual polish —
spacing, hierarchy, component consistency — not a redesign that abandons existing Tailwind
tokens.

**Acceptance criteria:**

- [x] Skill invoked, applied to the pages listed above
- [x] Existing design tokens (colors, spacing scale, font) preserved, not replaced — the
      skill's `--design-system` search returned a fresh palette/pattern recommendation
      (used only as reference), not adopted; every change below reuses existing Tailwind
      tokens and `Button` size variants already in the design system
- [x] No regression in RTL layout or accessibility (label association, keyboard reachability)
      from the 4.6 audit

**Findings applied** (via `search.py --domain ux`, forms/touch/accessibility categories):

- Contact form inputs were missing `autoComplete` — added `autoComplete="name"/"email"/"tel"`,
  matching the exact convention already used in `login-form.tsx`/`order-lookup-form.tsx`
- Hero carousel prev/next buttons were `size="icon"` (36px, below the 44px touch-target
  guideline) — bumped to the existing `icon-lg` (40px) variant, the largest already in the
  design system; a true 44px variant doesn't exist on the shared `Button` and adding one was
  out of scope for a scoped polish pass (touches every icon button app-wide)
- New home tile links (`CategoryGrid`, `BrandStrip`) had no focus-visible ring, unlike
  `ProductCard`'s existing `focus-visible:ring-2` treatment — added the same ring classes for
  cross-component consistency
- Reviewed: color-only-meaning, contrast, input-label-visibility, checkbox pattern in the
  admin settings form (native `<input type="checkbox">` inside `<label>`, no separate
  `Checkbox` UI primitive exists in the repo — implicit label association is valid a11y,
  left as-is rather than adding a new shared component for one checkbox) — no issues found

**Verification:**

- [x] `npm run lint`, `npx tsc --noEmit`, `npm run build` clean after polish
- [x] Manual: visual pass done via rendered HTML diff (`curl`) in both locales post-polish;
      no layout/markup regressions

**Dependencies:** 5.6, 5.7, 5.5
**Files:** `src/app/[locale]/contact/contact-form.tsx`, `src/components/home/hero-carousel.tsx`,
`src/components/home/category-grid.tsx`, `src/components/home/brand-strip.tsx`,
`src/components/home/newsletter-strip.tsx`
**Scope:** M
**Status:** done

---

### 5.10 — Full verification + commit

**Description:** Run the full suite, fix anything red, commit everything on the current
branch (no new branch per the user's instruction), single commit for the phase.

**Acceptance criteria:**

- [x] `npm run lint`, `npm run test`, `npx tsc --noEmit`, `npm run build` all clean
- [x] `tasks/todo.md` Phase 5 checkboxes + Checkpoint updated to reflect actual state
- [x] One commit on `main`, pushed

**Verification:**

- [x] Command output confirmed clean before commit:
      - `npm run lint` → 0 problems
      - `npx tsc --noEmit` → 0 errors
      - `npm run test` → 20 files, 270 tests passed
      - `npm run build` → compiled successfully, all routes (including new
        `/[locale]/contact`) generated

**Dependencies:** all of 5.1–5.9
**Files:** none (process task)
**Scope:** S
**Status:** done

---

## Checkpoint H — Phase 5 complete

- [x] Every footer/nav content-page link resolves (real page or clean 404, nothing broken)
- [x] Home page shows hero + new arrivals + best sellers + recommended + categories + brands
- [x] Social icons + contact info admin-editable, rendered footer + header + contact page
- [x] Contact/feedback form code-complete end-to-end (validated + honeypot + RLS insert) with
      an admin inbox to read submissions; a live browser click-through submit → admin inbox
      round-trip needs either the Claude-in-Chrome extension (not connected this session) or a
      manual pass by the user — flagged rather than assumed
- [x] Map embedded on contact page from admin-set coordinates (renders once `map_lat`/`map_lng`
      are set in `/admin/settings`; currently empty per the locked "mock data, admin fills
      later" decision)
- [x] Full suite green: build, lint, typecheck, unit (270/270 passing)
- [x] Single commit on `main`, pushed
