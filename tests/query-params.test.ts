import { describe, expect, it } from 'vitest';

import { parseProductFilters, serializeProductFilters } from '@/lib/catalog/query-params';

describe('parseProductFilters', () => {
  it('reads recognised params and ignores the rest', () => {
    expect(
      parseProductFilters({ brand: 'abib', category: 'skincare', page: '3', foo: 'bar' }),
    ).toEqual({
      brandSlug: 'abib',
      categorySlug: 'skincare',
      minPrice: undefined,
      maxPrice: undefined,
      inStockOnly: false,
      sort: undefined,
    });
  });

  it('parses a valid price range', () => {
    expect(parseProductFilters({ minPrice: '10', maxPrice: '50.5' })).toMatchObject({
      minPrice: '10',
      maxPrice: '50.5',
    });
  });

  it('drops a malformed price rather than throwing', () => {
    expect(parseProductFilters({ minPrice: 'abc' }).minPrice).toBeUndefined();
    expect(parseProductFilters({ minPrice: '-5' }).minPrice).toBeUndefined();
  });

  it('reads inStock only when it is exactly "1"', () => {
    expect(parseProductFilters({ inStock: '1' }).inStockOnly).toBe(true);
    expect(parseProductFilters({ inStock: 'true' }).inStockOnly).toBe(false);
    expect(parseProductFilters({}).inStockOnly).toBe(false);
  });

  it('accepts a known sort and drops an unknown one', () => {
    expect(parseProductFilters({ sort: 'price-asc' }).sort).toBe('price-asc');
    expect(parseProductFilters({ sort: 'cheapest-first' }).sort).toBeUndefined();
  });

  it('accepts the two nav-only sorts, though they never appear in SORT_OPTIONS', () => {
    expect(parseProductFilters({ sort: 'new' }).sort).toBe('new');
    expect(parseProductFilters({ sort: 'best-selling' }).sort).toBe('best-selling');
  });

  it('takes the first value when a param repeats', () => {
    expect(parseProductFilters({ brand: ['abib', 'medicube'] }).brandSlug).toBe('abib');
  });
});

describe('serializeProductFilters', () => {
  it('omits empty and default values, keeping the URL minimal', () => {
    expect(serializeProductFilters({})).toEqual({});
    expect(serializeProductFilters({ sort: 'newest' })).toEqual({});
    expect(serializeProductFilters({ inStockOnly: false })).toEqual({});
  });

  it('includes only the filters that are set', () => {
    expect(
      serializeProductFilters({
        brandSlug: 'abib',
        categorySlug: 'skincare',
        minPrice: '10',
        maxPrice: '50',
        inStockOnly: true,
        sort: 'price-desc',
      }),
    ).toEqual({
      brand: 'abib',
      category: 'skincare',
      minPrice: '10',
      maxPrice: '50',
      inStock: '1',
      sort: 'price-desc',
    });
  });

  it('includes page only when past the first', () => {
    expect(serializeProductFilters({}, 1)).toEqual({});
    expect(serializeProductFilters({}, 2)).toEqual({ page: '2' });
  });

  it('round-trips through parse without gaining or losing filters', () => {
    const original = {
      brandSlug: 'abib',
      minPrice: '10',
      maxPrice: '50',
      inStockOnly: true,
      sort: 'price-asc' as const,
    };

    expect(parseProductFilters(serializeProductFilters(original))).toMatchObject(original);
  });

  it('round-trips the nav-only sorts — the entire mechanism the New Arrivals and Best Sellers links depend on', () => {
    expect(serializeProductFilters({ sort: 'new' })).toEqual({ sort: 'new' });
    expect(serializeProductFilters({ sort: 'best-selling' })).toEqual({ sort: 'best-selling' });
    expect(parseProductFilters(serializeProductFilters({ sort: 'best-selling' })).sort).toBe(
      'best-selling',
    );
  });
});
