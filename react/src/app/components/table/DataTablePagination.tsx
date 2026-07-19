import { useMemo, type ReactNode } from 'react';
import { useLanguage } from '../../shared/context';

import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '../ui/pagination';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import { cn } from '../ui/utils';

export type DataTablePaginationLabels = {
  next?: string;
  page?: (currentPage: number, totalPages: number) => ReactNode;
  previous?: string;
  rowsPerPage?: string;
  showing?: (pageStart: number, pageEnd: number, totalCount: number, itemLabel: string) => ReactNode;
};

const paginationCopyByLocale: Record<string, {
  next: string;
  page: (currentPage: number, totalPages: number) => string;
  previous: string;
  records: string;
  rowsPerPage: string;
  showing: (pageStart: number, pageEnd: number, totalCount: number, itemLabel: string) => string;
}> = {
  'en-CA': { next: 'Next', page: (current, total) => `Page ${current} of ${total}`, previous: 'Previous', records: 'records', rowsPerPage: 'Rows per page', showing: (start, end, total, label) => `Showing ${start}-${end} of ${total} ${label}` },
  'en-US': { next: 'Next', page: (current, total) => `Page ${current} of ${total}`, previous: 'Previous', records: 'records', rowsPerPage: 'Rows per page', showing: (start, end, total, label) => `Showing ${start}-${end} of ${total} ${label}` },
  'es-MX': { next: 'Siguiente', page: (current, total) => `Página ${current} de ${total}`, previous: 'Anterior', records: 'registros', rowsPerPage: 'Filas por página', showing: (start, end, total, label) => `Mostrando ${start}-${end} de ${total} ${label}` },
  'es-CO': { next: 'Siguiente', page: (current, total) => `Página ${current} de ${total}`, previous: 'Anterior', records: 'registros', rowsPerPage: 'Filas por página', showing: (start, end, total, label) => `Mostrando ${start}-${end} de ${total} ${label}` },
  'fr-CA': { next: 'Suivant', page: (current, total) => `Page ${current} sur ${total}`, previous: 'Précédent', records: 'éléments', rowsPerPage: 'Lignes par page', showing: (start, end, total, label) => `Affichage de ${start}-${end} sur ${total} ${label}` },
  'pt-BR': { next: 'Próxima', page: (current, total) => `Página ${current} de ${total}`, previous: 'Anterior', records: 'registros', rowsPerPage: 'Linhas por página', showing: (start, end, total, label) => `Mostrando ${start}-${end} de ${total} ${label}` },
  'ko-CA': { next: '다음', page: (current, total) => `${current} / ${total} 페이지`, previous: '이전', records: '개 항목', rowsPerPage: '페이지당 행', showing: (start, end, total, label) => `${total}${label} 중 ${start}-${end} 표시` },
  'zh-CA': { next: '下一页', page: (current, total) => `第 ${current} 页，共 ${total} 页`, previous: '上一页', records: '条记录', rowsPerPage: '每页行数', showing: (start, end, total, label) => `显示 ${start}-${end}，共 ${total} ${label}` },
};

export function DataTablePagination({
  attached = true,
  className,
  currentPage,
  itemLabel,
  labels,
  onPageChange,
  onPageSizeChange,
  pageEnd,
  pageSize,
  pageSizeOptions,
  pageStart,
  totalCount,
  totalPages,
}: {
  attached?: boolean;
  className?: string;
  currentPage: number;
  itemLabel?: string;
  labels?: DataTablePaginationLabels;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
  pageEnd: number;
  pageSize: number;
  pageSizeOptions: readonly number[];
  pageStart: number;
  totalCount: number;
  totalPages: number;
}) {
  const { currentLanguage } = useLanguage();
  const defaultLabels = paginationCopyByLocale[currentLanguage.code] ?? paginationCopyByLocale['en-CA'];
  const resolvedItemLabel = itemLabel ?? defaultLabels.records;
  const resolvedLabels = {
    next: labels?.next ?? defaultLabels.next,
    page: labels?.page ?? defaultLabels.page,
    previous: labels?.previous ?? defaultLabels.previous,
    rowsPerPage: labels?.rowsPerPage ?? defaultLabels.rowsPerPage,
    showing: labels?.showing ?? defaultLabels.showing,
  };
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
    <div
      className={cn(
        'flex flex-col gap-4 bg-white px-6 py-4 text-sm text-slate-600 dark:bg-slate-800 dark:text-slate-300 md:flex-row md:items-center md:justify-between',
        attached ? 'border-t border-slate-200 dark:border-slate-700' : 'rounded-2xl border border-slate-200 shadow-sm dark:border-slate-700',
        className,
      )}
    >
      <p className="font-semibold text-slate-500 dark:text-slate-400">
        {resolvedLabels.showing(pageStart, pageEnd, totalCount, resolvedItemLabel)}
      </p>

      <div className="flex flex-col items-start gap-3 sm:flex-row sm:flex-wrap sm:items-center md:justify-end">
        <div className="flex items-center gap-3">
          <span className="font-semibold text-slate-600 dark:text-slate-300">
            {resolvedLabels.rowsPerPage}
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

        <p className="whitespace-nowrap font-semibold text-slate-600 dark:text-slate-300">
          {resolvedLabels.page(currentPage, totalPages)}
        </p>

        <Pagination className="mx-0 w-auto justify-start md:justify-end">
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious
                href="#"
                label={resolvedLabels.previous}
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
                label={resolvedLabels.next}
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
