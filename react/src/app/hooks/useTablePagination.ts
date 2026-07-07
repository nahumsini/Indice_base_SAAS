import { useEffect, useMemo, useState } from 'react';

export const DEFAULT_TABLE_PAGE_SIZE_OPTIONS = [10, 25, 50, 100, 200] as const;

export type TablePageSize = (typeof DEFAULT_TABLE_PAGE_SIZE_OPTIONS)[number] | number;

export function getTablePageCount(totalItems: number, pageSize: number) {
  return Math.max(1, Math.ceil(totalItems / Math.max(1, pageSize)));
}

export function clampTablePage(page: number, totalItems: number, pageSize: number) {
  const pageCount = getTablePageCount(totalItems, pageSize);

  if (!Number.isFinite(page)) {
    return 1;
  }

  return Math.min(Math.max(1, page), pageCount);
}

export function paginateTableRows<Row>(rows: readonly Row[], currentPage: number, pageSize: number) {
  const safePage = clampTablePage(currentPage, rows.length, pageSize);
  const startIndex = (safePage - 1) * pageSize;

  return rows.slice(startIndex, startIndex + pageSize);
}

export function useTablePagination<Row>({
  initialPageSize = DEFAULT_TABLE_PAGE_SIZE_OPTIONS[0],
  pageSizeOptions = DEFAULT_TABLE_PAGE_SIZE_OPTIONS,
  resetKey,
  rows,
}: {
  initialPageSize?: number;
  pageSizeOptions?: readonly number[];
  resetKey?: string | number;
  rows: readonly Row[];
}) {
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(initialPageSize);
  const totalCount = rows.length;
  const totalPages = getTablePageCount(totalCount, pageSize);
  const safeCurrentPage = clampTablePage(currentPage, totalCount, pageSize);
  const pageStartIndex = (safeCurrentPage - 1) * pageSize;
  const pageEndIndex = pageStartIndex + pageSize;
  const pageStart = totalCount === 0 ? 0 : pageStartIndex + 1;
  const pageEnd = totalCount === 0 ? 0 : Math.min(pageEndIndex, totalCount);
  const paginatedRows = useMemo(
    () => rows.slice(pageStartIndex, pageEndIndex),
    [pageEndIndex, pageStartIndex, rows],
  );

  useEffect(() => {
    if (resetKey === undefined) {
      return;
    }

    setCurrentPage(1);
  }, [resetKey]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  return {
    currentPage: safeCurrentPage,
    onPageChange: setCurrentPage,
    onPageSizeChange: (nextPageSize: number) => {
      const resolvedPageSize = pageSizeOptions.includes(nextPageSize)
        ? nextPageSize
        : pageSizeOptions[0] ?? initialPageSize;

      setPageSize(resolvedPageSize);
      setCurrentPage(1);
    },
    pageEnd,
    pageSize,
    pageSizeOptions,
    pageStart,
    paginatedRows,
    totalCount,
    totalPages,
  };
}
