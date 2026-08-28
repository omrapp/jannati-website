'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';
import { AnimatePresence, motion, useReducedMotion, type PanInfo } from 'motion/react';
import { useLocale } from 'next-intl';
import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';

import { Button } from '@/components/ui/button';
import { parseLocale, textDirection } from '@/i18n/config';
import { DURATION, EASING } from '@/lib/motion-tokens';

export type HeroSlide = { id: string; src: string; alt: string; link: string | null };

const AUTOPLAY_MS = 6000;
/** Drag distance (px) past which a release counts as a swipe, not a tap. */
const SWIPE_THRESHOLD = 60;

/**
 * One active slide at a time, crossfaded/slid by `motion`. Autoplay is
 * decorative motion, not the primary way to browse — it pauses the moment a
 * shopper touches the carousel (drag, hover, focus) and never fights a
 * manual choice, per the brief's anti-reference on auto-playing carousels.
 * Swipe direction is RTL-aware: "next" always means "towards reading end",
 * which is a drag-left gesture in LTR and drag-right in RTL.
 */
export function HeroCarousel({ slides }: { slides: HeroSlide[] }) {
  const locale = useLocale();
  const isRtl = textDirection(parseLocale(locale as Parameters<typeof parseLocale>[0]).language) === 'rtl';
  const reduceMotion = useReducedMotion();

  const [index, setIndex] = useState(0);
  // +1 = advancing towards "next", -1 = towards "previous" — drives which
  // side the incoming/outgoing slide animates from.
  const [direction, setDirection] = useState(1);
  const [paused, setPaused] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const go = (nextDirection: number) => {
    setDirection(nextDirection);
    setIndex((current) => (current + nextDirection + slides.length) % slides.length);
  };

  const jump = (target: number) => {
    setDirection(target > index ? 1 : -1);
    setIndex(target);
  };

  useEffect(() => {
    if (paused || reduceMotion || slides.length <= 1) return;
    timeoutRef.current = setTimeout(() => go(1), AUTOPLAY_MS);
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, paused, reduceMotion, slides.length]);

  if (slides.length === 0) return null;

  const slide = slides[index];

  function handleDragEnd(_: unknown, info: PanInfo) {
    const offset = isRtl ? -info.offset.x : info.offset.x;
    if (offset < -SWIPE_THRESHOLD) go(1);
    else if (offset > SWIPE_THRESHOLD) go(-1);
  }

  const image = (
    <Image
      src={slide.src}
      alt={slide.alt}
      fill
      priority
      sizes="100vw"
      className="pointer-events-none object-cover"
      draggable={false}
    />
  );

  return (
    <div
      className="bg-secondary/40 relative aspect-[16/9] w-full overflow-hidden rounded-lg sm:aspect-[21/8]"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      <AnimatePresence initial={false} custom={direction} mode="popLayout">
        <motion.div
          key={slide.id}
          custom={direction}
          drag={slides.length > 1 ? 'x' : false}
          dragConstraints={{ left: 0, right: 0 }}
          dragElastic={0.2}
          onDragStart={() => setPaused(true)}
          onDragEnd={handleDragEnd}
          initial={reduceMotion ? { opacity: 0 } : { x: direction * (isRtl ? -1 : 1) * 60 + '%', opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={reduceMotion ? { opacity: 0 } : { x: direction * (isRtl ? -1 : 1) * -60 + '%', opacity: 0 }}
          transition={{ duration: reduceMotion ? DURATION.fast : DURATION.normal, ease: EASING.out }}
          className="absolute inset-0"
        >
          {slide.link ? (
            <a href={slide.link} className="absolute inset-0">
              {image}
            </a>
          ) : (
            image
          )}
        </motion.div>
      </AnimatePresence>

      {slides.length > 1 && (
        <>
          <Button
            type="button"
            variant="secondary"
            size="icon-lg"
            className="absolute start-3 top-1/2 z-10 -translate-y-1/2"
            onClick={() => go(-1)}
            aria-label="Previous slide"
          >
            <ChevronLeft className="size-4 rtl:rotate-180" />
          </Button>
          <Button
            type="button"
            variant="secondary"
            size="icon-lg"
            className="absolute end-3 top-1/2 z-10 -translate-y-1/2"
            onClick={() => go(1)}
            aria-label="Next slide"
          >
            <ChevronRight className="size-4 rtl:rotate-180" />
          </Button>

          <div className="absolute bottom-3 start-1/2 z-10 flex -translate-x-1/2 gap-1.5">
            {slides.map((s, i) => (
              <button
                key={s.id}
                type="button"
                onClick={() => jump(i)}
                aria-label={`Go to slide ${i + 1}`}
                aria-current={i === index}
                className={`focus-visible:ring-ring/50 size-2 rounded-full transition-colors focus-visible:ring-2 focus-visible:outline-none ${i === index ? 'bg-primary' : 'bg-background/70'}`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
