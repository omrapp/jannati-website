import Image from 'next/image';

import { Link } from '@/i18n/navigation';
import type { BrandSummary } from '@/lib/catalog/mappers';

/** Logo when the brand has one, name text otherwise — mirrors `ProductCard`'s
 * image-or-fallback treatment. Renders nothing when the catalog has no brands yet. */
export function BrandStrip({
  heading,
  viewAllHref,
  viewAllLabel,
  brands,
}: {
  heading: string;
  viewAllHref: string;
  viewAllLabel: string;
  brands: BrandSummary[];
}) {
  if (brands.length === 0) return null;

  return (
    <section className="flex flex-col gap-4">
      <div className="flex items-baseline justify-between">
        <h2 className="font-display text-xl font-semibold sm:text-2xl">{heading}</h2>
        <Link href={viewAllHref} className="text-primary text-sm font-medium hover:underline">
          {viewAllLabel}
        </Link>
      </div>
      <div className="flex flex-wrap items-center gap-6">
        {brands.map((brand) => (
          <Link
            key={brand.slug}
            href={`/brands/${brand.slug}`}
            className="text-muted-foreground hover:text-foreground focus-visible:ring-ring/50 flex h-12 min-w-24 items-center justify-center rounded-md transition-colors focus-visible:ring-2 focus-visible:outline-none"
          >
            {brand.logoUrl ? (
              <Image
                src={brand.logoUrl}
                alt={brand.name}
                width={96}
                height={48}
                className="h-12 w-auto object-contain"
              />
            ) : (
              <span className="text-sm font-medium">{brand.name}</span>
            )}
          </Link>
        ))}
      </div>
    </section>
  );
}
