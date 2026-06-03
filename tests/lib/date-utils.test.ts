import { describe, expect, it } from 'vitest';

import { parseExpirationDate } from '@/lib/date-utils';

describe('parseExpirationDate', () => {
  it('accepts an ISO date and trims surrounding whitespace', () => {
    expect(parseExpirationDate('2026-06-02')).toBe('2026-06-02');
    expect(parseExpirationDate('  2026-06-02  ')).toBe('2026-06-02');
  });

  it('returns undefined for empty or non-ISO input', () => {
    expect(parseExpirationDate('')).toBeUndefined();
    expect(parseExpirationDate('today')).toBeUndefined();
    expect(parseExpirationDate('next week-ish')).toBeUndefined();
  });
});
