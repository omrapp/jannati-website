'use client';

import { ArrowUpDown, Check } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useTransition } from 'react';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { usePathname, useRouter } from '@/i18n/navigation';
import {
  serializeProductFilters,
  SORT_OPTIONS,
  type ProductFilters,
} from '@/lib/catalog/query-params';

/**
 * Sort control for a product listing. Rebuilds the query from the *whole*
 * current filter set, not just `sort` — picking a sort must not silently
 * drop a brand or price filter the shopper already set, and `page` always
 * drops back to 1, since a sort changes what page 3 even means.
 */
export function SortSelect({ filters }: { filters: ProductFilters }) {
  const t = useTranslations('catalog');
  const router = useRouter();
  const pathname = usePathname();
  const [, startTransition] = useTransition();

  const active = filters.sort ?? 'newest';

  function applySort(sort: ProductFilters['sort']) {
    const query = serializeProductFilters({ ...filters, sort });

    startTransition(() => {
      router.push({ pathname, query }, { scroll: false });
    });
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <ArrowUpDown className="size-4" />
          {t(`sort.${active}`)}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {SORT_OPTIONS.map((option) => (
          <DropdownMenuItem key={option} onClick={() => applySort(option)}>
            <Check className={option === active ? 'size-4 opacity-100' : 'size-4 opacity-0'} />
            {t(`sort.${option}`)}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
