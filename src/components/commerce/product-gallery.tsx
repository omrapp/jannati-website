'use client';

import { AnimatePresence, motion, useReducedMotion, type PanInfo } from 'motion/react';
import { useLocale, useTranslations } from 'next-intl';
import Image from 'next/image';
import { useState } from 'react';

import { parseLocale, textDirection, type Locale } from '@/i18n/config';
import type { ProductImage } from '@/lib/catalog/mappers';
import { DURATION, EASING, SPRING_SNAP } from '@/lib/motion-tokens';
import { cn } from '@/lib/utils';

/** Drag distance (px) past which a release counts as a swipe, not a tap. */
const SWIPE_THRESHOLD = 60;
/** Scale applied to the main image on tap-to-zoom. */
const ZOOM_SCALE = 1.9;

/**
 * Main image plus thumbnails. The thumbnail strip is a real list of buttons so
 * it is reachable by keyboard; ordering follows `position`, which the mapper
 * has already sorted.
 *
 * The main image supports swipe between photos on touch (direction-aware for
 * RTL — "next" always means "towards reading end") and tap-to-zoom. Zoom
 * scales the image inside its fixed-size frame rather than resizing the
 * frame itself, so nothing around the gallery ever jumps.
 */
export function ProductGallery({ images, name }: { images: ProductImage[]; name: string }) {
  const t = useTranslations('catalog');
  const locale = useLocale();
  const isRtl =
    textDirection(parseLocale(locale as Locale).language) === 'rtl';
  const reduceMotion = useReducedMotion();

  const [active, setActive] = useState(0);
  // +1 = advancing towards "next", -1 = towards "previous" — drives which
  // side the incoming/outgoing image slides in from.
  const [direction, setDirection] = useState(1);
  const [zoomed, setZoomed] = useState(false);

  const current = images[active];

  function jump(target: number) {
    setDirection(target > active ? 1 : -1);
    setActive(target);
    setZoomed(false);
  }

  function handleDragEnd(_: unknown, info: PanInfo) {
    if (zoomed || images.length <= 1) return;
    const offset = isRtl ? -info.offset.x : info.offset.x;
    if (offset < -SWIPE_THRESHOLD) jump((active + 1) % images.length);
    else if (offset > SWIPE_THRESHOLD) jump((active - 1 + images.length) % images.length);
  }

  const slideTransition = reduceMotion
    ? { duration: DURATION.instant }
    : { duration: DURATION.normal, ease: EASING.out };

  return (
    <div className="flex flex-col gap-4">
      <div className="bg-secondary/40 relative aspect-square overflow-hidden rounded-xl">
        {current ? (
          <AnimatePresence initial={false} custom={direction} mode="popLayout">
            <motion.div
              key={current.path}
              custom={direction}
              drag={!zoomed && images.length > 1 ? 'x' : false}
              dragConstraints={{ left: 0, right: 0 }}
              dragElastic={0.2}
              onDragEnd={handleDragEnd}
              onTap={() => setZoomed((z) => !z)}
              initial={
                reduceMotion
                  ? { opacity: 0 }
                  : { x: direction * (isRtl ? -1 : 1) * 40 + '%', opacity: 0 }
              }
              animate={{ x: 0, opacity: 1 }}
              exit={
                reduceMotion
                  ? { opacity: 0 }
                  : { x: direction * (isRtl ? -1 : 1) * -40 + '%', opacity: 0 }
              }
              transition={slideTransition}
              className={cn('absolute inset-0', zoomed ? 'cursor-zoom-out' : images.length > 1 ? 'cursor-grab active:cursor-grabbing' : 'cursor-zoom-in')}
            >
              <motion.div
                animate={{ scale: zoomed ? ZOOM_SCALE : 1 }}
                transition={reduceMotion ? { duration: DURATION.instant } : SPRING_SNAP}
                className="size-full"
              >
                <Image
                  src={current.url}
                  alt={current.alt ?? name}
                  fill
                  sizes="(min-width: 1024px) 50vw, 100vw"
                  priority
                  draggable={false}
                  className="pointer-events-none object-cover"
                />
              </motion.div>
            </motion.div>
          </AnimatePresence>
        ) : (
          <div className="text-muted-foreground flex h-full items-center justify-center text-sm">
            {t('noImage')}
          </div>
        )}
      </div>

      {images.length > 1 && (
        <ul className="flex flex-wrap gap-3">
          {images.map((image, index) => {
            const isActive = index === active;

            return (
              <li key={image.path}>
                <button
                  type="button"
                  onClick={() => jump(index)}
                  aria-label={t('viewImage', { number: index + 1 })}
                  aria-current={isActive}
                  className="focus-visible:ring-ring/50 relative size-16 overflow-hidden rounded-lg focus-visible:ring-2 focus-visible:outline-none"
                >
                  <Image src={image.url} alt="" fill sizes="64px" className="object-cover" />
                  {isActive && (
                    <motion.span
                      layoutId="gallery-thumbnail-highlight"
                      className="ring-primary pointer-events-none absolute inset-0 rounded-lg ring-2"
                      transition={reduceMotion ? { duration: DURATION.instant } : SPRING_SNAP}
                    />
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
