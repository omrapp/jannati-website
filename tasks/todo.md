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
