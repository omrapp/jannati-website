import { describe, expect, it } from 'vitest';

import { paginationItems } from '@/lib/catalog/pagination';

describe('paginationItems', () => {
  it('lists every page while they still fit', () => {
    expect(paginationItems(1, 5)).toEqual([1, 2, 3, 4, 5]);
  });

  it('keeps the first, last and current pages when there are many', () => {
    // 43 pages of products: the bar shows where you are and both ends.
    expect(paginationItems(20, 43)).toEqual([1, 'gap', 19, 20, 21, 'gap', 43]);
  });

  it('does not open a gap of a single page', () => {
    expect(paginationItems(3, 9)).toEqual([1, 2, 3, 4, 'gap', 9]);
  });

  it('handles an empty result as a single page', () => {
    expect(paginationItems(1, 0)).toEqual([1]);
  });

  it('clamps a page number past the end', () => {
    expect(paginationItems(99, 3)).toEqual([1, 2, 3]);
  });
});
