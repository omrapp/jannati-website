'use client';

import { SlidersHorizontal } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useState, useTransition } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { parseLocale, textDirection, type Locale } from '@/i18n/config';
import { usePathname, useRouter } from '@/i18n/navigation';
import { serializeProductFilters, type ProductFilters } from '@/lib/catalog/query-params';
import type { FacetCount } from '@/lib/catalog/queries';
import { cn } from '@/lib/utils';

// Mirrors query-params.ts's own DECIMAL check — a price typed here must pass
// the same validation it would if it arrived via a hand-edited URL, so a
// stray "12abc" degrades to "no filter" rather than reaching the server.
const DECIMAL = /^\d+(\.\d+)?$/;

type FilterPanelProps = {
  filters: ProductFilters;
  brands: FacetCount[];
  categories: FacetCount[];
};

/**
 * Off-canvas filter drawer for the product listing. Every control writes
 * straight to the URL (via `router.push`), never to component state that
 * only this component knows about — filter state has to survive a reload or
 * a shared link, so the URL has to be the only source of truth.
 */
export function FilterPanel({ filters, brands, categories }: FilterPanelProps) {
  const t = useTranslations('catalog');
  const locale = useLocale() as Locale;
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [, startTransition] = useTransition();
  // Price inputs are free text while typing; only a value that passes DECIMAL
  // on blur ever reaches the URL.
  const [minPrice, setMinPrice] = useState(filters.minPrice ?? '');
  const [maxPrice, setMaxPrice] = useState(filters.maxPrice ?? '');

  // The drawer opens from the side the page starts on: right in Arabic, left in English.
  const side = textDirection(parseLocale(locale).language) === 'rtl' ? 'right' : 'left';

  function apply(next: ProductFilters) {
    const query = serializeProductFilters(next);

    startTransition(() => {
      router.push({ pathname, query }, { scroll: false });
    });
  }

  function toggleBrand(slug: string) {
    apply({ ...filters, brandSlug: filters.brandSlug === slug ? undefined : slug });
  }

  function toggleCategory(slug: string) {
    apply({ ...filters, categorySlug: filters.categorySlug === slug ? undefined : slug });
  }

  function toggleInStock() {
    apply({ ...filters, inStockOnly: !filters.inStockOnly });
  }

  function applyPrice() {
    apply({
      ...filters,
      minPrice: DECIMAL.test(minPrice) ? minPrice : undefined,
      maxPrice: DECIMAL.test(maxPrice) ? maxPrice : undefined,
    });
  }

  function clearAll() {
    setMinPrice('');
    setMaxPrice('');
    // Sort is a display order, not a filter — clearing filters leaves it alone.
    apply({ sort: filters.sort });
  }

  const activeCount = [
    filters.brandSlug,
    filters.categorySlug,
    filters.minPrice,
    filters.maxPrice,
    filters.inStockOnly ? true : undefined,
  ].filter((value) => value !== undefined).length;

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <SlidersHorizontal className="size-4" />
          {t('filters')}
          {activeCount > 0 && (
            <span className="bg-primary text-primary-foreground flex size-4 items-center justify-center rounded-full text-[10px]">
              {activeCount}
            </span>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent side={side} className="w-80 gap-0 overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{t('filters')}</SheetTitle>
        </SheetHeader>

        <div className="flex flex-col gap-6 px-4 pb-4">
          <section className="flex flex-col gap-2">
            <h3 className="text-sm font-medium">{t('availability')}</h3>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={filters.inStockOnly ?? false}
                onChange={toggleInStock}
                className="accent-primary size-4"
              />
              {t('inStockOnly')}
            </label>
          </section>

          <section className="flex flex-col gap-2">
            <h3 className="text-sm font-medium">{t('price')}</h3>
            <div className="flex items-center gap-2">
              <Input
                inputMode="decimal"
                placeholder={t('minPrice')}
                value={minPrice}
                onChange={(event) => setMinPrice(event.target.value)}
                onBlur={applyPrice}
              />
              <span className="text-muted-foreground">–</span>
              <Input
                inputMode="decimal"
                placeholder={t('maxPrice')}
                value={maxPrice}
                onChange={(event) => setMaxPrice(event.target.value)}
                onBlur={applyPrice}
              />
            </div>
          </section>

          <section className="flex flex-col gap-2">
            <h3 className="text-sm font-medium">{t('allBrands')}</h3>
            <FacetList options={brands} activeSlug={filters.brandSlug} onSelect={toggleBrand} />
          </section>

          <section className="flex flex-col gap-2">
            <h3 className="text-sm font-medium">{t('allCategories')}</h3>
            <FacetList
              options={categories}
              activeSlug={filters.categorySlug}
              onSelect={toggleCategory}
            />
          </section>
        </div>

        <SheetFooter>
          <Button variant="outline" onClick={clearAll}>
            {t('clearFilters')}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

function FacetList({
  options,
  activeSlug,
  onSelect,
}: {
  options: FacetCount[];
  activeSlug: string | undefined;
  onSelect: (slug: string) => void;
}) {
  return (
    <ul className="flex max-h-48 flex-col gap-0.5 overflow-y-auto">
      {options.map((option) => {
        // A zero count is only clickable if it's the active selection — a
        // shopper needs to be able to clear the very facet that zeroed
        // everything else out, but not to walk into another dead end.
        const disabled = option.count === 0 && activeSlug !== option.slug;

        return (
          <li key={option.slug}>
            <button
              type="button"
              onClick={() => onSelect(option.slug)}
              disabled={disabled}
              className={cn(
                'flex w-full items-center justify-between rounded-md px-2 py-1.5 text-sm transition-colors',
                activeSlug === option.slug
                  ? 'bg-primary/10 text-primary font-medium'
                  : 'hover:bg-muted',
                disabled && 'text-muted-foreground/50',
              )}
            >
              <span>{option.name}</span>
              <span className="text-muted-foreground text-xs">{option.count}</span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
