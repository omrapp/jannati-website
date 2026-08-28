# Build Tasks: Jannati Storefront Redesign

Generated from: `.design/storefront-redesign/DESIGN_BRIEF.md`, `INFORMATION_ARCHITECTURE.md`, `DESIGN_TOKENS.md`
Date: 2026-08-26

Philosophy: editorial-clean beauty retail (Glossier/Typology whitespace, Fenty/Rare-Beauty boldness on PDP/promo moments) — establish this immediately in Task 4 (Home hero/category grid), since it's the first thing a shopper and the user both see.

## Foundation

- [x] **Design tokens**: layout (`max-w-page`/`max-w-content`), shadow (`shadow-sm/md/lg`, brand-tinted), and motion (`duration-*`/`ease-*`) tokens added to `src/app/globals.css`, both light and dark. _Done this session._
- [x] **Motion token mirror**: `src/lib/motion-tokens.ts` — `DURATION`, `EASING`, `SPRING_DRAWER`, `SPRING_SNAP`, `STAGGER_CHILD` for the `motion` library. _Done this session._
- [x] **Install `motion`**: `npm install motion`. Confirm it tree-shakes cleanly with Next 16 App Router (client components only — server components stay motion-free). _New dependency. Done this session._
- [x] **Category images data path**: add `imagePath`/`image` to `CategorySummary` in `src/lib/catalog/mappers.ts` (column `categories.image_path` already exists, just unwired); add one upload field to `src/app/admin/(protected)/categories/category-form.tsx`. Plumbing only — no admin visual redesign. _Modifies: mappers.ts, category-form.tsx._ Blocks: Header mega menu, CategoryGrid. _Done this session._

## Core UI

- [x] **Header + desktop mega menu**: restyle `Header`, build new mega-menu panel sourcing the live category tree (`parent_id` hierarchy) with subcategory links + images, fixed utility slots (New Arrivals/Best Sellers/Brands), overflow "More" past 7 top-level slots. _New: mega-menu component. Modifies: header.tsx. Depends on: category images task. Done via sub-agent, commit 9d2598c._
- [x] **Mobile nav accordion**: restyle `MobileNav` drawer — same category tree as an expand-in-place accordion, not a second screen. _Modifies: mobile-nav.tsx. Depends on: category images task. Done via sub-agent, commit 9d2598c._
- [x] **Hero carousel motion**: `motion`-driven slide transitions, swipe/drag on touch, autoplay pauses on interaction, `useReducedMotion()` fallback. _Modifies: hero-carousel.tsx. Reuses: motion-tokens.ts (SPRING_DRAWER-scale transition). Done via sub-agent, commit 9e60eee._
- [x] ~~**Category grid, photo-led**~~: built (commit 9e60eee), then **removed from Home entirely** per follow-up request — the mega menu now covers category discovery, a duplicate grid on Home added no value. `category-grid.tsx` kept (unused by Home) in case another surface wants it later.
- [x] **Product card elevation**: hover lift/scale, quick-add affordance, wishlist icon micro-interaction. _Modifies: product-card.tsx. Done via sub-agent, commit 9e60eee._
- [x] **Product grid stagger reveal**: wire `motion` stagger (via `STAGGER_CHILD`) into grid mount and into filter/sort re-renders. _Modifies: product-grid.tsx. Depends on: product card elevation. Done via sub-agent, commit 9e60eee._
- [x] **Product rail (Home)**: bring `ProductRail` into the new visual system, scroll-reveal on entry. _Modifies: product-rail.tsx. Reuses: product-card.tsx, product-grid.tsx patterns. Done via sub-agent, commit 9e60eee._
- [x] **Brand strip & newsletter strip**: visual refresh to match new type/shadow tokens, scroll-reveal entry. _Modifies: brand-strip.tsx, newsletter-strip.tsx. Done via sub-agent, commit 9e60eee._
- [x] **Footer restyle**: apply new tokens (`max-w-page`, refreshed spacing/type), no structural or content change. _Modifies: footer.tsx. Done via sub-agent, commit 9e60eee._

## Interactions & States

- [x] **Cart drawer motion**: spring slide-in/out (`SPRING_DRAWER`), line-item add/remove transitions, empty-state treatment. Covers: open, close, item added, item removed, empty cart. _Modifies: cart-drawer.tsx, cart-line-item.tsx. Done via sub-agent, commit d8f50d8._
- [x] **Add-to-cart confirmation**: button state change + header cart-icon feedback on add, coordinated with drawer open. Covers: default, loading/pending, success, out-of-stock. _Modifies: product-card.tsx (quick-add), PDP add-to-cart control, header.tsx (cart icon)._ _Done this session — also wired the underlying add-to-cart mutation itself, which turned out to not exist yet._
- [x] **Variant picker feedback**: selected-state animation on shade/size choice, gallery image swap with no layout jump. Covers: default, selected, unavailable/out-of-stock variant. _Modifies: variant-picker.tsx. Done via sub-agent, commit d8f50d8._
- [x] **Product gallery motion**: smoother zoom/swipe, thumbnail transition on selection. Covers: swipe (touch), thumbnail click, zoom. _Modifies: product-gallery.tsx. Done via sub-agent, commit d8f50d8._
- [x] **Filter panel motion**: animated expand/collapse, active-filter chip feedback, animated grid transition on filter apply. Covers: open, close, filter applied, filter cleared, empty results. _Modifies: filter-panel.tsx. Done via sub-agent, commit d8f50d8._

## Responsive & Polish

- [ ] **Mobile-first pass**: verify every task above at 375px/390px first — tap targets ≥44px, mega menu correctly hidden below `lg`, drawer/accordion nav usable one-handed. Breakpoints: 375px, 640px, 768px, 1024px, 1280px. _Needs a real browser — not done, left for manual QA._
- [ ] **Dark mode pass**: verify new shadow/motion tokens and every restyled component against `.dark` overrides — brand-tinted shadows must not read as murky on dark cards. _Needs a real browser — not done, left for manual QA._
- [ ] **RTL pass**: verify mega menu, mobile accordion, cart drawer, carousel, filter panel all mirror correctly in Arabic locale using logical properties (`start`/`end`) — no visual regressions introduced by new motion/layout code. _Static grep pass done this session (no hardcoded left-/right-/ml-/mr- classes found); actual RTL rendering still needs a real browser._
- [ ] **Accessibility pass**: WCAG AA contrast on all new/refined color pairings (light + dark); full keyboard nav for mega menu, filter panel, cart drawer, carousel controls; every `motion` usage gated behind `useReducedMotion()`; focus-visible states intact everywhere restyled. _Static pass done this session (useReducedMotion coverage confirmed, drawer close buttons were missing translated labels — fixed); contrast/keyboard-nav/focus-visible still need a real browser._

## Follow-up Requests (2026-08-28)

- [ ] **Remove Category section from Home**: the mega menu now covers category discovery — drop the `CategoryGrid` section from `[locale]/page.tsx`. _Modifies: src/app/[locale]/page.tsx. Leaves category-grid.tsx in place, unused._
- [ ] **Arabic locale sync**: audit `src/messages/en.json` vs `ar.json` for any keys added during this redesign that are missing an Arabic translation.
- [ ] **FAQ / shipping / returns pages, Q&A redesign**: restyle as an accordion-style Q&A layout, larger/more readable type, referencing sooqwoow.com's pattern. _Modifies: whichever content pages back these three routes._

## Review

- [ ] **Design review**: run `/design-review` against `DESIGN_BRIEF.md` once the above is built.
