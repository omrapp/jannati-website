import { describe, expect, it } from 'vitest';

import {
  buildLocale,
  defaultLocale,
  htmlLang,
  isLocale,
  locales,
  parseLocale,
  textDirection,
} from '@/i18n/config';

describe('locale model', () => {
  it('covers every language-country combination', () => {
    expect(locales).toHaveLength(12);
    expect(locales).toContain('ar-om');
    expect(locales).toContain('en-bh');
  });

  it('defaults to Arabic in Oman', () => {
    expect(defaultLocale).toBe('ar-om');
  });

  it('rejects unknown locales', () => {
    expect(isLocale('ar-om')).toBe(true);
    expect(isLocale('fr-om')).toBe(false);
    expect(isLocale('ar-us')).toBe(false);
    expect(isLocale('ar')).toBe(false);
  });

  it('round-trips between locale and its parts', () => {
    for (const locale of locales) {
      const { language, country } = parseLocale(locale);
      expect(buildLocale(language, country)).toBe(locale);
    }
  });

  it('maps language to text direction', () => {
    expect(textDirection('ar')).toBe('rtl');
    expect(textDirection('en')).toBe('ltr');
  });

  it('builds BCP 47 lang attributes', () => {
    expect(htmlLang('ar-om')).toBe('ar-OM');
    expect(htmlLang('en-ae')).toBe('en-AE');
  });
});
