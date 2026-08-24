import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { employeePageSizeOptions, employeesPerPage } from '../constants/employees.constants';
import type { EmployeeViewModel } from '../types/employees.types';

interface EmployeesPaginationParams {
  resetKey: string;
  rows: EmployeeViewModel[];
  totalCount: number;
}

export function useEmployeesPagination({
  resetKey,
  rows,
  totalCount,
}: EmployeesPaginationParams) {
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(employeesPerPage);
  const skipNextFilterResetRef = useRef(false);
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const pageStartIndex = (safeCurrentPage - 1) * pageSize;
  const pageEndIndex = pageStartIndex + pageSize;

  const paginatedEmployees = useMemo(
    () => rows.slice(pageStartIndex, pageEndIndex),
    [pageEndIndex, pageStartIndex, rows],
  );
  const paginationStart = totalCount === 0 ? 0 : pageStartIndex + 1;
  const paginationEnd = totalCount === 0 ? 0 : Math.min(pageEndIndex, totalCount);

  useEffect(() => {
    if (skipNextFilterResetRef.current) {
      skipNextFilterResetRef.current = false;
      return;
    }
    setCurrentPage(1);
  }, [resetKey]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const restorePagination = useCallback((nextState: { currentPage: number; pageSize: number }) => {
    const restoredPageSize = employeePageSizeOptions.some((option) => option === nextState.pageSize)
      ? nextState.pageSize
      : employeesPerPage;
    const restoredPage = Number.isFinite(nextState.currentPage)
      ? Math.max(1, Math.trunc(nextState.currentPage))
      : 1;

    skipNextFilterResetRef.current = true;
    setPageSize(restoredPageSize);
    setCurrentPage(restoredPage);
  }, []);

  return {
    currentPage: safeCurrentPage,
    onPageChange: setCurrentPage,
    onPageSizeChange: (nextPageSize: number) => {
      setPageSize(nextPageSize);
      setCurrentPage(1);
    },
    pageEnd: paginationEnd,
    pageSize,
    pageStart: paginationStart,
    paginatedEmployees,
    restorePagination,
    totalPages,
  };
}
