import { useEffect, useMemo, useState } from 'react';
import { employeesPerPage } from '../constants/employees.constants';
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
  const totalPages = Math.max(1, Math.ceil(totalCount / employeesPerPage));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const pageStartIndex = (safeCurrentPage - 1) * employeesPerPage;
  const pageEndIndex = pageStartIndex + employeesPerPage;

  const paginatedEmployees = useMemo(
    () => rows.slice(pageStartIndex, pageEndIndex),
    [pageEndIndex, pageStartIndex, rows],
  );
  const paginationStart = totalCount === 0 ? 0 : pageStartIndex + 1;
  const paginationEnd = totalCount === 0 ? 0 : Math.min(pageEndIndex, totalCount);

  useEffect(() => {
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
    pageEnd: paginationEnd,
    pageStart: paginationStart,
    paginatedEmployees,
    totalPages,
  };
}
