import { DataTablePagination } from '../../../../components/table/DataTablePagination';
import type { EmployeesTranslations } from '../translations';

interface EmployeesPaginationProps {
  currentPage: number;
  labels: EmployeesTranslations['pagination'];
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
  pageEnd: number;
  pageSize: number;
  pageSizeOptions: readonly number[];
  pageStart: number;
  totalCount: number;
  totalPages: number;
}

export function EmployeesPagination({
  currentPage,
  labels,
  onPageChange,
  onPageSizeChange,
  pageEnd,
  pageSize,
  pageSizeOptions,
  pageStart,
  totalCount,
  totalPages,
}: EmployeesPaginationProps) {
  return (
    <DataTablePagination
      currentPage={currentPage}
      labels={{
        next: labels.next,
        page: labels.page,
        previous: labels.previous,
        rowsPerPage: labels.pageSize,
        showing: (start, end, total) => labels.showing(start, end, total),
      }}
      onPageChange={onPageChange}
      onPageSizeChange={onPageSizeChange}
      pageEnd={pageEnd}
      pageSize={pageSize}
      pageSizeOptions={pageSizeOptions}
      pageStart={pageStart}
      totalCount={totalCount}
      totalPages={totalPages}
    />
  );
}
