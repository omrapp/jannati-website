'use client';

import { SlidersHorizontal, X } from 'lucide-react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { useLocale, useTranslations } from 'next-intl';
import { Dialog } from 'radix-ui';
import { useState, useTransition } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { parseLocale, textDirection, type Locale } from '@/i18n/config';
import { usePathname, useRouter } from '@/i18n/navigation';
import {
  parseDecimal,
  serializeProductFilters,
  type ProductFilters,
} from '@/lib/catalog/query-params';
import type { FacetCount } from '@/lib/catalog/queries';
import { DURATION, EASING, SPRING_DRAWER, SPRING_SNAP, STAGGER_CHILD } from '@/lib/motion-tokens';
import { cn } from '@/lib/utils';

type FilterPanelProps = {
  filters: ProductFilters;
  brands: FacetCount[];
  categories: FacetCount[];
};

const sectionListVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: STAGGER_CHILD } },
};

const sectionVariants = {
  hidden: { opacity: 0, y: 8 },
  visible: { opacity: 1, y: 0 },
};

/**
 * Off-canvas filter drawer for the product listing. Every control writes
 * straight to the URL (via `router.push`), never to component state that
 * only this component knows about — filter state has to survive a reload or
 * a shared link, so the URL has to be the only source of truth.
 *
 * Built on the bare Radix `Dialog` primitive rather than the shared
 * `ui/sheet.tsx` wrapper: that wrapper's slide is a CSS keyframe transition
 * (no spring support) and is also used by unrelated surfaces (admin sidebar,
 * mobile nav) this task must not touch, so the spring-driven chrome lives
 * here instead — same approach as `cart-drawer.tsx`.
 */
