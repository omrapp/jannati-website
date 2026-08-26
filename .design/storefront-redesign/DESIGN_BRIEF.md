# Design Brief: Jannati Storefront Redesign

## Problem

Shoppers in the GCC (Oman, UAE, KSA, Kuwait, Qatar, Bahrain) browsing for beauty and skincare products land on a site that works functionally but reads as a generic template — flat text-only category tiles, no motion, no visual hierarchy that signals "this is a real, trustworthy beauty retailer." On mobile, where most Gulf ecommerce traffic happens, the experience feels static and doesn't build the confidence a shopper needs before entering payment details on a store they haven't bought from before.

## Solution

A storefront that feels like a modern Shopify-grade beauty shop: photo-led category and product discovery, tactile micro-interactions (hover states, add-to-cart feedback, staggered grid reveals, smooth cart drawer), and an editorial sense of whitespace and type hierarchy — all built mobile-first, RTL-correct for Arabic (the default locale), and fast enough that motion never costs a shopper their patience on a mid-range phone over Gulf mobile networks.

## Experience Principles

1. **Trust through polish, not decoration** — every animation earns its place by giving feedback (item added, page loading, selection changed), not spinning for its own sake. A shopper about to pay with real money reads restraint as competence.
2. **Mobile is the design, not the fallback** — layouts, tap targets, and motion are authored for a one-handed phone shopper first; desktop is the enhanced view, not the primary one.
3. **RTL is a first-class layout, not a mirror pass** — Arabic is the default locale. Every new interaction (mega menu, drawers, carousels, hover reveals) is designed direction-aware from the start using logical properties (`start`/`end`), not retrofitted.

## Aesthetic Direction

- **Philosophy**: Editorial-clean beauty retail — soft whitespace and restrained type (Glossier / Typology) carrying the day-to-day browsing, with bolder, saturated moments on product detail and promotional surfaces (Fenty Beauty / Rare Beauty) where the product itself is the hero.
- **Tone**: Premium, warm, confident — not clinical, not loud. Feminine without being saccharine.
- **Reference points**: Glossier, Typology, Fenty Beauty, Rare Beauty, Sephora GCC. Current darbeauty.com content/copy is the source catalog, not the design reference.
- **Anti-references**: Generic Shopify starter theme look, dense marketplace grids (Amazon/Noon-style clutter), heavy-handed animation that delays interaction (long page transitions, auto-playing carousels that fight the user).

## Existing Patterns

- **Typography**: `Outfit` (Latin body/UI), `Almarai` (Arabic body/UI), `Playfair Display` (Latin display/headings only — Arabic headings fall back to Almarai). Loaded via `next/font/google` in `src/app/[locale]/layout.tsx`.
- **Colors**: OKLCH tokens in `src/app/globals.css` — primary magenta `oklch(0.604 0.227 354.7)` (~`#df2789`), accent purple `oklch(0.519 0.121 303.1)` (~`#7755a1`), full light/dark pairs already defined. Locked hues — do not change; Design Tokens phase refines scale/contrast/spacing around them, not the hues themselves.
- **Spacing/radius**: `--radius: 0.75rem` base, standard Tailwind spacing scale, no custom spacing tokens yet.
- **Components**: shadcn-derived `ui/` primitives (`button`, `badge`, `input`, `sheet`, `dropdown-menu`, `checkbox`, `label`, `separator`, `textarea`), plus a hand-rolled `Reveal` (IntersectionObserver fade/slide-up, `motion-safe:` gated). Commerce components (`product-card`, `product-grid`, `product-gallery`, `variant-picker`, `cart-drawer`, `cart-line-item`, `filter-panel`, `wishlist-*`) and home components (`hero-carousel`, `category-grid`, `product-rail`, `brand-strip`, `newsletter-strip`) are all functional but visually plain — no motion library, text-only category tiles, simple link-list nav.
- **i18n/RTL**: `[locale]` routing, 12 `{lang}-{country}` locales, Arabic default, `textDirection`/`htmlLang` helpers in `src/i18n/config.ts`. Existing components already use logical properties (`start-*`, `end-*`, `ps-*`) — continue this convention for every new component.
- **Dark mode**: fully implemented via `ThemeProvider` + `theme-toggle.tsx`, `.dark` token overrides in `globals.css`. Must remain supported end-to-end.

## Component Inventory

