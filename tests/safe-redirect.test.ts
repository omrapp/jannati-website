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
});
