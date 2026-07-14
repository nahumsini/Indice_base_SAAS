import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, ArrowDown, ArrowUp, ArrowUpDown, RefreshCw, Trash2, Pencil, X } from 'lucide-react';
import type { ColumnConfig } from '../../types/expenseView.types';
import { useBudgetsTranslations } from '../hooks/useBudgetsTranslations';
import { formatCurrency, formatDate } from '../../utils/expenses.utils';
import { DataTablePagination } from '../../../../components/table/DataTablePagination';
import { useTablePagination } from '../../../../hooks/useTablePagination';
import { Checkbox } from '../../../../components/ui/checkbox';
import { Button } from '../../../../components/ui/button';
import { useExpenseRowSelection } from '../../hooks/useExpenseRowSelection';
import type { BudgetLineTableRow } from '../types/budgetLineTable.types';

type BudgetLinesTableProps = {
  budgetLines: BudgetLineTableRow[];
  columns: ColumnConfig[];
  errorMessage?: string;
  onDeleteBudgetLine: (budgetLineId: string) => void;
  onDeleteBudgetLines: (budgetLineIds: string[]) => void;
  onEditBudgetLine: (budgetLineId: string) => void;
  onRetry?: () => void;
};

const columnClass = 'px-5 py-4 text-left align-middle text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400';
const cellClass = 'px-6 py-4 align-middle text-sm text-slate-700 dark:text-slate-200';
type BudgetSortDirection = 'asc' | 'desc';

