import { useEffect, useMemo, useRef, useState } from 'react';

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
  controlledCurrentPage,
  controlledPageSize,
  initialPageSize = DEFAULT_TABLE_PAGE_SIZE_OPTIONS[0],
  onPaginationChange,
  pageSizeOptions = DEFAULT_TABLE_PAGE_SIZE_OPTIONS,
  resetKey,
  rows,
}: {
  controlledCurrentPage?: number;
  controlledPageSize?: number;
  initialPageSize?: number;
  onPaginationChange?: (state: { currentPage: number; pageSize: number }) => void;
  pageSizeOptions?: readonly number[];
  resetKey?: string | number;
  rows: readonly Row[];
}) {
  const [internalCurrentPage, setInternalCurrentPage] = useState(1);
  const [internalPageSize, setInternalPageSize] = useState(initialPageSize);
  const restoring = useRef(false);
  const currentPage = controlledCurrentPage ?? internalCurrentPage;
  const pageSize = controlledPageSize ?? internalPageSize;
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
    if (resetKey === undefined || restoring.current) {
      return;
    }

    setInternalCurrentPage(1);
    onPaginationChange?.({ currentPage: 1, pageSize });
  }, [resetKey]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setInternalCurrentPage(totalPages);
      onPaginationChange?.({ currentPage: totalPages, pageSize });
    }
  }, [currentPage, totalPages]);

  useEffect(() => { restoring.current = false; });

  return {
    restorePagination: (restored: { currentPage: number; pageSize: number }) => {
      restoring.current = true;
      const restoredSize = pageSizeOptions.includes(restored.pageSize) ? restored.pageSize : initialPageSize;
      const restoredPage = Number.isInteger(restored.currentPage) && restored.currentPage > 0 ? restored.currentPage : 1;
      setInternalPageSize(restoredSize);
      setInternalCurrentPage(restoredPage);
      onPaginationChange?.({ currentPage: restoredPage, pageSize: restoredSize });
    },
    currentPage: safeCurrentPage,
    onPageChange: (nextPage: number) => {
      setInternalCurrentPage(nextPage);
      onPaginationChange?.({ currentPage: nextPage, pageSize });
    },
    onPageSizeChange: (nextPageSize: number) => {
      const resolvedPageSize = pageSizeOptions.includes(nextPageSize)
        ? nextPageSize
        : pageSizeOptions[0] ?? initialPageSize;

      setInternalPageSize(resolvedPageSize);
      setInternalCurrentPage(1);
      onPaginationChange?.({ currentPage: 1, pageSize: resolvedPageSize });
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
