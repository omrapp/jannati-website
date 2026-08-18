'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';
import Image from 'next/image';
import { useState } from 'react';

import { Button } from '@/components/ui/button';

export type HeroSlide = { id: string; src: string; alt: string; link: string | null };

/**
 * One active slide at a time, swapped by index — no carousel library, just
 * `useState` + prev/next/dot controls. `link` is admin-authored free text
 * (see `BannerInput`), so it's a plain `<a>`, not the typed i18n `Link`,
 * same reasoning as the `tel:`/`mailto:` links in the header.
 */
export function HeroCarousel({ slides }: { slides: HeroSlide[] }) {
  const [index, setIndex] = useState(0);
  if (slides.length === 0) return null;

  const slide = slides[index];
  const go = (next: number) => setIndex((next + slides.length) % slides.length);

  const image = (
    <Image
      src={slide.src}
      alt={slide.alt}
      fill
      priority
      sizes="100vw"
      className="object-cover"
    />
  );

  return (
    <div className="bg-secondary/40 relative aspect-[16/9] w-full overflow-hidden rounded-lg sm:aspect-[21/8]">
      {slide.link ? (
        <a href={slide.link} className="absolute inset-0">
          {image}
        </a>
      ) : (
        image
      )}

      {slides.length > 1 && (
        <>
          <Button
            type="button"
            variant="secondary"
            size="icon-lg"
            className="absolute start-3 top-1/2 -translate-y-1/2"
            onClick={() => go(index - 1)}
            aria-label="Previous slide"
          >
            <ChevronLeft className="size-4" />
          </Button>
          <Button
            type="button"
            variant="secondary"
            size="icon-lg"
            className="absolute end-3 top-1/2 -translate-y-1/2"
            onClick={() => go(index + 1)}
            aria-label="Next slide"
          >
            <ChevronRight className="size-4" />
          </Button>

          <div className="absolute bottom-3 start-1/2 flex -translate-x-1/2 gap-1.5">
            {slides.map((s, i) => (
              <button
                key={s.id}
                type="button"
                onClick={() => setIndex(i)}
                aria-label={`Go to slide ${i + 1}`}
                aria-current={i === index}
                className={`size-2 rounded-full transition-colors ${i === index ? 'bg-primary' : 'bg-background/70'}`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