export function FilterPanel({ filters, brands, categories }: FilterPanelProps) {
  const t = useTranslations('catalog');
  const tCommon = useTranslations('common');
  const locale = useLocale() as Locale;
  const isRtl = textDirection(parseLocale(locale).language) === 'rtl';
  const reduceMotion = useReducedMotion();
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  // Price inputs are free text while typing; only a value that passes DECIMAL
  // on blur ever reaches the URL.
  const [minPrice, setMinPrice] = useState(filters.minPrice ?? '');
  const [maxPrice, setMaxPrice] = useState(filters.maxPrice ?? '');
  // Tracks the last `filters` these inputs were seeded from, so a change
  // coming from *outside* this component (a browser back/forward, a shared
  // link) can be noticed and re-synced during render — the React-recommended
  // way to adjust state from props, rather than an effect that would commit
  // one render late and let a stale blur resurrect a filter that was just
  // removed. See https://react.dev/learn/you-might-not-need-an-effect.
  const [syncedFrom, setSyncedFrom] = useState(filters);
  if (filters.minPrice !== syncedFrom.minPrice || filters.maxPrice !== syncedFrom.maxPrice) {
    setSyncedFrom(filters);
    setMinPrice(filters.minPrice ?? '');
    setMaxPrice(filters.maxPrice ?? '');
  }

  // Docks at the inline-start — deliberately the opposite edge from the cart
  // drawer, so the two never compete for the same side — via logical
  // positioning (`start-0` below). The slide offset is a raw transform
  // though, so its sign still has to flip by hand: inline-start is the
  // physical left in LTR (slides out towards negative x) and the physical
  // right in RTL (slides out towards positive x).
  const hiddenX = isRtl ? '100%' : '-100%';

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
    apply({ ...filters, minPrice: parseDecimal(minPrice), maxPrice: parseDecimal(maxPrice) });
  }

  function clearAll() {
    setMinPrice('');
    setMaxPrice('');
    // Sort is a display order, not a filter — clearing filters leaves it alone.
    apply({ sort: filters.sort });
  }

  // 'best-selling' is a fixed, hardcoded category collection server-side
  // (see BEST_SELLER_CATEGORY_SLUG in queries.ts) — categorySlug has no
  // effect on that branch, so it's hidden here rather than shown as an
  // active-but-inert filter.
  const categoryFilterUsable = filters.sort !== 'best-selling';

  const activeCount = [
    filters.brandSlug,
    categoryFilterUsable ? filters.categorySlug : undefined,
    filters.minPrice,
    filters.maxPrice,
    filters.inStockOnly ? true : undefined,
  ].filter((value) => value !== undefined).length;

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <SlidersHorizontal className="size-4" />
          {t('filters')}
          <AnimatePresence>
            {activeCount > 0 && (
              <motion.span
                key={activeCount}
                initial={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.5 }}
                transition={reduceMotion ? { duration: DURATION.instant } : SPRING_SNAP}
                className="bg-primary text-primary-foreground flex size-4 items-center justify-center rounded-full text-[10px]"
              >
                {activeCount}
              </motion.span>
            )}
          </AnimatePresence>
        </Button>
      </Dialog.Trigger>

      <AnimatePresence>
        {open && (
          <Dialog.Portal forceMount>
            <Dialog.Overlay asChild forceMount>
              <motion.div
                className="fixed inset-0 z-50 bg-black/50"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: DURATION.normal, ease: EASING.out }}
              />
            </Dialog.Overlay>
            <Dialog.Content asChild forceMount>
              <motion.div
                className="bg-background fixed inset-y-0 start-0 z-50 flex w-80 max-w-full flex-col border-e shadow-lg"
                initial={reduceMotion ? { opacity: 0 } : { x: hiddenX, opacity: 1 }}
                animate={{ x: 0, opacity: 1 }}
                exit={reduceMotion ? { opacity: 0 } : { x: hiddenX, opacity: 1 }}
                transition={reduceMotion ? { duration: DURATION.instant } : SPRING_DRAWER}
              >
                <div className="flex flex-col gap-1.5 p-4 pe-14">
                  <Dialog.Title className="text-foreground font-semibold">{t('filters')}</Dialog.Title>
                </div>
                <Dialog.Close
                  aria-label={tCommon('close')}
                  className="ring-offset-background focus-visible:ring-ring hover:bg-secondary absolute top-2 end-2 flex size-11 items-center justify-center rounded-md opacity-70 transition-opacity hover:opacity-100 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
                >
                  <X className="size-4" />
                </Dialog.Close>

                <motion.div
                  variants={reduceMotion ? undefined : sectionListVariants}
                  initial={reduceMotion ? false : 'hidden'}
                  animate={reduceMotion ? undefined : 'visible'}
                  className={cn(
                    'flex flex-1 flex-col gap-6 overflow-y-auto px-4 pb-4 transition-opacity',
                    isPending && 'opacity-60',
                  )}
                >
                  <motion.section
                    variants={reduceMotion ? undefined : sectionVariants}
                    className="flex flex-col gap-2"
                  >
                    <h3 className="text-sm font-medium">{t('availability')}</h3>
                    <label className="flex min-h-11 items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={filters.inStockOnly ?? false}
                        onChange={toggleInStock}
                        className="accent-primary size-4"
                      />
                      {t('inStockOnly')}
                    </label>
                  </motion.section>

                  <motion.section
                    variants={reduceMotion ? undefined : sectionVariants}
                    className="flex flex-col gap-2"
                  >
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
                  </motion.section>

                  <motion.section
                    variants={reduceMotion ? undefined : sectionVariants}
                    className="flex flex-col gap-2"
                  >
                    <h3 className="text-sm font-medium">{t('allBrands')}</h3>
                    <FacetList
                      groupId="brand"
                      options={brands}
                      activeSlug={filters.brandSlug}
                      onSelect={toggleBrand}
                      reduceMotion={!!reduceMotion}
                    />
                  </motion.section>

                  {categoryFilterUsable && (
                    <motion.section
                      variants={reduceMotion ? undefined : sectionVariants}
                      className="flex flex-col gap-2"
                    >
                      <h3 className="text-sm font-medium">{t('allCategories')}</h3>
                      <FacetList
                        groupId="category"
                        options={categories}
                        activeSlug={filters.categorySlug}
                        onSelect={toggleCategory}
                        reduceMotion={!!reduceMotion}
                      />
                    </motion.section>
                  )}
                </motion.div>

                <div className="border-t p-4">
                  <Button variant="outline" className="min-h-11 w-full" onClick={clearAll}>
                    {t('clearFilters')}
                  </Button>
                </div>
              </motion.div>
            </Dialog.Content>
          </Dialog.Portal>
        )}
      </AnimatePresence>
    </Dialog.Root>
  );
}

function FacetList({
  groupId,
  options,
  activeSlug,
  onSelect,
  reduceMotion,
}: {
  groupId: string;
  options: FacetCount[];
  activeSlug: string | undefined;
  onSelect: (slug: string) => void;
  reduceMotion: boolean;
}) {
  return (
    <ul className="flex max-h-48 flex-col gap-0.5 overflow-y-auto">
      {options.map((option) => {
        // A zero count is only clickable if it's the active selection — a
        // shopper needs to be able to clear the very facet that zeroed
        // everything else out, but not to walk into another dead end.
        const disabled = option.count === 0 && activeSlug !== option.slug;
        const isActive = activeSlug === option.slug;

        return (
          <li key={option.slug}>
            <button
              type="button"
              onClick={() => onSelect(option.slug)}
              disabled={disabled}
              className={cn(
                'relative flex min-h-11 w-full items-center justify-between rounded-md px-2 py-1.5 text-sm transition-colors',
                isActive ? 'text-primary font-medium' : 'hover:bg-muted',
                disabled && 'text-muted-foreground/50',
              )}
            >
              {isActive && (
                <motion.span
                  layoutId={`facet-highlight-${groupId}`}
                  className="bg-primary/10 absolute inset-0 -z-10 rounded-md"
                  transition={reduceMotion ? { duration: DURATION.instant } : SPRING_SNAP}
                />
              )}
              <span className="relative">{option.name}</span>
              <span className="text-muted-foreground relative text-xs">{option.count}</span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
