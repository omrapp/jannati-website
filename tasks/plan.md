# Jannati Beauty Shop — Implementation Plan

Full spec: `~/.claude/plans/ultrathink-plans-beauty-shop-website-md-curried-popcorn.md`
Source brief: `plans/beauty-shop-website.md`

## Stack

Next.js **16** (App Router) + React 19 + TypeScript · Tailwind v4 + shadcn/ui · next-intl (ar default, RTL) ·
next-themes · Supabase (Postgres + RLS + Auth + Storage) · Thawani / Tap / COD · Postgres FTS ·
Resend + Twilio (+ WhatsApp Cloud API, phase 4) · Vitest + Playwright · GitHub Actions → Vercel.

## Non-negotiables

- Money is **integer minor units**. OMR/KWD/BHD have **3 decimals**; AED/SAR/QAR have 2. No floats.
- Base price stored in OMR; other currencies derived via admin-editable FX table.
- VAT is **added at checkout** as a separate line (OM 5, AE 5, SA 15, BH 10, QA 0, KW 0).
- Logical CSS properties only (`ms-`/`me-`/`ps-`/`pe-`) so RTL works with no overrides.
- Server recomputes every price, discount and total. Client values are never trusted.
- `darbeauty.com/` is read-only reference. Never modified, never imported, never committed.
- **One hosted Supabase project, no local stack.** Development talks to the cloud database directly;
  Docker is not used. Migrations still live in `supabase/migrations/` and are applied with
  `npm run db:push` against the linked project, so schema stays reproducible and reviewable.

## Phases

| Phase | Scope                                                                            | Gate                                                                                         |
| ----- | -------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| 0 ✅  | Scaffold, tooling, i18n routing, theming, base layout, design tokens             | done — build, lint, typecheck, 6 unit + 6 E2E tests green                                    |
| 1     | Catalog schema + seed pipeline, money lib, PLP/PDP/brands/categories, FTS search | 1049 products live with images; Arabic search works; 6 currencies correct; money tests green |
| 2     | Auth, guest+user cart, checkout, VAT/shipping/coupons, Thawani/Tap/COD, orders   | E2E checkout passes both paths; webhooks idempotent                                          |
| 3     | `/admin` — catalog CRUD, orders, country settings, reviews moderation            | non-technical user creates a product and fulfils an order                                    |
| 4     | Reviews, wishlist, notifications, SEO/hreflang, perf, a11y, domain               | Lighthouse ≥90 perf / ≥95 a11y; order triggers ar/en email + SMS                             |

---

# Phase 1 — Catalog

## What the reference scrape actually gives us

Confirmed by inspection, this is what the extractor can rely on:

| Signal                | Where                                                             | Coverage        |
| --------------------- | ----------------------------------------------------------------- | --------------- |
| Name, brand, category | JSON-LD `Product` block on each product page                      | 1049 products   |
| Variants              | Embedded Shopify JSON: `id`, `sku`, `price.amount`, `image.src`   | all products    |
| Price currency        | `OMR`, 3 decimals (`"price":"6.400"`)                             | all             |
| Arabic description    | JSON-LD `description`                                             | ~all            |
| English description   | `en/products/*.html`                                              | **67 of 1049**  |
| Tags (ar + en)        | Shopify product JSON `tags[]`                                     | all             |
| Product type (ar)     | Shopify product JSON `type`                                       | most            |
| Brand list            | `pages/brands.html`                                               | 104 brands      |
| Category membership   | product handles listed on each `collections/*.html` (+ `?page=N`) | 373 collections |
| Images                | `cdn/shop/files/*.webp?v=…&width=N`                               | 8659 files      |

Consequences baked into the tasks below:

- **Brands vs categories:** the 373 collections are a mix. The 104 linked from `pages/brands.html` are
  brands; the remainder are categories. That page is the only reliable discriminator.
- **Images:** the same photo exists at many widths (`&width=200 … 1920`). The uploader keeps the widest
  variant per base filename and lets `next/image` handle resizing.
- **English gap:** 982 products need machine translation. That step costs API spend, so it is isolated
  in its own task and gated on the user's go-ahead.
- **No breadcrumbs:** category tree comes from the mega-menu links in `index.html`, with collection
  membership filled in from the collection pages.

