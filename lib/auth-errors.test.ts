import { describe, expect, it } from 'vitest';

import { getFriendlyAuthError } from '@/lib/auth-errors';

describe('getFriendlyAuthError', () => {
  it('formats invalid credential errors', () => {
    expect(getFriendlyAuthError({ message: 'Invalid login credentials' }, 'fallback')).toBe(
      'That email or password does not match an account.',
    );
  });

  it('formats email confirmation errors', () => {
    expect(getFriendlyAuthError(new Error('Email not confirmed'), 'fallback')).toBe(
      'Confirm your email before logging in. Check your inbox for the Supabase confirmation link.',
    );
  });

  it('formats weak password errors', () => {
    expect(getFriendlyAuthError({ message: 'Password should be at least 6 characters' }, 'fallback')).toBe(
      'Use a stronger password. Supabase requires at least 6 characters.',
    );
  });

  it('formats duplicate account errors', () => {
    expect(getFriendlyAuthError({ message: 'User already registered' }, 'fallback')).toBe(
      'An account already exists for this email. Log in instead.',
    );
  });

  it('uses fallback when no error message exists', () => {
    expect(getFriendlyAuthError({}, 'Something went wrong.')).toBe('Something went wrong.');
  });
});
