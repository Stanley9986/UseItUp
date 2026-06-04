import { describe, expect, it } from 'vitest';

import { getErrorMessage } from '@/lib/shared/errors';

describe('getErrorMessage', () => {
  it('returns Error messages', () => {
    expect(getErrorMessage(new Error('Request failed'), 'Fallback')).toBe('Request failed');
  });

  it('returns object message values', () => {
    expect(getErrorMessage({ message: 'Supabase denied access' }, 'Fallback')).toBe('Supabase denied access');
  });

  it('returns the fallback when no message exists', () => {
    expect(getErrorMessage({ code: 'unknown' }, 'Fallback')).toBe('Fallback');
  });

  it('defaults to an empty string when no fallback is provided', () => {
    expect(getErrorMessage(null)).toBe('');
  });
});
