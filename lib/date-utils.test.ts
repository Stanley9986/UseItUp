import { describe, expect, it } from 'vitest';

import { parseExpirationDate } from '@/lib/date-utils';

const today = new Date('2026-05-29T12:00:00');

describe('parseExpirationDate', () => {
  it('accepts ISO date strings', () => {
    expect(parseExpirationDate('2026-06-02', today)).toBe('2026-06-02');
  });

  it('parses today', () => {
    expect(parseExpirationDate('today', today)).toBe('2026-05-29');
  });

  it('parses tomorrow', () => {
    expect(parseExpirationDate('Tomorrow', today)).toBe('2026-05-30');
  });

  it('parses relative day phrases', () => {
    expect(parseExpirationDate('in 3 days', today)).toBe('2026-06-01');
    expect(parseExpirationDate('3 days', today)).toBe('2026-06-01');
  });

  it('returns undefined for invalid or empty values', () => {
    expect(parseExpirationDate('', today)).toBeUndefined();
    expect(parseExpirationDate('next week-ish', today)).toBeUndefined();
  });
});
