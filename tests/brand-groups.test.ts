import { describe, expect, it } from 'vitest';

import { groupBrandsByInitial } from '@/lib/catalog/brand-groups';
import type { BrandSummary } from '@/lib/catalog/mappers';

const brand = (name: string): BrandSummary => ({ slug: name.toLowerCase(), name, logoUrl: null });

const names = (groups: ReturnType<typeof groupBrandsByInitial>) =>
  groups.map((group) => [group.letter, group.brands.map((item) => item.name)]);

describe('groupBrandsByInitial', () => {
  it('groups Latin brands under an uppercase initial, letters in order', () => {
    const groups = groupBrandsByInitial(
      [brand('Cerave'), brand('abib'), brand('Anua'), brand('beauty of joseon')],
      'en-om',
    );

    expect(names(groups)).toEqual([
      ['A', ['abib', 'Anua']],
      ['B', ['beauty of joseon']],
      ['C', ['Cerave']],
    ]);
  });

  it('orders Arabic initials by the Arabic alphabet, not by code point luck', () => {
    const groups = groupBrandsByInitial(
      [brand('نيفيا'), brand('بيوديرما'), brand('لوريال')],
      'ar-om',
    );

    expect(groups.map((group) => group.letter)).toEqual(['ب', 'ل', 'ن']);
  });

  it('files every shape of alef under the bare alef', () => {
    const groups = groupBrandsByInitial(
      [brand('أفين'), brand('اورجانيك'), brand('إسانس')],
      'ar-om',
    );

    expect(groups).toHaveLength(1);
    expect(groups[0].letter).toBe('ا');
    expect(groups[0].brands).toHaveLength(3);
  });

  it('puts digits and symbols in one bucket after the letters', () => {
    const groups = groupBrandsByInitial(
      [brand('3W Clinic'), brand('Anua'), brand('+Beaute')],
      'en-om',
    );

    expect(names(groups)).toEqual([
      ['A', ['Anua']],
      ['#', ['+Beaute', '3W Clinic']],
    ]);
  });

  it('sorts within a group case-insensitively', () => {
    const groups = groupBrandsByInitial([brand('anua'), brand('Abib'), brand('ANESSA')], 'en-om');

    expect(names(groups)).toEqual([['A', ['Abib', 'ANESSA', 'anua']]]);
  });

  it('returns nothing for an empty catalog', () => {
    expect(groupBrandsByInitial([], 'ar-om')).toEqual([]);
  });
});
