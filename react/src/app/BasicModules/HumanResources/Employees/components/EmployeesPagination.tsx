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
import type { EmployeesTranslations } from '../translations';

interface EmployeesPaginationProps {
  currentPage: number;
  labels: EmployeesTranslations['pagination'];
  onPageChange: (page: number) => void;
  pageEnd: number;
  pageStart: number;
  totalCount: number;
  totalPages: number;
}

export function EmployeesPagination({
  currentPage,
  labels,
  onPageChange,
  pageEnd,
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
      <div className="flex flex-col items-start gap-3 md:items-end">
        <p className="text-sm text-slate-500 dark:text-slate-400">
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
