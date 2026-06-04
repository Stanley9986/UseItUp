import { describe, expect, it } from 'vitest';

import {
  getCalendarMonthGrid,
  getDateByMonthOffset,
  getDateInMonth,
  getDatePickerYearOptions,
  parseExpirationDate,
  toIsoDate,
} from '@/lib/shared/date-utils';

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

describe('date picker navigation helpers', () => {
  it('formats local dates as ISO dates', () => {
    expect(toIsoDate(new Date(2026, 5, 3, 18))).toBe('2026-06-03');
  });

  it('clamps the selected day when jumping to a shorter month', () => {
    expect(toIsoDate(getDateInMonth(new Date(2026, 0, 31, 12), 2026, 1))).toBe('2026-02-28');
  });

  it('keeps valid days when moving across month boundaries', () => {
    expect(toIsoDate(getDateByMonthOffset(new Date(2026, 0, 31, 12), 1))).toBe('2026-02-28');
    expect(toIsoDate(getDateByMonthOffset(new Date(2026, 0, 31, 12), -1))).toBe('2025-12-31');
  });

  it('builds padded calendar month cells starting on Sunday', () => {
    expect(getCalendarMonthGrid(2026, 5).slice(0, 10)).toEqual([null, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
  });

  it('builds year options from the current year through 50 years ahead', () => {
    const years = getDatePickerYearOptions(2029, 2026);

    expect(years[0]).toBe(2026);
    expect(years.at(-1)).toBe(2076);
    expect(years).toContain(2029);
  });

  it('keeps an existing selected year if it is outside the default year range', () => {
    expect(getDatePickerYearOptions(2085, 2026).at(-1)).toBe(2085);
    expect(getDatePickerYearOptions(2020, 2026)[0]).toBe(2020);
  });
});
