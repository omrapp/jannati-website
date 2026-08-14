import { describe, expect, it } from 'vitest';

import { authErrorKey } from '@/lib/supabase/auth-errors';

describe('authErrorKey', () => {
  it('maps invalid_credentials to invalidCredentials', () => {
    expect(authErrorKey('invalid_credentials')).toBe('invalidCredentials');
  });

  it('maps both email-taken codes to emailTaken', () => {
    expect(authErrorKey('email_exists')).toBe('emailTaken');
    expect(authErrorKey('user_already_exists')).toBe('emailTaken');
  });

  it('maps weak_password to weakPassword', () => {
    expect(authErrorKey('weak_password')).toBe('weakPassword');
  });

  it('maps both rate-limit codes to rateLimited', () => {
    expect(authErrorKey('over_email_send_rate_limit')).toBe('rateLimited');
    expect(authErrorKey('over_request_rate_limit')).toBe('rateLimited');
  });

  it('maps same_password to samePassword', () => {
    expect(authErrorKey('same_password')).toBe('samePassword');
  });

  it('falls back to generic for an unrecognized code', () => {
    expect(authErrorKey('some_future_code')).toBe('generic');
  });

  it('falls back to generic for a missing code', () => {
    expect(authErrorKey(null)).toBe('generic');
    expect(authErrorKey(undefined)).toBe('generic');
  });
});