| Component | Status | Notes |
| --- | --- | --- |
| `motion` (npm package) | New dependency | Framer Motion successor — spring/stagger/layout animations, gesture support |
| `Reveal` | Modify | Keep for simple scroll-fades; complex sequences (grids, PDP) move to `motion` |
| `HeroCarousel` | Modify | Add slide transition motion, drag/swipe gesture, autoplay-with-pause-on-interaction |
| `CategoryGrid` | Modify | Photo tiles instead of text-only — `categories.image_path` column already exists in schema (unused); needs `CategorySummary` mapper update + minimal admin upload field on `category-form.tsx` |
| Mega menu (nav) | New | Desktop hover dropdown panels with subcategory links + images; `categories.parent_id` hierarchy already exists in schema, no new relation needed |
| `Header` | Modify | Host the new mega menu; restyle sticky/blur states |
| `MobileNav` | Modify | Restyle to match new nav hierarchy, add motion for open/close |
| `ProductCard` | Modify | Elevate hover state, add quick-add/wishlist micro-interactions |
| `ProductGrid` | Modify | Staggered reveal via `motion` on scroll/filter change |
| `ProductGallery` | Modify | Smoother zoom/swipe, thumbnail transitions |
| `VariantPicker` | Modify | Selection feedback animation |
| `CartDrawer` | Modify | Slide-in spring motion, line-item add/remove transitions |
| `FilterPanel` | Modify | Animated expand/collapse, active-filter feedback |
| `BrandStrip`, `ProductRail`, `NewsletterStrip` | Modify | Bring into new visual system, add scroll-reveal/stagger |
| `Footer` | Modify | Restyle to match new visual system |
| `Badge`, `Button`, `Input`, etc. (`ui/`) | Modify (light touch) | Keep shadcn contracts, refresh visual finish per new tokens |
| Admin dashboard | Out of scope | Excluded per explicit decision |

## Key Interactions

- **Category browsing**: hovering (desktop) or tapping (mobile) a category/mega-menu item shows an image-backed preview; grid tiles reveal with a subtle stagger as they scroll into view.
- **Product grid → PDP**: product cards lift/scale slightly on hover with a quick-add affordance; navigating to PDP feels continuous, not a hard reload flash.
- **Add to cart**: clicking add-to-cart gives immediate visual confirmation (button state change + cart icon feedback) before/while the drawer opens; the drawer slides in with spring easing, new line item animates in.
- **Variant selection**: choosing a color/size swaps the gallery image and gives a clear selected-state animation, no layout jump.
- **Filters**: opening the filter panel animates open/closed; applying a filter animates the grid to its new state rather than hard-refreshing.
- **Hero carousel**: slides transition smoothly, support swipe/drag on touch, pause autoplay on user interaction, respect `prefers-reduced-motion`.

## Responsive Behavior

- Mobile-first: single-column product grid (2-up minimum per current `ProductCard` sizing convention) scaling to 3–4 columns at `md`/`lg`.
- Mega menu only applies at desktop breakpoints (`lg`+); mobile keeps a drawer-based nav (`MobileNav`), restyled but same interaction pattern (slide-in panel, not dropdown).
- Cart drawer is full-height slide-in on mobile, fixed-width panel on desktop — pattern already exists, refine motion only.
- Hero carousel aspect ratio already responsive (`aspect-[16/9]` mobile → `aspect-[21/8]` desktop) — keep, refine transition only.

## Accessibility Requirements

- WCAG AA contrast for all new/refined color pairings, including on the refreshed dark theme.
- All motion gated behind `motion-safe:`/`prefers-reduced-motion` checks — no exceptions, including anything built with `motion`.
- Full keyboard navigation for mega menu, filter panel, cart drawer, carousel controls; visible focus states matching current `focus-visible:ring` convention.
- Maintain existing alt-text and `aria-label`/`aria-current` patterns already present in `HeroCarousel`, `ProductCard`, etc. — extend, don't drop, when modifying these components.

## Out of Scope

- Admin dashboard UI (explicitly excluded) — one exception: a single functional image-upload field added to the existing `category-form.tsx` to populate `categories.image_path`. Plumbing only, no visual redesign of the admin shell.
- Checkout payment integration logic (Thawani/Tap/COD) — visual/motion polish of checkout UI only, no functional changes to payment flow.
- New product/category data beyond the `categories.image_url` schema addition — no content strategy or copywriting changes.
- Subcategory *data modeling* — `parent_id` hierarchy already exists, this brief only adds the *visual* mega-menu surface for it.
- Performance infrastructure changes (CDN, image pipeline) beyond choosing motion patterns that don't regress Core Web Vitals.
