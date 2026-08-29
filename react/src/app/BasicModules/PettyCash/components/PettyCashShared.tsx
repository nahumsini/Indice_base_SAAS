import type { LucideIcon } from 'lucide-react';
import { ArrowDown, ArrowUp, ArrowUpDown, Columns3, MoreHorizontal, Plus } from 'lucide-react';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import type { ColumnConfig } from '../../../components/rh/ColumnasConfigModal';
import { DataTablePagination } from '../../../components/table/DataTablePagination';
import {
  getIndiceFilterControlClassName,
  IndiceFilterAdvancedSection,
  IndiceFilterBar,
  IndiceFilterDisclosureActions,
  IndiceFilterField,
  IndiceTitleBar,
  IndiceViewState,
} from '../../../components/frontend-os';
import { DEFAULT_TABLE_PAGE_SIZE_OPTIONS } from '../../../hooks/useTablePagination';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../../../components/ui/dropdown-menu';
import {
  pettyCashFundStatusClasses,
  pettyCashSettlementLineStatusClasses,
  pettyCashStatementStatusClasses,
} from '../utils/pettyCash.utils';
import type { PettyCashFundStatus, PettyCashSettlementLineStatus, PettyCashStatementStatus } from '../types/pettyCash.types';
import { usePettyCashTranslations } from '../hooks/usePettyCashTranslations';

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
          className="inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-sm font-medium text-[#147514] shadow-none transition hover:bg-[#147514] hover:text-white dark:border-slate-700 dark:bg-slate-900 dark:text-emerald-300 dark:hover:bg-emerald-700 dark:hover:text-white"
        >
          {SecondaryActionIcon ? <SecondaryActionIcon className="h-4 w-4" /> : null}
          {secondaryActionLabel}
        </button>
      ) : null}
      {actionLabel && onAction ? (
        <button
          type="button"
          onClick={onAction}
          className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-[#147514] px-4 text-sm font-medium text-white shadow-sm transition hover:bg-[#105010] dark:bg-emerald-600 dark:hover:bg-emerald-500"
        >
          <Plus className="h-4 w-4" />
          {actionLabel}
        </button>
      ) : null}
      {(tertiaryActionLabel && onTertiaryAction) || onColumns ? (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button type="button" className="inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 shadow-none transition hover:border-[#147514]/30 hover:bg-[#147514]/5 hover:text-[#147514] dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200">
              <MoreHorizontal className="h-4 w-4" />
              <HeaderActionsLabel />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56 rounded-xl p-1.5">
            {tertiaryActionLabel && onTertiaryAction ? (
              <DropdownMenuItem className="rounded-lg py-2.5" onClick={onTertiaryAction}>
                {TertiaryActionIcon ? <TertiaryActionIcon /> : null}
                {tertiaryActionLabel}
              </DropdownMenuItem>
            ) : null}
            {onColumns ? (
              <DropdownMenuItem className="rounded-lg py-2.5" onClick={onColumns}>
                <Columns3 />
                <HeaderColumnsLabel />
              </DropdownMenuItem>
            ) : null}
          </DropdownMenuContent>
        </DropdownMenu>
      ) : null}
    </div>
  );

  return (
    <IndiceTitleBar
      actions={actionLayout}
      icon={Icon ? <Icon className="h-5 w-5" /> : emoji}
      subtitle={description}
      title={title}
      tone="green"
    />
  );
}

function HeaderColumnsLabel() {
  const copy = usePettyCashTranslations();
  return <>{copy.common.columns}</>;
}

function HeaderActionsLabel() {
  const copy = usePettyCashTranslations();
  return <>{copy.common.actions}</>;
}

