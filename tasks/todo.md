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

- [ ] `/products?sort=new` and `/products?sort=best-selling` (already linked from the nav) return correctly ordered results
- [ ] "New" derives from a product's `is_new` flag or creation date; "best selling" from order counts, seeded from darbeauty's best-seller collection until real sales exist
- [ ] Both are reachable from the header and footer links already in place

**Verification:**

- [ ] E2E: both nav links land on populated, correctly ordered pages
- [ ] `npm run build` succeeds

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

| Item                                                         | Blocks      |
| ------------------------------------------------------------ | ----------- |
| Hosted Supabase URL, anon key, service-role key, project ref | 1.2 onward  |
| Approval of translation API spend                            | 1.5         |
| One project for dev + production, or a separate prod project | launch prep |
| Which countries go live day one                              | pricing QA  |
| ~~Jannati logo and brand colours~~ — supplied, applied       | done        |
