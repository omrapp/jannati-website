# Information Architecture: Jannati Storefront Redesign

## Site Map

- Home `/{locale}` — hero carousel, category grid, product rails, brand strip, newsletter
- Collections (all categories) `/{locale}/collections`
  - Collection detail `/{locale}/collections/[slug]` — filterable product grid for one category/subcategory
- Products (all products) `/{locale}/products` — filterable/sortable full catalog grid
  - Product detail `/{locale}/products/[handle]`
- Brands `/{locale}/brands`
  - Brand detail `/{locale}/brands/[slug]` — filterable product grid for one brand
- Search `/{locale}/search`
- Cart `/{locale}/cart`
- Checkout `/{locale}/checkout`
  - Confirmation `/{locale}/checkout/confirmation/[orderNumber]`
- Account `/{locale}/account`
  - Addresses `/{locale}/account/addresses`
  - Wishlist `/{locale}/account/wishlist`
- Auth `/{locale}/auth`
  - Login `/{locale}/auth/login`
  - Register `/{locale}/auth/register`
  - Reset password `/{locale}/auth/reset`
  - OAuth callback `/{locale}/auth/callback`
- Order lookup (guest) `/{locale}/order-lookup`
- Content pages (CMS-driven, `content_pages` table) `/{locale}/p/[slug]` — About, FAQs, Shipping Policy, Returns, Privacy, Terms
- Contact `/{locale}/contact`

## Navigation Model

- **Primary navigation (header)**: DB-driven category tree (top-level `categories` where `parent_id is null`), rendered as a mega menu on desktop (`lg`+). Fixed utility entries alongside the category tree: New Arrivals, Best Sellers, Brands. Max 7 visible top-level slots (existing categories + 3 fixed) before overflow into a "More" panel — keeps mega menu scannable.
- **Secondary navigation**: Within a category's mega-menu panel, its subcategories (`parent_id` children) render as a link list, optionally image-backed for subcategories that also have `image_path` set. Within collection/product/brand listing pages, the `FilterPanel` acts as in-page secondary nav (attributes, price, brand).
- **Utility navigation (header, top strip + icon row)**: search, wishlist, account, cart, locale switcher, country switcher, theme toggle, contact phone/email — unchanged from current structure, restyled only.
- **Mobile navigation**: `MobileNav` slide-in drawer, same category tree as desktop mega menu but as an accordion (tap category to expand subcategories in place, not a separate screen) — avoids an extra navigation depth on small screens.
- **Footer navigation**: unchanged 3-column structure (`footerShopNav`, `footerHelpNav`, `footerAboutNav`) — content unchanged, visual treatment refreshed only.

## Content Hierarchy

### Home
1. Hero carousel — seasonal/promotional, admin-authored, first thing seen
2. Category grid (now photo-led) — primary discovery entry point for a shopper with no fixed intent
3. Product rails (new arrivals / best sellers) — secondary discovery for a shopper ready to browse products directly
4. Brand strip — trust/recognition signal, lower intent
5. Newsletter strip — lowest priority, end-of-scroll capture

### Collection / Products / Brand listing
1. Applied filters + result count — orients the shopper immediately
2. Product grid — the core content, dominates the viewport
3. Sort control — secondary, top-of-grid
4. Pagination — below the fold, end of task

### Product Detail (PDP)
1. Gallery + name + price — above the fold, answers "is this the right product at the right price"
2. Variant picker (shade/size) — immediately actionable
3. Add to cart — primary CTA, always reachable (sticky on mobile scroll)
4. Description/details — secondary, expands below
5. Reviews — social proof, further down
6. Related products — lowest priority, end of page

## User Flows

### Category discovery → purchase
1. User lands on Home or opens mega menu/mobile drawer.
2. User sees photo-led category tiles or mega-menu panel with subcategories.
3. User taps/clicks a category:
   - If subcategories exist → lands on `/collections/[slug]` pre-filtered to that subcategory.
   - If no subcategories → lands on `/collections/[slug]` showing all products in that category.
4. User applies filters/sort in `FilterPanel` — grid updates in place (animated, no hard reload).
5. User taps a product card → PDP.
6. User selects variant, taps Add to Cart → cart drawer slides in with confirmation, item visible.
7. User continues shopping (closes drawer) or proceeds to `/checkout`.

### Search-led purchase
1. User taps search icon/field (header, all breakpoints).
2. User types query → `/search?q=...`.
3. Results render as the same product grid pattern as collections — consistent card, consistent motion.
4. Same PDP → cart flow as above.

### Guest checkout
1. User reaches `/cart` with items, taps Checkout.
2. `/checkout` — guest option presented alongside login, per locked payment decision (Thawani/Tap/COD).
3. On success → `/checkout/confirmation/[orderNumber]`.
4. Guest can later track the order via `/order-lookup` (no account needed).

## Naming Conventions

| Concept | Label in UI | Notes |
| --- | --- | --- |
| Top-level product grouping (`categories` where `parent_id is null`) | Category | Matches existing `nav.categories` i18n key |
| Nested grouping (`categories` with a `parent_id`) | Subcategory | New label, used only inside mega menu / mobile accordion |
| `/products` (unfiltered full catalog) | All Products | Keep existing `nav.products` label |
| `/collections/[slug]` | Category page | Internal name only; URL segment stays `collections` (existing, don't rename routes) |
| Desktop hover/click nav panel | Mega menu | Internal/design-doc term only, no user-facing label |
| Cart side panel | Cart drawer | Matches existing `CartDrawer` component name |

## Component Reuse Map

| Component | Used on | Behavior differences |
| --- | --- | --- |
| `Header` (+ new mega menu) | Every page | Mega menu only active `lg`+; collapses to `MobileNav` trigger below |
| `MobileNav` | Every page, `<lg` | Accordion category tree instead of current flat link list |
| `Footer` | Every page | None — same on all pages |
| `ProductGrid` + `ProductCard` | `/products`, `/collections/[slug]`, `/brands/[slug]`, `/search` | Identical component, different data source per page |
| `FilterPanel` | `/products`, `/collections/[slug]`, `/brands/[slug]` | Available facets differ (brand filter hidden on `/brands/[slug]`, category filter hidden on `/collections/[slug]`) |
| `CartDrawer` | Every page (header-triggered) | None |
| `Reveal` / `motion` scroll animations | Home rails, category grid, product grids | Stagger amount tuned per grid density, otherwise same pattern |

## Content Growth Plan

- **Categories/subcategories**: admin-managed, grows over time — mega menu and mobile accordion must handle an arbitrary category count gracefully (overflow "More" panel already planned above 7 top-level slots).
- **Products**: largest growth surface — `ProductGrid` already paginated (`Pagination` component); infinite scroll not in scope, keep pagination.
- **Brands**: grows slowly, `/brands` index page already paginated/listed, no IA change needed.
- **Content pages** (`/p/[slug]`): fixed set (About, FAQs, policies), admin-editable copy, not expected to grow in count.
- **Reviews**: grows per product, already has its own paginated section (`reviews-section.tsx`) on PDP — no IA change.

## URL Strategy

- Pattern: `/{locale}/{section}/{slug-or-handle}`, unchanged from current routing — this IA does not rename any routes.
- Dynamic segments: `[slug]` for collections/brands/content-pages, `[handle]` for products (existing convention, handles may be Arabic per locked schema decision), `[orderNumber]` for confirmation.
- Query parameters: `?sort=` (products/collections), `?q=` (search) — existing conventions, unchanged. Filter state (brand/price/attribute) also lives in query params so filtered views stay linkable/shareable — matches current `FilterPanel` behavior, no change needed.
