'use client';

import { useEffect, useRef, useState } from 'react';

import { cn } from '@/lib/utils';

/**
 * Reveals children with a subtle fade/slide-up once they scroll into view.
 * Matches darbeauty.com's own approach — a hand-rolled IntersectionObserver,
 * no animation library — but the reduced-motion guard is Tailwind's built-in
 * `motion-safe:` variant instead of a JS media-query check, so a user with
 * "prefers-reduced-motion" set simply never sees the transform/opacity
 * classes applied at all.
 */
export function Reveal({
  children,
  className,
  delay = 0,
}: {
  children: React.ReactNode;
  className?: string;
  /** Stagger delay in ms, for revealing a row of siblings in sequence. */
  delay?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    // Reveal once, then stop observing — re-triggering on scroll-back-up
    // reads as jittery rather than polished.
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.15 },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      style={delay ? { transitionDelay: `${delay}ms` } : undefined}
      className={cn(
        'motion-safe:transition motion-safe:duration-700 motion-safe:ease-out',
        visible
          ? 'motion-safe:translate-y-0 motion-safe:opacity-100'
          : 'motion-safe:translate-y-6 motion-safe:opacity-0',
        className,
      )}
    >
      {children}
    </div>
  );
}