export function PettyCashFilterShell({
  activeAdvancedCount = 0,
  advancedContent,
  children,
  clearLabel,
  hasActiveFilters = false,
  onClear,
  resultLabel,
  subtitle,
}: {
  activeAdvancedCount?: number;
  advancedContent?: ReactNode;
  children: ReactNode;
  clearLabel?: string;
  hasActiveFilters?: boolean;
  onClear?: () => void;
  resultLabel: string;
  subtitle?: string;
}) {
  const copy = usePettyCashTranslations();
  const resolvedClearLabel = clearLabel ?? copy.common.clear;
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(activeAdvancedCount > 0);

  useEffect(() => {
    if (activeAdvancedCount > 0) setShowAdvancedFilters(true);
  }, [activeAdvancedCount]);

  const clearFilters = () => {
    onClear?.();
    setShowAdvancedFilters(false);
  };

  return (
    <IndiceFilterBar
      gridClassName="lg:grid-cols-3"
      subtitle={subtitle}
      summary={(
        <IndiceFilterDisclosureActions
          activeAdvancedCount={activeAdvancedCount}
          advancedLabel={showAdvancedFilters ? copy.common.hideMoreFilters : copy.common.moreFilters}
          clearLabel={resolvedClearLabel}
          hasActiveFilters={hasActiveFilters}
          isAdvancedOpen={showAdvancedFilters}
          onClear={clearFilters}
          onToggleAdvanced={() => setShowAdvancedFilters(current => !current)}
          resultSummary={(
            <span className="rounded-full border border-[#147514]/15 bg-[#147514]/10 px-3 py-1 text-[#147514] dark:border-emerald-900/50 dark:bg-emerald-400/10 dark:text-emerald-300">
              {resultLabel}
            </span>
          )}
          showAdvancedToggle={Boolean(advancedContent)}
          tone="green"
        />
      )}
      title={copy.common.filters}
    >
      {children}
      {advancedContent && showAdvancedFilters ? (
        <IndiceFilterAdvancedSection className="md:col-span-2 lg:col-span-3" gridClassName="xl:grid-cols-2">
          {advancedContent}
        </IndiceFilterAdvancedSection>
      ) : null}
    </IndiceFilterBar>
  );
}

export function normalizePettyCashColumns(columns: ColumnConfig[], defaultColumns: ColumnConfig[]) {
  const currentById = new Map(columns.map(column => [column.id, column]));
  const defaultsById = new Map(defaultColumns.map(column => [column.id, column]));
  const normalized = columns
    .filter(column => defaultsById.has(column.id))
    .map(column => {
      const defaultColumn = defaultsById.get(column.id)!;
      return {
        ...defaultColumn,
        visible: defaultColumn.locked ? true : column.visible,
      };
    });

  return [
    ...normalized,
    ...defaultColumns.filter(column => !currentById.has(column.id)),
  ];
}

export function usePettyCashColumns(storageKey: string, defaultColumns: ColumnConfig[]) {
  const [columns, setColumns] = useState<ColumnConfig[]>(() => {
    if (typeof window === 'undefined') return defaultColumns;
    try {
      const stored = window.localStorage.getItem(storageKey);
      return stored
        ? normalizePettyCashColumns(JSON.parse(stored) as ColumnConfig[], defaultColumns)
        : defaultColumns;
    } catch {
      return defaultColumns;
    }
  });

  useEffect(() => {
    setColumns(current => normalizePettyCashColumns(current, defaultColumns));
  }, [defaultColumns]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(storageKey, JSON.stringify(columns));
    }
  }, [columns, storageKey]);

  return {
    columns,
    setColumns,
    visibleColumns: columns.filter(column => column.visible),
  };
}

export function PettyCashField({
  children,
  label,
}: {
  children: ReactNode;
  label: string;
}) {
  return (
    <IndiceFilterField label={label}>{children}</IndiceFilterField>
  );
}

export const pettyCashInputClass = getIndiceFilterControlClassName('green');

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
          className={`inline-flex items-center gap-2 whitespace-nowrap text-xs font-medium transition-colors hover:text-slate-900 dark:hover:text-white ${isActive ? 'text-[#147514] dark:text-emerald-300' : 'text-slate-500 dark:text-slate-400'}`}
        >
          <span>{label}</span>
          <SortIcon className={`h-4 w-4 shrink-0 ${isActive ? 'text-[#147514] dark:text-emerald-300' : 'text-slate-400'}`} />
        </button>
      ) : (
        <span className="whitespace-nowrap text-xs font-medium text-slate-500 dark:text-slate-400">{label}</span>
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
        <p className={`truncate text-base font-medium ${toneClass}`}>{value}</p>
        <p className="truncate text-sm font-medium text-slate-500 dark:text-slate-400">{label}</p>
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
    <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-medium ${copy.className}`}>
      {label}
    </span>
  );
}

export function PettyCashTableShell({ children, footer }: { children: ReactNode; footer?: ReactNode }) {
  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900">
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
  return <IndiceViewState compact title={label} tone="green" variant="empty" />;
}
