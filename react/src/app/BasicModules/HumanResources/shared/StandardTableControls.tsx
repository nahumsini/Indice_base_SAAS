import type { ReactNode } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { DataTablePagination } from '../../../components/table/DataTablePagination';
import { cn } from '../../../components/ui/utils';
import { DEFAULT_TABLE_PAGE_SIZE_OPTIONS } from '../../../hooks/useTablePagination';

export type StandardSortDirection = 'asc' | 'desc' | null;

export function StandardSortIcon({
  active,
  direction,
}: {
  active: boolean;
  direction: StandardSortDirection;
}) {
  return (
    <span className="flex h-4 w-4 shrink-0 flex-col items-center justify-center">
      <ChevronUp
        className={cn(
          '-mb-1 h-3 w-3',
          active && direction === 'asc' ? 'text-[#59C3A5]' : 'text-slate-400',
        )}
      />
      <ChevronDown
        className={cn(
          '-mt-1 h-3 w-3',
          active && direction === 'desc' ? 'text-[#59C3A5]' : 'text-slate-400',
        )}
      />
    </span>
  );
}

export function StandardActionButton({
  children,
  label,
  onClick,
  tone = 'default',
  disabled = false,
}: {
  children: ReactNode;
  label: string;
  onClick: () => void;
  tone?: 'default' | 'success' | 'danger' | 'warning';
  disabled?: boolean;
}) {
  const toneClassName = {
    default:
      'border-blue-100 bg-blue-50 text-blue-600 hover:bg-blue-100 dark:border-blue-900/50 dark:bg-blue-950/30 dark:text-blue-300',
    success:
      'border-emerald-100 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-300',
    danger:
      'border-rose-100 bg-rose-50 text-rose-600 hover:bg-rose-100 dark:border-rose-900/50 dark:bg-rose-950/30 dark:text-rose-300',
    warning:
      'border-amber-100 bg-amber-50 text-amber-600 hover:bg-amber-100 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-300',
  }[tone];

  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'inline-flex h-9 w-9 items-center justify-center rounded-xl border transition disabled:cursor-not-allowed disabled:opacity-60',
        toneClassName,
      )}
    >
      {children}
    </button>
  );
}

interface StandardPaginationFooterProps {
  currentPage: number;
  labels: {
    next: string;
    page: (current: number, total: number) => ReactNode;
    pageSize?: string;
    previous: string;
    showing: (start: number, end: number, total: number) => ReactNode;
  };
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
  pageEnd: number;
  pageSize: number;
  pageSizeOptions?: readonly number[];
  pageStart: number;
  totalCount: number;
  totalPages: number;
}

export function StandardPaginationFooter({
  currentPage,
  labels,
  onPageChange,
  onPageSizeChange,
  pageEnd,
  pageSize,
  pageSizeOptions = DEFAULT_TABLE_PAGE_SIZE_OPTIONS,
  pageStart,
  totalCount,
  totalPages,
}: StandardPaginationFooterProps) {
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
