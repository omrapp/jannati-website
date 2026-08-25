'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * RAF-driven ease-out-cubic tween from the previous value to `value`. Same
 * hand-rolled, no-library convention as `src/components/ui/reveal.tsx`, but
 * `reveal.tsx`'s `motion-safe:` Tailwind variant only works for CSS
 * transitions — a numeric tween has no CSS-only equivalent, so this checks
 * `prefers-reduced-motion` directly via `matchMedia` and jumps straight to
 * the final number when it's set.
 */
export function useCountUp(value: number, durationMs = 900): number {
  const [display, setDisplay] = useState(value);
  const fromRef = useRef(value);

  useEffect(() => {
    if (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      fromRef.current = value;
      // `setDisplay` deferred to a callback (not called synchronously in the
      // effect body) per `react-hooks/set-state-in-effect` — a same-frame
      // rAF still reads as an instant jump to the reader.
      const raf = requestAnimationFrame(() => setDisplay(value));
      return () => cancelAnimationFrame(raf);
    }

    const from = fromRef.current;
    const delta = value - from;
    if (delta === 0) return;

    let raf = 0;
    const start = performance.now();

    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / durationMs);
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplay(from + delta * eased);

      if (t < 1) {
        raf = requestAnimationFrame(tick);
      } else {
        fromRef.current = value;
      }
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, durationMs]);

  return display;
}

/** Small presentational wrapper around `useCountUp` for headline metric cards. */
export function CountUpNumber({
  value,
  durationMs,
  formatter = (n) => Math.round(n).toLocaleString('en-US'),
  className,
}: {
  value: number;
  durationMs?: number;
  formatter?: (n: number) => string;
  className?: string;
}) {
  const display = useCountUp(value, durationMs);
  return <span className={className}>{formatter(display)}</span>;
}