## Architecture decisions

- **Seed pipeline is four separate scripts**, not one. `extract` (offline, no DB, no cost) →
  `translate` (costs money, cached to disk) → `images` (slow, network) → `load` (DB writes, idempotent
  upsert). Each is re-runnable alone; a failure in one never forces re-running the others.
- **`data/catalog.json` is the contract** between extraction and loading. It is gitignored, and it lets
  the extractor be unit-tested against a handful of fixture pages with no database at all.
- **Prices stay in OMR minor units in the database.** Conversion to the visitor's currency happens at
  read time from the `countries` row, so an FX edit in the admin instantly reprices the whole catalog
  without touching product rows.
- **Arabic full-text search uses the `simple` config plus `pg_trgm`**, not a language dictionary —
  Postgres ships no Arabic stemmer. Trigram similarity covers the misspellings a stemmer would have
  caught. If relevance proves poor with real queries, that is the trigger to reconsider Typesense.
- **Seeding runs against the shared cloud database.** With no throwaway local stack, a bad load is not
  fixed by `db reset` — so the loader upserts rather than truncates, every script takes `--dry-run`, and
  the extractor's output is reviewed at checkpoint A before anything is written.
- **Loader is idempotent** and keyed on the darbeauty handle, so re-seeding never duplicates rows and
  staff edits made in the admin are not clobbered by a later re-run (upsert of catalog fields only).

## Dependency graph

```
1.1 money lib ──────────────┐
                            ├──→ 1.7 data access ──→ 1.8 PLP ──→ 1.10 brands  ──→ 1.12 filters/sort ──→ 1.13 new/best
1.2 catalog schema ──┬──────┘                    └──→ 1.9 PDP
                     │
1.3 extractor ───────┼──→ 1.5 translate ──┐
                     │                    ├──→ 1.6 loader
                     └──→ 1.4 images ─────┘

1.2 + data ──→ 1.11 FTS search
```

Tasks 1.1 and 1.3 need no database — they are ordered first so work proceeds while the Supabase keys
are still outstanding, and so the riskiest unknown (does the scrape parse cleanly?) fails fast.

## Risks

| Risk                                                 | Impact | Mitigation                                                                                             |
| ---------------------------------------------------- | ------ | ------------------------------------------------------------------------------------------------------ |
| No local DB — dev writes to the shared cloud project | High   | Migrations only via `db:push`; loader upserts, never truncates; every seed script supports `--dry-run` |
| Supabase keys not yet supplied                       | High   | Start with the two DB-free tasks (1.1, 1.3); everything from 1.2 on waits on the keys                  |
| Postgres has no Arabic stemmer                       | Med    | `simple` config + `pg_trgm` similarity; measure with real Arabic queries at the 1.11 checkpoint        |
| Translation API spend on 982 products                | Med    | Isolated task, cached to disk, run once, cost estimated and approved before running                    |
| 422MB of images vs Supabase free tier (1GB)          | Med    | Upload only the widest variant per image; measure total after 1.4 and report before continuing         |
| Scrape parsing breaks on outlier pages               | Med    | Extractor reports per-product failures instead of aborting; a coverage summary must show ≥95% parsed   |
| Reusing darbeauty photography and copy               | Legal  | User accepted this explicitly; replace with brand-supplied assets before public launch                 |
| Category tree inferred, not authored                 | Low    | Tree lands in the DB and is editable in the admin in Phase 3; shop staff correct it there              |

## Open questions

1. Approve the translation spend before task 1.5 runs? (~982 products, one-off)
2. ~~Local vs hosted Supabase~~ — **settled: one hosted project, no Docker.** Remaining sub-question:
   one project for both dev and production, or a separate production project created before launch?
3. Enable all 6 countries on day one, or start with Oman + UAE and switch the rest on later?
4. Seed "best sellers" from darbeauty's `best-seller` collection, or start it empty and let real sales fill it?

---

# Phase 2 — Auth, Cart, Checkout

## Architecture decisions

- **Guest cart first, account cart second.** A cart is keyed by a signed `session_token` cookie
  regardless of login state; `customer_id` is nullable on `carts`. Login doesn't create a cart, it
  attaches one — the merge-on-login task folds the guest cart's lines into (or creates) the account's
  cart, then the cookie stops being read. This is the only design that makes guest checkout and
  logged-in checkout the same code path past the cart step.