export function BudgetLinesTable({ budgetLines, columns, errorMessage, onDeleteBudgetLine, onDeleteBudgetLines, onEditBudgetLine, onRetry }: BudgetLinesTableProps) {
  const t = useBudgetsTranslations();
  const [sortDirection, setSortDirection] = useState<BudgetSortDirection>('asc');
  const [sortField, setSortField] = useState('dueDate');
  const visibleColumns = useMemo(() => {
    const definitions = new Map(budgetTableColumns(t).map(column => [column.key, column]));
    const configuredColumns = columns
      .filter(column => column.visible && column.key !== 'actions')
      .map(column => definitions.get(column.key))
      .filter((column): column is { key: string; label: string } => Boolean(column));
    const actionsColumn = definitions.get('actions');

    return actionsColumn ? [...configuredColumns, actionsColumn] : configuredColumns;
  }, [columns, t]);
  const sortedBudgetLines = useMemo(
    () => sortBudgetLines(budgetLines, sortField, sortDirection),
    [budgetLines, sortDirection, sortField],
  );
  const paginationResetKey = useMemo(
    () => `${sortField}:${sortDirection}:${budgetLines.map(budgetLine => budgetLine.id).join('|')}`,
    [budgetLines, sortDirection, sortField],
  );
  const pagination = useTablePagination({
    resetKey: paginationResetKey,
    rows: sortedBudgetLines,
  });
  const rowSelection = useExpenseRowSelection<string>();
  const visibleBudgetLineIds = useMemo(() => pagination.paginatedRows.map(budgetLine => budgetLine.id), [pagination.paginatedRows]);
  const visibleSelection = rowSelection.visibleSelectionState(visibleBudgetLineIds);

  useEffect(() => {
    rowSelection.pruneSelection(budgetLines.map(budgetLine => budgetLine.id));
  }, [budgetLines, rowSelection.pruneSelection]);

  const handleDeleteSelected = () => {
    onDeleteBudgetLines(rowSelection.selectedIdList);
    rowSelection.clearSelection();
  };

  const handleSort = (field: string) => {
    if (field === 'actions') return;
    if (sortField === field) {
      setSortDirection(current => current === 'asc' ? 'desc' : 'asc');
      return;
    }
    setSortField(field);
    setSortDirection('asc');
  };

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
      {rowSelection.selectedCount > 0 ? (
        <BudgetBulkActionsBar
          selectedCount={rowSelection.selectedCount}
          onClearSelection={rowSelection.clearSelection}
          onDeleteSelected={handleDeleteSelected}
        />
      ) : null}
      {errorMessage ? (
        <section role="alert" className="flex flex-col gap-3 border-b border-amber-200 bg-amber-50 px-5 py-4 dark:border-amber-900/60 dark:bg-amber-950/25 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-start gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-amber-200 bg-white text-amber-700 dark:border-amber-900/60 dark:bg-slate-900 dark:text-amber-300">
              <AlertTriangle className="h-4 w-4" />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-extrabold text-amber-950 dark:text-amber-100">{t.budgets.messages.loadErrorTitle}</p>
              <p className="mt-1 text-sm font-medium leading-5 text-amber-800 dark:text-amber-200">{t.budgets.messages.loadErrorDescription}</p>
              <p className="mt-1 break-words text-xs font-semibold text-amber-700/80 dark:text-amber-300/80">{errorMessage}</p>
            </div>
          </div>
          {onRetry ? (
            <button type="button" onClick={onRetry} className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-xl border border-amber-300 bg-white px-4 text-sm font-bold text-amber-800 transition hover:bg-amber-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/40 dark:border-amber-800 dark:bg-slate-900 dark:text-amber-200 dark:hover:bg-amber-950/50">
              <RefreshCw className="h-4 w-4" />
              {t.budgets.messages.retryLoad}
            </button>
          ) : null}
        </section>
      ) : null}
      <div className="overflow-x-auto">
        <table className="min-w-[1220px] w-full border-collapse">
          <thead className="border-b border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-900/60">
            <tr>
              <th className="w-14 px-5 py-4 text-left align-middle">
                <Checkbox
                  aria-label={t.budgets.table.allVisibleSelection}
                  checked={visibleSelection.someVisibleSelected ? 'indeterminate' : visibleSelection.allVisibleSelected}
                  onCheckedChange={(checked) => rowSelection.toggleAllVisible(visibleBudgetLineIds, checked === true)}
                  className="border-slate-300 data-[state=checked]:border-[#147514] data-[state=checked]:bg-[#147514]"
                />
              </th>
              {visibleColumns.map(column => {
                const isActions = column.key === 'actions';
                const isActive = sortField === column.key;
                const SortIcon = !isActive ? ArrowUpDown : sortDirection === 'asc' ? ArrowUp : ArrowDown;

                return (
                  <th
                    key={column.key}
                    className={`${columnClass} ${isActions ? 'text-right' : ''}`}
                    aria-sort={isActions ? undefined : isActive ? (sortDirection === 'asc' ? 'ascending' : 'descending') : 'none'}
                  >
                    {isActions ? column.label : (
                      <button
                        type="button"
                        onClick={() => handleSort(column.key)}
                        className={`inline-flex items-center gap-2 whitespace-nowrap text-[11px] font-semibold uppercase tracking-[0.12em] transition-colors hover:text-slate-900 dark:hover:text-white ${isActive ? 'text-[#147514] dark:text-emerald-300' : ''}`}
                      >
                        <span>{column.label}</span>
                        <SortIcon className={`h-4 w-4 shrink-0 ${isActive ? 'text-[#147514] dark:text-emerald-300' : 'text-slate-400'}`} />
                      </button>
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
            {budgetLines.length === 0 ? (
              <tr>
                <td colSpan={visibleColumns.length + 1} className="px-6 py-16 text-center">
                  <div className="mx-auto max-w-md rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-6 py-10 dark:border-slate-700 dark:bg-slate-800/70">
                    <p className="text-base font-extrabold text-slate-900 dark:text-white">{t.budgets.messages.emptyTitle}</p>
                    <p className="mt-2 text-sm font-semibold leading-6 text-slate-500 dark:text-slate-400">{t.budgets.messages.emptyMessage}</p>
                  </div>
                </td>
              </tr>
            ) : pagination.paginatedRows.map(budgetLine => (
              <BudgetLineRow
                key={budgetLine.id}
                budgetLine={budgetLine}
                columns={visibleColumns}
                isSelected={rowSelection.isSelected(budgetLine.id)}
                t={t}
                onDeleteBudgetLine={onDeleteBudgetLine}
                onEditBudgetLine={onEditBudgetLine}
                onSelectionChange={(selected) => rowSelection.toggleSelection(budgetLine.id, selected)}
              />
            ))}
          </tbody>
        </table>
      </div>
      <DataTablePagination
        currentPage={pagination.currentPage}
        labels={{
          next: t.common.next,
          page: (current, total) => `${current} / ${total}`,
          previous: t.common.previous,
          rowsPerPage: t.common.rowsPerPage,
          showing: (start, end, total) => t.common.showing(start, end, total),
        }}
        onPageChange={pagination.onPageChange}
        onPageSizeChange={pagination.onPageSizeChange}
        pageEnd={pagination.pageEnd}
        pageSize={pagination.pageSize}
        pageSizeOptions={pagination.pageSizeOptions}
        pageStart={pagination.pageStart}
        totalCount={pagination.totalCount}
        totalPages={pagination.totalPages}
      />
    </div>
  );
}

function BudgetLineRow({
  budgetLine,
  columns,
  isSelected,
  t,
  onDeleteBudgetLine,
  onEditBudgetLine,
  onSelectionChange,
}: {
  budgetLine: BudgetLineTableRow;
  columns: ReturnType<typeof budgetTableColumns>;
  isSelected: boolean;
  t: ReturnType<typeof useBudgetsTranslations>;
  onDeleteBudgetLine: (budgetLineId: string) => void;
  onEditBudgetLine: (budgetLineId: string) => void;
  onSelectionChange: (selected: boolean) => void;
}) {
  return (
    <tr className={`transition hover:bg-[#147514]/[0.035] dark:hover:bg-[#147514]/10 ${isSelected ? 'bg-[#147514]/5 dark:bg-[#147514]/10' : ''}`}>
      <td className="px-5 py-4 align-middle">
        <Checkbox
          aria-label={t.budgets.table.selectBudgetLine(budgetLine.folio)}
          checked={isSelected}
          onCheckedChange={(checked) => onSelectionChange(checked === true)}
          className="border-slate-300 data-[state=checked]:border-[#147514] data-[state=checked]:bg-[#147514]"
        />
      </td>
      {columns.map(column => (
        <td key={column.key} className={cellClass}>
          {renderBudgetCell(column.key, budgetLine, t, onEditBudgetLine, onDeleteBudgetLine)}
        </td>
      ))}
    </tr>
  );
}

function BudgetBulkActionsBar({
  selectedCount,
  onClearSelection,
  onDeleteSelected,
}: {
  selectedCount: number;
  onClearSelection: () => void;
  onDeleteSelected: () => void;
}) {
  const t = useBudgetsTranslations();

  return (
    <section className="border-b border-[#147514]/20 bg-[#147514]/10 px-4 py-3 dark:border-[#147514]/40 dark:bg-[#147514]/15">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <span className="w-fit rounded-full border border-[#147514]/30 bg-white px-3 py-1 text-sm font-extrabold text-[#147514] dark:bg-slate-800 dark:text-emerald-200">
          {t.budgets.summary.selectedRows(selectedCount)}
        </span>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            className="h-9 rounded-xl border-red-200 bg-red-50 px-3 text-sm font-semibold text-red-700 shadow-none hover:bg-red-100 dark:border-red-900/60 dark:bg-red-950/60 dark:text-red-300"
            onClick={onDeleteSelected}
          >
            <Trash2 className="h-4 w-4" />
            {t.common.delete}
          </Button>
          <Button
            type="button"
            variant="outline"
            className="h-9 rounded-xl border-slate-200 bg-white px-3 text-sm font-semibold text-slate-600 shadow-none hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
            onClick={onClearSelection}
          >
            <X className="h-4 w-4" />
            {t.common.cancel}
          </Button>
        </div>
      </div>
    </section>
  );
}

function renderBudgetCell(
  key: string,
  budgetLine: BudgetLineTableRow,
  t: ReturnType<typeof useBudgetsTranslations>,
  onEditBudgetLine: (budgetLineId: string) => void,
  onDeleteBudgetLine: (budgetLineId: string) => void,
) {
  switch (key) {
    case 'folio':
      return (
        <div className="min-w-[120px]">
          <p className="font-mono font-medium text-gray-900 dark:text-gray-100">{budgetLine.folio}</p>
          <p className="mt-1 text-xs font-medium text-slate-400 dark:text-slate-500">{formatDate(budgetLine.createdAt)}</p>
        </div>
      );
    case 'concept':
      return (
        <div className="max-w-[240px]">
          <p className="line-clamp-2 font-semibold leading-5 text-slate-800 dark:text-slate-100">{budgetLine.concept}</p>
          {budgetLine.description ? <p className="mt-1 line-clamp-2 text-xs font-medium leading-5 text-slate-500 dark:text-slate-400">{budgetLine.description}</p> : null}
        </div>
      );
    case 'businessUnit':
      return <StackedText primary={budgetLine.businessUnit || '-'} secondary={budgetLine.business || undefined} />;
    case 'providerName':
      return <span className="line-clamp-2 max-w-[180px] font-semibold">{budgetLine.providerName || '-'}</span>;
    case 'accountingAccount':
      return <span className="line-clamp-2 max-w-[200px] font-semibold">{budgetLine.accountingAccount || '-'}</span>;
    case 'plannedAmount':
    case 'total':
      return <MoneyCell amount={budgetLine.plannedAmount} currency={budgetLine.currency} tone="base" />;
    case 'committedAmount':
      return <MoneyCell amount={budgetLine.committedAmount} currency={budgetLine.currency} tone="amber" />;
    case 'actualExpenseAmount':
      return <MoneyCell amount={budgetLine.actualExpenseAmount} currency={budgetLine.currency} tone="blue" />;
    case 'availableAmount':
      return <MoneyCell amount={budgetLine.availableAmount} currency={budgetLine.currency} tone={budgetLine.availableAmount < 0 ? 'red' : 'green'} />;
    case 'health':
      return <HealthBadge status={budgetLine.healthStatus} t={t} />;
    case 'status':
      return <StatusBadge status={budgetLine.status} t={t} />;
    case 'dueDate':
      return <span className="font-semibold text-slate-700 dark:text-slate-200">{formatDate(budgetLine.dueDate)}</span>;
    case 'actions':
      return (
        <div className="inline-flex items-center justify-center gap-2 rounded-[22px] border border-slate-200 bg-white px-3 py-2 shadow-sm dark:border-slate-700 dark:bg-slate-900">
          <button type="button" onClick={() => onEditBudgetLine(budgetLine.id)} className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-amber-200 bg-amber-50/80 text-amber-700 transition-all hover:-translate-y-0.5 hover:bg-amber-100 hover:shadow-sm dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-300" aria-label={t.budgets.rowActions.editLine} title={t.budgets.rowActions.editLine}>
            <Pencil className="h-4 w-4" />
          </button>
          <button type="button" onClick={() => onDeleteBudgetLine(budgetLine.id)} className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-rose-100 bg-rose-50/60 text-rose-600 transition-all hover:-translate-y-0.5 hover:bg-rose-100 hover:shadow-sm dark:border-rose-900/40 dark:bg-rose-950/20 dark:text-rose-300" aria-label={t.budgets.rowActions.deleteLine} title={t.budgets.rowActions.deleteLine}>
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      );
    default:
      return <span className="text-slate-400 dark:text-slate-500">-</span>;
  }
}

function StackedText({ primary, secondary }: { primary: string; secondary?: string }) {
  return (
    <div className="max-w-[160px]">
      <p className="line-clamp-2 font-semibold text-slate-800 dark:text-slate-100">{primary}</p>
      {secondary ? <p className="mt-1 line-clamp-2 text-xs font-medium text-slate-500 dark:text-slate-400">{secondary}</p> : null}
    </div>
  );
}

function MoneyCell({ amount, currency, tone }: { amount: number; currency: string; tone: 'amber' | 'base' | 'blue' | 'green' | 'red' }) {
  const toneClass = {
    amber: 'text-amber-700 bg-amber-50 border-amber-100 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-300',
    base: 'text-slate-950 bg-slate-50 border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100',
    blue: 'text-blue-700 bg-blue-50 border-blue-100 dark:border-blue-900/60 dark:bg-blue-950/30 dark:text-blue-300',
    green: 'text-[#147514] bg-[#147514]/10 border-[#147514]/15 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-300',
    red: 'text-red-700 bg-red-50 border-red-100 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-300',
  }[tone];

  return (
    <span className={`inline-flex min-w-[112px] justify-end rounded-xl border px-3 py-2 text-sm font-semibold ${toneClass}`}>
      {formatCurrency(amount, currency)}
    </span>
  );
}

function HealthBadge({ status, t }: { status?: string; t: ReturnType<typeof useBudgetsTranslations> }) {
  const normalizedStatus = status ?? 'ON_TRACK';
  const className = normalizedStatus === 'EXCEEDED'
    ? 'border-red-200 bg-red-50 text-red-700 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-300'
    : normalizedStatus === 'WARNING'
      ? 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-300'
      : 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-300';

  return (
    <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${className}`}>
      {t.budgets.healthLabels[normalizedStatus] ?? toTitleCase(normalizedStatus)}
    </span>
  );
}

function StatusBadge({ status, t }: { status: string; t: ReturnType<typeof useBudgetsTranslations> }) {
  const normalizedStatus = status ?? 'ACTIVE';
  const className = normalizedStatus === 'CLOSED' || normalizedStatus === 'ARCHIVED'
    ? 'border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300'
    : normalizedStatus === 'DRAFT'
      ? 'border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900/60 dark:bg-blue-950/30 dark:text-blue-300'
      : normalizedStatus === 'overdue'
        ? 'border-red-200 bg-red-50 text-red-700 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-300'
        : 'border-[#147514]/20 bg-[#147514]/10 text-[#147514] dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-300';

  return (
    <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${className}`}>
      {t.budgets.statusLabels[normalizedStatus] ?? toTitleCase(normalizedStatus)}
    </span>
  );
}

function toTitleCase(value: string) {
  return value
    .toLowerCase()
    .split('_')
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function sortBudgetLines(budgetLines: BudgetLineTableRow[], field: string, direction: BudgetSortDirection) {
  const multiplier = direction === 'asc' ? 1 : -1;

  return [...budgetLines].sort((left, right) => {
    const leftValue = getBudgetSortValue(left, field);
    const rightValue = getBudgetSortValue(right, field);
    const comparison = typeof leftValue === 'number' && typeof rightValue === 'number'
      ? leftValue - rightValue
      : String(leftValue).localeCompare(String(rightValue), undefined, { numeric: true, sensitivity: 'base' });

    return comparison === 0
      ? left.folio.localeCompare(right.folio, undefined, { numeric: true })
      : comparison * multiplier;
  });
}

function getBudgetSortValue(budgetLine: BudgetLineTableRow, field: string): number | string {
  switch (field) {
    case 'folio': return budgetLine.folio;
    case 'concept': return budgetLine.concept;
    case 'businessUnit': return `${budgetLine.businessUnit} ${budgetLine.business}`;
    case 'providerName': return budgetLine.providerName ?? '';
    case 'accountingAccount': return budgetLine.accountingAccount ?? '';
    case 'plannedAmount':
    case 'total': return budgetLine.plannedAmount;
    case 'committedAmount': return budgetLine.committedAmount;
    case 'actualExpenseAmount': return budgetLine.actualExpenseAmount;
    case 'availableAmount': return budgetLine.availableAmount;
    case 'health': return budgetLine.healthStatus ?? 'ON_TRACK';
    case 'status': return budgetLine.status;
    case 'dueDate': return budgetLine.dueDate?.getTime() ?? 0;
    default: return '';
  }
}

function budgetTableColumns(t: ReturnType<typeof useBudgetsTranslations>) {
  return [
    { key: 'folio', label: t.budgets.columns.folio.label },
    { key: 'concept', label: t.budgets.columns.concept.label },
    { key: 'businessUnit', label: t.budgets.columns.businessUnit.label },
    { key: 'providerName', label: t.budgets.columns.providerName.label },
    { key: 'accountingAccount', label: t.budgets.columns.accountingAccount.label },
    { key: 'plannedAmount', label: t.budgets.planned },
    { key: 'committedAmount', label: t.budgets.committed },
    { key: 'actualExpenseAmount', label: t.budgets.actual },
    { key: 'availableAmount', label: t.budgets.available },
    { key: 'health', label: t.budgets.health },
    { key: 'status', label: t.filters.status },
    { key: 'dueDate', label: t.budgets.columns.dueDate.label },
    { key: 'actions', label: t.budgets.columns.actions.label },
  ];
}
