'use client';

import Image from 'next/image';
import { useState } from 'react';
import { useTranslations } from 'next-intl';

import type { ProductImage } from '@/lib/catalog/mappers';
import { cn } from '@/lib/utils';

/**
 * Main image plus thumbnails. The thumbnail strip is a real list of buttons so
 * it is reachable by keyboard; ordering follows `position`, which the mapper
 * has already sorted.
 */
export function ProductGallery({ images, name }: { images: ProductImage[]; name: string }) {
  const t = useTranslations('catalog');
  const [active, setActive] = useState(0);
  const current = images[active];

  return (
    <div className="flex flex-col gap-4">
      <div className="bg-secondary/40 relative aspect-square overflow-hidden rounded-xl">
        {current ? (
          <Image
            src={current.url}
            alt={current.alt ?? name}
            fill
            sizes="(min-width: 1024px) 50vw, 100vw"
            priority
            className="object-cover"
          />
        ) : (
          <div className="text-muted-foreground flex h-full items-center justify-center text-sm">
            {t('noImage')}
          </div>
        )}
      </div>

      {images.length > 1 && (
        <ul className="flex flex-wrap gap-3">
          {images.map((image, index) => (
            <li key={image.path}>
              <button
                type="button"
                onClick={() => setActive(index)}
                aria-label={t('viewImage', { number: index + 1 })}
                aria-current={index === active}
                className={cn(
                  'focus-visible:ring-ring/50 relative size-16 overflow-hidden rounded-lg border focus-visible:ring-2 focus-visible:outline-none',
                  index === active ? 'border-primary' : 'border-transparent',
                )}
              >
                <Image src={image.url} alt="" fill sizes="64px" className="object-cover" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