- **Server recomputes every total, always.** `cart_items` stores only `variant_id` and `qty`. Price,
  VAT and shipping are looked up fresh from `product_variants` and `countries` on every read and, most
  importantly, again at order-creation time — a client-supplied total is never trusted, per the spec's
  non-negotiables. `order_items` then snapshots the resolved price so a later FX or VAT change never
  reprices a placed order.
- **VAT and shipping join the money lib as pure functions** (`vat.ts`, `shipping.ts`, `cart-totals.ts`),
  same shape as `1.1`'s FX/rounding code: integer minor units in, integer minor units out, unit tested
  without a database. This is the DB-free task and goes first, same reasoning as `1.1`/`1.3` in Phase 1.
- **Payment providers sit behind one interface** (`src/lib/payments/provider.ts`): `createPayment(order)
-> { redirectUrl }` and `handleWebhook(request) -> { orderId, status }`. COD is the trivial adapter
  (no redirect, no webhook, marks the order pending-on-delivery) and needs no external account, so it
  ships first and unblocks the entire checkout-to-order-confirmation path. Thawani and Tap are real
  adapters behind the same interface, added once sandbox credentials exist.
- **Auth ships in two slices.** Email/password uses Supabase Auth directly, no external app registration
  — unblocked today. Google, Facebook and phone OTP each need a developer app or a Twilio account the
  user hasn't supplied yet, so they're one task, ordered last, and the storefront works fully on
  email/password + guest checkout in the meantime.
- **Coupons validate server-side only**, at cart-totals time and again at order creation: code lookup,
  `active`/date-window/usage-limit/per-user-limit checks, `min_order_minor` against the pre-discount
  subtotal. No coupon logic in a component.

## Dependency graph

```
2.1 cart/order schema ──┬──→ 2.3 cart data layer ──→ 2.5 cart merge on login
2.2 vat/shipping/totals ┘         │                        │
                                   ├──→ 2.7 checkout flow ──┴──→ 2.9 payment iface + COD + order create
2.4 email/password auth ──────────┘         │
                                   2.6 addresses            │
                                             └──→ 2.8 coupons

2.9 ──→ 2.11 Thawani adapter
2.9 ──→ 2.12 Tap adapter
2.4 + accounts ──→ 2.10 OAuth + phone OTP
```

Tasks 2.1 and 2.2 need no live database access beyond the migration file itself — 2.2 is pure and unit
tested standalone, same as `1.1`. Everything from 2.3 on needs the schema applied, which — per the
project's standing rule — is the user's manual `db:push`, not something run automatically.

## Risks

| Risk                                                    | Impact | Mitigation                                                                                                                                 |
| ------------------------------------------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------ |
| Thawani / Tap sandbox credentials not yet supplied      | High   | Both adapters isolated behind the payment interface and ordered last; COD ships the full checkout path without them                        |
| Google/Meta OAuth apps, Twilio account not yet supplied | Med    | Email/password + guest checkout cover the full flow meanwhile; OAuth/OTP is one late, isolated task                                        |
| Client-supplied cart/coupon/total values                | High   | Every total recomputed server-side at checkout and again at order creation; never read from the client                                     |
| Webhook replay creating duplicate orders/payments       | High   | Webhook handlers upsert on the provider's payment reference, not insert; idempotency covered by unit tests before any live key is wired in |
| Guest cart merge losing or duplicating lines on login   | Med    | Merge logic unit tested against overlapping/disjoint/empty cart combinations before UI wiring                                              |

## Open questions

1. Thawani / Tap: Oman CR registered, sandbox credentials available? (blocks 2.11, 2.12)
2. Google Cloud + Meta developer apps for OAuth; Twilio account + GCC sender ID for phone OTP? (blocks 2.10)
3. Actual shipping rates and free-shipping thresholds per country — `countries.shipping_flat_minor` /
   `free_shipping_threshold_minor` currently hold Phase 1 placeholder values. Real figures needed before
   checkout totals are correct, not just structurally present.
4. Is the shop VAT-registered? A VAT number is needed on the order confirmation / invoice, not just the
   `vat_rate` column already in place.
