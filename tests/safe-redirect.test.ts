import { describe, expect, it } from 'vitest';

import { safeRedirectPath } from '@/lib/auth/safe-redirect';

describe('safeRedirectPath', () => {
  it('passes through a normal relative path', () => {
    expect(safeRedirectPath('/account')).toBe('/account');
  });

  it('falls back to / for a missing value', () => {
    expect(safeRedirectPath(undefined)).toBe('/');
    expect(safeRedirectPath(null)).toBe('/');
    expect(safeRedirectPath('')).toBe('/');
  });

  it('rejects an absolute URL to another origin', () => {
    expect(safeRedirectPath('https://evil.example/phish')).toBe('/');
  });

  it('rejects a protocol-relative URL', () => {
    expect(safeRedirectPath('//evil.example/phish')).toBe('/');
  });

  it('rejects a path with no leading slash', () => {
    expect(safeRedirectPath('evil.example')).toBe('/');
  });

  // `new URL()` — what actually consumes this value downstream in the auth
  // callback route — normalizes backslashes to forward slashes and strips
  // tabs/newlines before parsing. `/\evil.example` therefore resolves to the
  // protocol-relative `//evil.example`, jumping origin. A naive
  // `startsWith('/')` check misses this; guard against regressing on it.
  it('rejects a backslash-prefixed host bypass', () => {
    expect(safeRedirectPath('/\\evil.example/phish')).toBe('/');
  });

  it('rejects a tab-smuggled host bypass', () => {
    expect(safeRedirectPath('/\t/evil.example')).toBe('/');
  });

  it('rejects a newline-smuggled host bypass', () => {
    expect(safeRedirectPath('/\n/evil.example')).toBe('/');
  });

  it('never returns a value whose origin differs when re-parsed', () => {
    const inputs = [
      '/account',
      '/\\evil.example/phish',
      '/\t/evil.example',
      '/\n/evil.example',
      '//evil.example',
      'https://evil.example',
    ];
    for (const input of inputs) {
      const result = safeRedirectPath(input);
      expect(new URL(result, 'https://real-site.example').origin).toBe('https://real-site.example');
    }
  });
});
