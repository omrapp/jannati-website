import { Link } from '@/i18n/navigation';
import type { CategorySummary } from '@/lib/catalog/mappers';

/**
 * Text tiles, not image tiles — `CategorySummary` carries no image field
 * (categories were never given one), so there's nothing to show but the
 * name. Renders nothing when the catalog has no categories yet.
 */
export function CategoryGrid({ heading, categories }: { heading: string; categories: CategorySummary[] }) {
  if (categories.length === 0) return null;

  return (
    <section className="flex flex-col gap-4">
      <h2 className="font-display text-xl font-semibold sm:text-2xl">{heading}</h2>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
        {categories.map((category) => (
          <Link
            key={category.slug}
            href={`/collections/${category.slug}`}
            className="bg-secondary/40 hover:bg-secondary/60 focus-visible:ring-ring/50 rounded-lg px-4 py-6 text-center text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:outline-none"
          >
            {category.name}
          </Link>
        ))}
      </div>
    </section>
  );
}
