import { describe, expect, it } from 'vitest';

import { appendPageItems, buildPaginatedResult, buildVisibleItemsPage, getPageRange } from '@/lib/shared/pagination';

describe('getPageRange', () => {
  it('requests one extra row so callers can detect more pages', () => {
    expect(getPageRange({ page: 2, pageSize: 10 })).toEqual({ from: 20, to: 30 });
  });

  it('normalizes invalid pagination options', () => {
    expect(getPageRange({ page: -1, pageSize: 0 })).toEqual({ from: 0, to: 1 });
  });
});

describe('buildPaginatedResult', () => {
  it('trims the extra row and marks that more pages exist', () => {
    expect(buildPaginatedResult([1, 2, 3], { pageSize: 2 })).toEqual({
      hasMore: true,
      items: [1, 2],
      nextPage: 1,
    });
  });

  it('marks the final page when there is no extra row', () => {
    expect(buildPaginatedResult([1, 2], { page: 1, pageSize: 2 })).toEqual({
      hasMore: false,
      items: [1, 2],
      nextPage: 2,
    });
  });
});

describe('appendPageItems', () => {
  it('appends new page items without duplicating ids', () => {
    expect(appendPageItems([{ id: 'one' }], [{ id: 'one' }, { id: 'two' }])).toEqual([
      { id: 'one' },
      { id: 'two' },
    ]);
  });
});

describe('buildVisibleItemsPage', () => {
  it('returns locally visible items through the requested page', () => {
    expect(buildVisibleItemsPage([1, 2, 3, 4, 5], { page: 1, pageSize: 2 })).toEqual({
      hasMore: true,
      items: [1, 2, 3, 4],
      nextPage: 2,
    });
  });
});
