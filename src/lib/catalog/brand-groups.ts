/**
 * A–Z / أ–ي grouping for the brand index.
 *
 * The catalog mixes Latin and Arabic brand names in both languages, so the
 * grouping follows the *name* that is being displayed, not the interface
 * language: a Korean brand kept in Latin script still files under its Latin
 * initial on the Arabic page.
 */

import { parseLocale, type Locale } from '@/i18n/config';

import type { BrandSummary } from './mappers';

/** Anything not a letter — digits, `+`, `&` — collects here, listed last. */
export const OTHER = '#';

export type BrandGroup = { letter: string; brands: BrandSummary[] };

/**
 * Hamza carriers are spelling variants of the same letter; a shopper looking
 * under ا does not expect أ to sit in its own group.
 */
function normalizeInitial(letter: string): string {
  if ('أإآٱ'.includes(letter)) return 'ا';
  if (letter === 'ة') return 'ه';
  if ('ىی'.includes(letter)) return 'ي';

  return letter;
}

function initialOf(name: string): string {
  const [first] = name.trimStart();

  if (!first || !/\p{L}/u.test(first)) return OTHER;

  return normalizeInitial(first.toLocaleUpperCase());
}

export function groupBrandsByInitial(brands: BrandSummary[], locale: Locale): BrandGroup[] {
  const { language } = parseLocale(locale);
  // `base` sensitivity so case and diacritics do not split a group; the Arabic
  // collator is what puts ب before ل rather than sorting by code point.
  const collator = new Intl.Collator(language, { sensitivity: 'base', numeric: true });
  const groups = new Map<string, BrandSummary[]>();

  for (const brand of brands) {
    const letter = initialOf(brand.name);
    const bucket = groups.get(letter);

    if (bucket) bucket.push(brand);
    else groups.set(letter, [brand]);
  }

  return [...groups.entries()]
    .map(([letter, items]) => ({
      letter,
      brands: [...items].sort((left, right) => collator.compare(left.name, right.name)),
    }))
    .sort((left, right) => {
      if (left.letter === OTHER) return 1;
      if (right.letter === OTHER) return -1;

      return collator.compare(left.letter, right.letter);
    });
}
