import type { LucideIcon } from 'lucide-react';
import { ArrowDown, ArrowUp, ArrowUpDown, Columns3, Plus, RefreshCcw } from 'lucide-react';
import { useMemo, useState, type ReactNode } from 'react';
import { DataTablePagination } from '../../../components/table/DataTablePagination';
import { DEFAULT_TABLE_PAGE_SIZE_OPTIONS } from '../../../hooks/useTablePagination';
import {
  pettyCashFundStatusClasses,
  pettyCashSettlementLineStatusClasses,
  pettyCashStatementStatusClasses,
} from '../utils/pettyCash.utils';
import type { PettyCashFundStatus, PettyCashSettlementLineStatus, PettyCashStatementStatus } from '../types/pettyCash.types';
import { usePettyCashTranslations } from '../hooks/usePettyCashTranslations';
import { LearningModeTitleBarBridge } from '../../../learningMode';

type StatusKind = 'fund' | 'statement' | 'line';

const getStatusCopy = (kind: StatusKind, status: string) => {
  if (kind === 'fund') {
    return {
      className: pettyCashFundStatusClasses[status as PettyCashFundStatus],
    };
  }
  if (kind === 'line') {
    return {
      className: pettyCashSettlementLineStatusClasses[status as PettyCashSettlementLineStatus],
    };
  }
  return {
    className: pettyCashStatementStatusClasses[status as PettyCashStatementStatus],
  };
};

