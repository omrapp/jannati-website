# Design Tokens: Jannati Storefront Redesign

Philosophy: **editorial-clean beauty retail** (Glossier/Typology whitespace and restraint, with Fenty/Rare-Beauty-style boldness reserved for PDP/promotional moments) — see `DESIGN_BRIEF.md`.

Tokens already existed for color and radius (Tailwind v4, `@theme inline` in `src/app/globals.css`). This phase **extends** that file — it does not replace it — and adds what was missing: layout, shadow, and motion tokens. Full source of truth is `src/app/globals.css`; this doc explains the *why* and gives usage guidance the CSS file itself doesn't carry.

## Color — unchanged

Locked to the brand logo, per the design brief. No new tokens; the existing `--primary` (magenta), `--accent` (purple), `--secondary`/`--muted` (warmed neutrals), `--success`/`--destructive` pairs already cover every semantic need in the component inventory. Both light and dark palettes already exist in `globals.css`.

## Spacing — unchanged, used generously

No custom spacing scale added. Tailwind v4's default 4px-based scale (`space-1`…`space-96`) already gives the range needed; the "editorial/spacious" feel in the brief comes from **how** the scale is used — generous section padding (`py-16`/`py-24` on desktop, not `py-8`), wide gaps in grids, more breathing room around type — not from a different base unit. Introducing a parallel spacing token set would just be a second scale nobody references, since every existing component already uses Tailwind spacing utilities directly.

**Guidance for the build phase**: sections use `py-12 sm:py-16 lg:py-24`; card/grid gaps use `gap-4 sm:gap-6`; avoid anything tighter than `gap-3` in product grids (crowds the photography, works against the editorial goal).

## Typography — usage scale, not new CSS vars

Font families are already tokenized (`--font-latin` = Outfit, `--font-arabic` = Almarai, `--font-display` = Playfair Display, wired into `@theme` as `--font-sans`/`--font-display`). Tailwind v4 already ships a full `text-xs`…`text-9xl` scale with matching `leading-*`/`tracking-*` utilities — adding parallel `--font-size-*` custom properties would duplicate that scale rather than extend it. Instead, here is the semantic mapping the build phase should follow:

| Role | Classes | Notes |
| --- | --- | --- |
| Hero / display | `font-display text-4xl sm:text-6xl lg:text-7xl font-semibold tracking-tight` | Home hero, campaign banners. Arabic falls back to Almarai automatically via the existing `html[lang^='ar'] .font-display` rule. |
| Section heading (h2) | `font-display text-2xl sm:text-3xl font-semibold` | "New Arrivals", "Shop by Category", etc. |
| Subsection / card group (h3) | `text-lg sm:text-xl font-semibold` | PDP section titles, filter group labels. |
| Body | `text-sm sm:text-base leading-relaxed` | Descriptions, reviews. |
| UI label / meta | `text-xs sm:text-sm font-medium tracking-wide` | Badges, brand name over product title, form labels. |
| Price | `text-base sm:text-lg font-semibold` (existing `PriceDisplay` convention) | Keep current weight/size, just extend to new card layouts. |

Arabic body copy should stay at or above `text-sm` — Almarai reads smaller than Outfit at equal size.

## Layout — new tokens

```css
--max-width-page: 80rem;      /* 1280px — same as current hardcoded max-w-7xl */
--max-width-content: 65ch;    /* long-form copy: about/policy pages */
```

Wired into `@theme` as `--container-page`/`--container-content`, giving `max-w-page`/`max-w-content` utility classes. Replaces the `mx-auto max-w-7xl px-4` string repeated across `Header`, `Footer`, and every page shell with one class (`max-w-page`), and gives content/policy pages (`/p/[slug]`) a proper reading-width constraint they don't have today.

## Shadows — new tokens

```css
--shadow-sm / --shadow-md / --shadow-lg / --shadow-focus
```

Brand-tinted (magenta hue at low opacity) rather than neutral black — flat black shadows read as generic-template, a warm-tinted shadow reads as considered. Overrides Tailwind's default `shadow-sm/md/lg` scale directly via `@theme`, so existing `shadow-*` utility usage anywhere in the codebase picks these up automatically, no class renames needed. Dark mode gets its own deeper/more-transparent values (`globals.css` `.dark` block) rather than reusing the light-mode tint, per the skill's dark-mode guidance — a light shadow's opacity reads as a grey haze on a dark card.

`--shadow-focus` exists for components that want a soft glow instead of the hard `ring-2` used today (e.g., product card hover-focus) — `ring-*` utilities remain the default for form controls/accessibility-critical focus states, this is for decorative emphasis only.

## Motion — new tokens

```css
--duration-instant: 100ms;   --easing-default: cubic-bezier(0.4, 0, 0.2, 1);
--duration-fast: 180ms;      --easing-out: cubic-bezier(0, 0, 0.2, 1);
--duration-normal: 280ms;    --easing-spring: cubic-bezier(0.34, 1.56, 0.64, 1);
--duration-slow: 420ms;
```

Wired into `@theme` as `--duration-*`/`--ease-*`, giving `duration-fast`/`ease-spring` etc. as Tailwind utilities for CSS-only transitions (hover states, simple fades).

For anything built with the `motion` library (drawers, staggered grids, gesture interactions — see brief's Key Interactions), use `src/lib/motion-tokens.ts` instead of hand-writing spring values inline. It exports the same curves as JS constants (`DURATION`, `EASING`) plus two named springs (`SPRING_DRAWER` for cart/filter/mobile-nav panels, `SPRING_SNAP` for in-place feedback like add-to-cart or variant selection) and a `STAGGER_CHILD` constant for grid reveals. One file, one set of numbers — CSS and `motion` should never drift out of sync.

**Reduced motion**: every `motion`-built component must check `useReducedMotion()` (from the `motion` package) and fall back to instant/opacity-only transitions, matching the `motion-safe:` convention `Reveal` already uses for its CSS-only animations.

## Responsive Breakpoints — unchanged

Tailwind v4 defaults (`sm` 640px / `md` 768px / `lg` 1024px / `xl` 1280px / `2xl` 1536px) are unchanged and already match the brief's mobile-first requirement — the mega menu's `lg`+ cutoff (Information Architecture doc) uses this default scale.

## Files touched this phase

- `src/app/globals.css` — added layout, shadow, and motion custom properties (light + dark), wired into `@theme inline`.
- `src/lib/motion-tokens.ts` — new file, JS-side mirror of the motion tokens for the `motion` library.
