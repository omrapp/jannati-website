/**
 * Motion tokens for the `motion` (Framer Motion) library, kept numerically
 * identical to the `--duration-*`/`--easing-*` custom properties in
 * `src/app/globals.css` — a spring drawer and a CSS-transitioned hover
 * should feel like the same design system, not two different ones.
 *
 * `motion` durations are seconds, CSS custom properties are ms — convert
 * at the call site, don't duplicate the raw numbers.
 */

export const DURATION = {
  instant: 0.1,
  fast: 0.18,
  normal: 0.28,
  slow: 0.42,
} as const;

// Cubic-bezier arrays, same curves as --easing-* in globals.css.
export const EASING = {
  default: [0.4, 0, 0.2, 1],
  out: [0, 0, 0.2, 1],
  spring: [0.34, 1.56, 0.64, 1],
} as const;

/** Standard spring for drawers/sheets (cart, filter panel, mobile nav). */
export const SPRING_DRAWER = { type: 'spring', stiffness: 380, damping: 38 } as const;

/** Softer spring for in-place UI feedback (add-to-cart, variant select). */
export const SPRING_SNAP = { type: 'spring', stiffness: 500, damping: 30 } as const;

/**
 * Stagger delay (seconds) between siblings in a revealed grid/list.
 * Keep small — a 12-item product grid shouldn't take a full second to finish.
 */
export const STAGGER_CHILD = 0.04;