export function PettyCashHeaderBanner({
  actionLabel,
  description,
  emoji,
  icon: Icon,
  onAction,
  onColumns,
  onSecondaryAction,
  onTertiaryAction,
  secondaryActionIcon: SecondaryActionIcon,
  secondaryActionLabel,
  tertiaryActionIcon: TertiaryActionIcon,
  tertiaryActionLabel,
  title,
}: {
  actionLabel?: string;
  description: string;
  emoji?: string;
  icon?: LucideIcon;
  onAction?: () => void;
  onColumns?: () => void;
  onSecondaryAction?: () => void;
  onTertiaryAction?: () => void;
  secondaryActionIcon?: LucideIcon;
  secondaryActionLabel?: string;
  tertiaryActionIcon?: LucideIcon;
  tertiaryActionLabel?: string;
  title: string;
}) {
  const actionLayout = (
    <div className="grid grid-cols-1 gap-3 sm:flex sm:flex-row sm:items-center">
      {secondaryActionLabel && onSecondaryAction ? (
        <button
          type="button"
          onClick={onSecondaryAction}
          className="inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-sm font-semibold text-[#147514] shadow-none transition hover:bg-[#147514] hover:text-white dark:border-slate-700 dark:bg-slate-900 dark:text-emerald-300 dark:hover:bg-emerald-700 dark:hover:text-white"
        >
          {SecondaryActionIcon ? <SecondaryActionIcon className="h-4 w-4" /> : null}
          {secondaryActionLabel}
        </button>
      ) : null}
      {tertiaryActionLabel && onTertiaryAction ? (
        <button
          type="button"
          onClick={onTertiaryAction}
          className="inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-sm font-semibold text-[#147514] shadow-none transition hover:bg-[#147514] hover:text-white dark:border-slate-700 dark:bg-slate-900 dark:text-emerald-300 dark:hover:bg-emerald-700 dark:hover:text-white"
        >
          {TertiaryActionIcon ? <TertiaryActionIcon className="h-4 w-4" /> : null}
          {tertiaryActionLabel}
        </button>
      ) : null}
      {onColumns ? (
        <button
          type="button"
          onClick={onColumns}
          className="inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-sm font-semibold text-[#147514] shadow-none transition hover:bg-[#147514] hover:text-white dark:border-slate-700 dark:bg-slate-900 dark:text-emerald-300 dark:hover:bg-emerald-700 dark:hover:text-white"
        >
          <Columns3 className="h-4 w-4" />
          <HeaderColumnsLabel />
        </button>
      ) : null}
      {actionLabel && onAction ? (
        <button
          type="button"
          onClick={onAction}
          className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-[#147514] px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-[#105010] dark:bg-emerald-600 dark:hover:bg-emerald-500"
        >
          <Plus className="h-4 w-4" />
          {actionLabel}
        </button>
      ) : null}
    </div>
  );

  return (
    <LearningModeTitleBarBridge actions={actionLayout}>
    <section className="rounded-xl border border-[#147514]/20 bg-[#147514]/10 px-4 py-4 shadow-sm dark:border-emerald-400/20 dark:bg-emerald-400/10 sm:px-6 sm:py-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-[#147514]/20 bg-white text-2xl leading-none shadow-sm dark:border-emerald-400/20 dark:bg-slate-900" aria-hidden="true">
            {Icon ? <Icon className="h-5 w-5 text-[#147514] dark:text-emerald-300" /> : emoji}
          </span>
          <div className="min-w-0">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">{title}</h2>
            <p className="mt-1 max-w-3xl text-sm font-semibold leading-5 text-slate-600 dark:text-slate-400">{description}</p>
          </div>
        </div>

        {actionLayout}
      </div>
    </section>
    </LearningModeTitleBarBridge>
  );
}

function HeaderColumnsLabel() {
  const copy = usePettyCashTranslations();
  return <>{copy.common.columns}</>;
}

export function PettyCashFilterShell({
  children,
  clearLabel = 'Limpiar',
  onClear,
  resultLabel,
  subtitle,
}: {
  children: ReactNode;
  clearLabel?: string;
  onClear?: () => void;
  resultLabel: string;
  subtitle?: string;
}) {
  const copy = usePettyCashTranslations();

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900 sm:p-5">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-extrabold text-slate-900 dark:text-white">{copy.common.filters}</h3>
          {subtitle ? <p className="mt-1 text-sm font-medium text-slate-500 dark:text-slate-400">{subtitle}</p> : null}
        </div>
        <div className="flex shrink-0 items-center gap-3">
          <span className="rounded-full border border-[#147514]/15 bg-[#147514]/10 px-3 py-1 text-sm font-bold text-[#147514] dark:border-emerald-900/50 dark:bg-emerald-400/10 dark:text-emerald-300">
            {resultLabel}
          </span>
          {onClear ? (
            <button
              type="button"
              onClick={onClear}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 transition hover:text-[#147514] dark:text-slate-400 dark:hover:text-emerald-300"
            >
              <RefreshCcw className="h-3.5 w-3.5" />
              {clearLabel}
            </button>
          ) : null}
        </div>
      </div>
      <div className="grid gap-3 lg:grid-cols-4">{children}</div>
    </section>
  );
}

export function PettyCashField({
  children,
  label,
}: {
  children: ReactNode;
  label: string;
}) {
  return (
    <label className="space-y-1.5">
      <span className="text-xs font-bold uppercase tracking-[0.08em] text-slate-500 dark:text-slate-400">{label}</span>
      {children}
    </label>
  );
}

export const pettyCashInputClass = 'h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-900 shadow-none outline-none transition placeholder:text-slate-400 focus:border-[#147514] focus:ring-2 focus:ring-[#147514]/15 dark:border-slate-700 dark:bg-slate-950 dark:text-white';

export type PettyCashSortDirection = 'asc' | 'desc';

type SortableValue = Date | number | string | null | undefined;

export function usePettyCashTableSort<T, K extends string>(
  rows: T[],
  accessors: Record<K, (row: T) => SortableValue>,
  initialKey: K,
  initialDirection: PettyCashSortDirection = 'asc',
) {
  const [sortKey, setSortKey] = useState<K>(initialKey);
  const [sortDirection, setSortDirection] = useState<PettyCashSortDirection>(initialDirection);
  const sortedRows = useMemo(() => [...rows].sort((left, right) => {
    const leftValue = accessors[sortKey](left);
    const rightValue = accessors[sortKey](right);
    const leftComparable = leftValue instanceof Date ? leftValue.getTime() : leftValue ?? '';
    const rightComparable = rightValue instanceof Date ? rightValue.getTime() : rightValue ?? '';
    const comparison = typeof leftComparable === 'number' && typeof rightComparable === 'number'
      ? leftComparable - rightComparable
      : String(leftComparable).localeCompare(String(rightComparable), undefined, { numeric: true, sensitivity: 'base' });
    return sortDirection === 'asc' ? comparison : -comparison;
  }), [accessors, rows, sortDirection, sortKey]);

  const onSort = (key: K) => {
    if (sortKey === key) {
      setSortDirection(current => current === 'asc' ? 'desc' : 'asc');
      return;
    }
    setSortKey(key);
    setSortDirection('asc');
  };

  return { onSort, sortDirection, sortedRows, sortKey };
}

export function PettyCashSortableHeader<K extends string>({
  align = 'left',
  columnKey,
  label,
  onSort,
  sortDirection,
  sortKey,
  widthClass = '',
}: {
  align?: 'left' | 'right';
  columnKey?: K;
  label: string;
  onSort?: (key: K) => void;
  sortDirection?: PettyCashSortDirection;
  sortKey?: K;
  widthClass?: string;
}) {
  const isActive = Boolean(columnKey && sortKey === columnKey);
  const SortIcon = !isActive ? ArrowUpDown : sortDirection === 'asc' ? ArrowUp : ArrowDown;

  return (
    <th
      aria-sort={columnKey ? isActive ? (sortDirection === 'asc' ? 'ascending' : 'descending') : 'none' : undefined}
      className={`${widthClass} px-5 py-4 ${align === 'right' ? 'text-right' : 'text-left'} align-middle`}
    >
      {columnKey && onSort ? (
        <button
          type="button"
          onClick={() => onSort(columnKey)}
          className={`inline-flex items-center gap-2 whitespace-nowrap text-[11px] font-semibold uppercase tracking-[0.12em] transition-colors hover:text-slate-900 dark:hover:text-white ${isActive ? 'text-[#147514] dark:text-emerald-300' : 'text-slate-500 dark:text-slate-400'}`}
        >
          <span>{label}</span>
          <SortIcon className={`h-4 w-4 shrink-0 ${isActive ? 'text-[#147514] dark:text-emerald-300' : 'text-slate-400'}`} />
        </button>
      ) : (
        <span className="whitespace-nowrap text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">{label}</span>
      )}
    </th>
  );
}

export function PettyCashMetric({
  icon: Icon,
  label,
  tone = 'neutral',
  value,
}: {
  icon: LucideIcon;
  label: string;
  tone?: 'neutral' | 'success' | 'warning' | 'danger' | 'info';
  value: string;
}) {
  const toneClass = {
    danger: 'text-red-600 dark:text-red-300',
    info: 'text-sky-600 dark:text-sky-300',
    neutral: 'text-slate-900 dark:text-slate-100',
    success: 'text-[#147514] dark:text-emerald-300',
    warning: 'text-amber-600 dark:text-amber-300',
  }[tone];

  return (
    <div className="inline-flex min-w-0 items-center gap-3">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-[#147514] shadow-sm dark:border-slate-700 dark:bg-slate-800 dark:text-emerald-300">
        <Icon className="h-4 w-4" />
      </span>
      <div className="min-w-0">
        <p className={`truncate text-base font-black ${toneClass}`}>{value}</p>
        <p className="truncate text-sm font-semibold text-slate-500 dark:text-slate-400">{label}</p>
      </div>
    </div>
  );
}

export function PettyCashStatusPill({ kind, status }: { kind: StatusKind; status: string }) {
  const translations = usePettyCashTranslations();
  const copy = getStatusCopy(kind, status);
  const label = kind === 'fund'
    ? translations.status.fund[status as PettyCashFundStatus]
    : kind === 'line'
      ? translations.status.line[status as PettyCashSettlementLineStatus]
      : translations.status.statement[status as PettyCashStatementStatus];

  return (
    <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-extrabold ${copy.className}`}>
      {label}
    </span>
  );
}

export function PettyCashTableShell({ children, footer }: { children: ReactNode; footer?: ReactNode }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
      <div className="overflow-x-auto">{children}</div>
      {footer}
    </div>
  );
}

export function PettyCashPagination({
  currentPage,
  itemLabel = 'registros',
  onPageChange,
  onPageSizeChange,
  pageEnd,
  pageSize,
  pageSizeOptions = DEFAULT_TABLE_PAGE_SIZE_OPTIONS,
  pageStart,
  totalCount,
  totalPages,
}: {
  currentPage: number;
  itemLabel?: string;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
  pageEnd: number;
  pageSize: number;
  pageSizeOptions?: readonly number[];
  pageStart: number;
  totalCount: number;
  totalPages: number;
}) {
  const copy = usePettyCashTranslations();

  return (
    <DataTablePagination
      currentPage={currentPage}
      itemLabel={itemLabel}
      labels={{
        next: copy.common.next,
        page: (current, total) => `${current} / ${total}`,
        previous: copy.common.previous,
        rowsPerPage: copy.common.rowsPerPage,
        showing: copy.common.showing,
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

export function PettyCashEmptyState({ label }: { label: string }) {
  return (
    <div className="rounded-lg border border-dashed border-slate-300 bg-white px-6 py-10 text-center text-sm font-semibold text-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400">
      {label}
    </div>
  );
}
