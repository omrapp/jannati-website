/**
 * Which page numbers a pagination bar shows. Always the first and last page,
 * the current page and its neighbours, and a gap marker for what is left out —
 * a gap is only worth drawing when it hides more than one page.
 */
export type PaginationItem = number | 'gap';

/** Below this, every page fits on the bar and no gap is needed. */
const ALWAYS_SHOW_UP_TO = 7;

export function paginationItems(page: number, pageCount: number): PaginationItem[] {
  const last = Math.max(1, pageCount);
  const current = Math.min(Math.max(1, page), last);

  if (last <= ALWAYS_SHOW_UP_TO) {
    return Array.from({ length: last }, (_, index) => index + 1);
  }

  const shown = new Set<number>([1, last]);
  for (let around = current - 1; around <= current + 1; around += 1) {
    if (around >= 1 && around <= last) shown.add(around);
  }

  const items: PaginationItem[] = [];
  let previous = 0;

  for (const number of [...shown].sort((left, right) => left - right)) {
    // One page missing is drawn as the page itself; two or more become a gap.
    if (number - previous === 2) items.push(number - 1);
    else if (number - previous > 2) items.push('gap');

    items.push(number);
    previous = number;
  }

  return items;
}
