export const defaultPageSize = 10;

export type PaginationOptions = {
  page?: number;
  pageSize?: number;
};

export type PaginatedResult<T> = {
  hasMore: boolean;
  items: T[];
  nextPage: number;
};

export function getPageRange({ page = 0, pageSize = defaultPageSize }: PaginationOptions = {}) {
  const safePage = Math.max(0, page);
  const safePageSize = Math.max(1, pageSize);
  const from = safePage * safePageSize;

  return {
    from,
    to: from + safePageSize,
  };
}

export function buildPaginatedResult<T>(
  rows: T[],
  { page = 0, pageSize = defaultPageSize }: PaginationOptions = {},
): PaginatedResult<T> {
  const safePage = Math.max(0, page);
  const safePageSize = Math.max(1, pageSize);

  return {
    hasMore: rows.length > safePageSize,
    items: rows.slice(0, safePageSize),
    nextPage: safePage + 1,
  };
}

export function appendPageItems<T extends { id: string }>(currentItems: T[], nextItems: T[]) {
  const seenIds = new Set(currentItems.map((item) => item.id));
  return [...currentItems, ...nextItems.filter((item) => !seenIds.has(item.id))];
}

export function buildVisibleItemsPage<T>(
  items: T[],
  { page = 0, pageSize = defaultPageSize }: PaginationOptions = {},
): PaginatedResult<T> {
  const safePage = Math.max(0, page);
  const safePageSize = Math.max(1, pageSize);
  const visibleCount = (safePage + 1) * safePageSize;

  return {
    hasMore: items.length > visibleCount,
    items: items.slice(0, visibleCount),
    nextPage: safePage + 1,
  };
}
