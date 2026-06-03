import type { ReactNode } from 'react';
import { ChevronDown, ChevronLeft, ChevronRight, ChevronUp } from 'lucide-react';
import { cn } from '../../../components/ui/utils';

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
  pageSizeOptions?: number[];
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
  pageSizeOptions = [10, 25, 50],
  pageStart,
  totalCount,
  totalPages,
}: StandardPaginationFooterProps) {
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

      <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-end">
        <label className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
          {labels.pageSize ? <span>{labels.pageSize}</span> : null}
          <select
            value={pageSize}
            onChange={(event) => onPageSizeChange(Number(event.target.value))}
            aria-label={labels.pageSize}
            className="h-9 rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 shadow-sm outline-none transition focus:border-[#59C3A5] focus:ring-2 focus:ring-[#59C3A5]/20 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
          >
            {pageSizeOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>

        <p className="text-sm text-slate-500 dark:text-slate-400">
          {labels.page(currentPage, totalPages)}
        </p>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => changePage(currentPage - 1)}
            disabled={currentPage === 1}
            className="inline-flex h-9 items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-600 shadow-sm transition hover:bg-slate-50 disabled:pointer-events-none disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            <ChevronLeft className="h-4 w-4" />
            {labels.previous}
          </button>
          <span className="inline-flex h-9 min-w-9 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-semibold text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-white">
            {currentPage}
          </span>
          <button
            type="button"
            onClick={() => changePage(currentPage + 1)}
            disabled={currentPage === totalPages}
            className="inline-flex h-9 items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-600 shadow-sm transition hover:bg-slate-50 disabled:pointer-events-none disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            {labels.next}
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
