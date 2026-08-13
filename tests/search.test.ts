import { describe, expect, it } from 'vitest';

import { orderByHandle, paginateHandles } from '@/lib/catalog/search';

describe('orderByHandle', () => {
  it('reorders rows to match the rank order the search RPC returned', () => {
    const rows = [
      { handle: 'b', name: 'B' },
      { handle: 'a', name: 'A' },
      { handle: 'c', name: 'C' },
    ];

    expect(orderByHandle(rows, ['c', 'a', 'b'])).toEqual([
      { handle: 'c', name: 'C' },
      { handle: 'a', name: 'A' },
      { handle: 'b', name: 'B' },
    ]);
  });

  it('drops a ranked handle that the follow-up fetch did not return', () => {
    // RLS or a concurrent status change can make a ranked row vanish between
    // the RPC call and the re-fetch; the result must shrink, not gap out.
    const rows = [{ handle: 'a', name: 'A' }];

    expect(orderByHandle(rows, ['b', 'a'])).toEqual([{ handle: 'a', name: 'A' }]);
  });

  it('returns an empty array when nothing ranked', () => {
    expect(orderByHandle([], [])).toEqual([]);
  });
});

describe('paginateHandles', () => {
  const handles = ['a', 'b', 'c', 'd', 'e'];

  it('slices the requested page', () => {
    expect(paginateHandles(handles, 1, 2)).toEqual({
      pageHandles: ['a', 'b'],
      total: 5,
      pageCount: 3,
    });
    expect(paginateHandles(handles, 2, 2)).toEqual({
      pageHandles: ['c', 'd'],
      total: 5,
      pageCount: 3,
    });
  });

  it('reports the real total on a page past the end, not a lost count', () => {
    // This is the bug the RPC redesign fixes: paging must never zero out the
    // total just because the requested page has no rows of its own.
    expect(paginateHandles(handles, 10, 2)).toEqual({
      pageHandles: [],
      total: 5,
      pageCount: 3,
    });
  });

  it('returns a total of zero and a pageCount of at least one when nothing ranked', () => {
    expect(paginateHandles([], 1, 24)).toEqual({ pageHandles: [], total: 0, pageCount: 1 });
  });
});
