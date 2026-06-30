import { useMemo } from 'react';
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '../../../../components/ui/pagination';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../../../components/ui/select';
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
  const paginationItems = useMemo(() => {
    if (totalPages <= 1) {
      return [1];
    }

    const pages = new Set<number>([1, totalPages, currentPage]);
    if (currentPage - 1 > 1) {
      pages.add(currentPage - 1);
    }
    if (currentPage + 1 < totalPages) {
      pages.add(currentPage + 1);
    }

    const sortedPages = Array.from(pages).sort((left, right) => left - right);
    const items: Array<number | 'ellipsis'> = [];

    sortedPages.forEach((page, index) => {
      const previousPage = sortedPages[index - 1];
      if (previousPage && page - previousPage > 1) {
        items.push('ellipsis');
      }
      items.push(page);
    });

    return items;
  }, [currentPage, totalPages]);

  if (totalCount === 0) {
    return null;
  }

  const changePage = (page: number) => {
    if (page < 1 || page > totalPages || page === currentPage) {
      return;
    }

    onPageChange(page);
  };

  return (
    <div className="flex flex-col gap-4 border-t border-slate-200 px-6 py-4 dark:border-slate-700 md:flex-row md:items-center md:justify-between">
      <p className="text-sm text-slate-500 dark:text-slate-400">
        {labels.showing(pageStart, pageEnd, totalCount)}
      </p>
      <div className="flex flex-col items-start gap-3 sm:flex-row sm:flex-wrap sm:items-center md:justify-end">
        <div className="flex items-center gap-3">
          <span className="text-sm font-semibold text-slate-600 dark:text-slate-300">
            {labels.pageSize}
          </span>
          <Select value={String(pageSize)} onValueChange={(value) => onPageSizeChange(Number(value))}>
            <SelectTrigger className="h-11 w-[104px] rounded-xl border-slate-200 bg-white px-4 text-sm font-semibold text-slate-800 shadow-sm dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100">
              <SelectValue />
            </SelectTrigger>
            <SelectContent align="end">
              {pageSizeOptions.map((option) => (
                <SelectItem key={option} value={String(option)}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <p className="whitespace-nowrap text-sm font-semibold text-slate-600 dark:text-slate-300">
          {labels.page(currentPage, totalPages)}
        </p>
        <Pagination className="mx-0 w-auto justify-start md:justify-end">
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious
                href="#"
                label={labels.previous}
                onClick={(event) => {
                  event.preventDefault();
                  changePage(currentPage - 1);
                }}
                aria-disabled={currentPage === 1}
                className={currentPage === 1 ? 'pointer-events-none opacity-50' : undefined}
              />
            </PaginationItem>
            {paginationItems.map((item, index) => (
              item === 'ellipsis' ? (
                <PaginationItem key={`ellipsis-${index}`}>
                  <PaginationEllipsis />
                </PaginationItem>
              ) : (
                <PaginationItem key={item}>
                  <PaginationLink
                    href="#"
                    isActive={item === currentPage}
                    onClick={(event) => {
                      event.preventDefault();
                      changePage(item);
                    }}
                  >
                    {item}
                  </PaginationLink>
                </PaginationItem>
              )
            ))}
            <PaginationItem>
              <PaginationNext
                href="#"
                label={labels.next}
                onClick={(event) => {
                  event.preventDefault();
                  changePage(currentPage + 1);
                }}
                aria-disabled={currentPage === totalPages}
                className={currentPage === totalPages ? 'pointer-events-none opacity-50' : undefined}
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      </div>
    </div>
  );
}
