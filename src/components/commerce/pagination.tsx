import { useTranslations } from 'next-intl';

import { Link } from '@/i18n/navigation';
import { paginationItems } from '@/lib/catalog/pagination';
import { cn } from '@/lib/utils';

/**
 * Real links, not client state: a crawler follows them and a shopper can share
 * page 4. The arrows are chevrons in text, which flip with the writing
 * direction without a separate RTL asset.
 */
export function Pagination({
  page,
  pageCount,
  hrefFor,
}: {
  page: number;
  pageCount: number;
  /** Builds the URL for a page, so each listing keeps its own query string. */
  hrefFor: (page: number) => string;
}) {
  const t = useTranslations('catalog');

  if (pageCount <= 1) return null;

  return (
    <nav aria-label={t('pagination')} className="flex flex-wrap items-center justify-center gap-2">
      {page > 1 && (
        <Link
          href={hrefFor(page - 1)}
          rel="prev"
          className="hover:bg-secondary rounded-md border px-3 py-2 text-sm"
        >
          {t('previous')}
        </Link>
      )}

      {paginationItems(page, pageCount).map((item, index) =>
        item === 'gap' ? (
          <span key={`gap-${index}`} className="text-muted-foreground px-1">
            …
          </span>
        ) : (
          <Link
            key={item}
            href={hrefFor(item)}
            aria-current={item === page ? 'page' : undefined}
            className={cn(
              'hover:bg-secondary min-w-10 rounded-md border px-3 py-2 text-center text-sm',
              item === page && 'bg-primary text-primary-foreground border-primary hover:bg-primary',
            )}
          >
            {item}
          </Link>
        ),
      )}

      {page < pageCount && (
        <Link
          href={hrefFor(page + 1)}
          rel="next"
          className="hover:bg-secondary rounded-md border px-3 py-2 text-sm"
        >
          {t('next')}
        </Link>
      )}
    </nav>
  );
}
