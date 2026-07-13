import { useEffect, useMemo } from 'react';
import { FilePlus2, Trash2, Pencil, X } from 'lucide-react';
import type { Expense } from '../../types/expenses.types';
import type { ColumnConfig } from '../../types/expenseView.types';
import { useBudgetsTranslations } from '../hooks/useBudgetsTranslations';
import { formatCurrency, formatDate } from '../../utils/expenses.utils';
import { DataTablePagination } from '../../../../components/table/DataTablePagination';
import { useTablePagination } from '../../../../hooks/useTablePagination';
import { Checkbox } from '../../../../components/ui/checkbox';
import { Button } from '../../../../components/ui/button';
import { useExpenseRowSelection } from '../../hooks/useExpenseRowSelection';

type BudgetLinesTableProps = {
  columns: ColumnConfig[];
  expenses: Expense[];
  onDeleteExpense: (expenseId: string) => void;
  onDeleteExpenses: (expenseIds: string[]) => void;
  onCreatePayable: (expense: Expense) => void;
  onEditExpense: (expense: Expense) => void;
};

const columnClass = 'px-4 py-3 text-left text-[11px] font-extrabold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400';
const cellClass = 'px-4 py-4 align-top text-sm text-slate-700 dark:text-slate-200';

export function BudgetLinesTable({ columns, expenses, onCreatePayable, onDeleteExpense, onDeleteExpenses, onEditExpense }: BudgetLinesTableProps) {
  const t = useBudgetsTranslations();
  const visibleKeys = new Set(columns.filter(column => column.visible).map(column => column.key));
  const visibleColumns = budgetTableColumns(t).filter(column => visibleKeys.has(column.key) || column.key === 'actions');
  const paginationResetKey = useMemo(() => expenses.map(expense => expense.id).join('|'), [expenses]);
  const pagination = useTablePagination({
    resetKey: paginationResetKey,
    rows: expenses,
  });
  const rowSelection = useExpenseRowSelection<string>();
  const visibleExpenseIds = useMemo(() => pagination.paginatedRows.map(expense => expense.id), [pagination.paginatedRows]);
  const visibleSelection = rowSelection.visibleSelectionState(visibleExpenseIds);

  useEffect(() => {
    rowSelection.pruneSelection(expenses.map(expense => expense.id));
  }, [expenses, rowSelection.pruneSelection]);

  const handleDeleteSelected = () => {
    onDeleteExpenses(rowSelection.selectedIdList);
    rowSelection.clearSelection();
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
      <div className="overflow-x-auto">
        <table className="min-w-[1220px] w-full border-collapse">
          <thead className="border-b border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800">
            <tr>
              <th className="w-12 px-4 py-3 text-left">
                <Checkbox
                  aria-label={t.budgets.table.allVisibleSelection}
                  checked={visibleSelection.someVisibleSelected ? 'indeterminate' : visibleSelection.allVisibleSelected}
                  onCheckedChange={(checked) => rowSelection.toggleAllVisible(visibleExpenseIds, checked === true)}
                  className="border-slate-300 data-[state=checked]:border-[#147514] data-[state=checked]:bg-[#147514]"
                />
              </th>
              {visibleColumns.map(column => (
                <th key={column.key} className={columnClass}>{column.label}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {expenses.length === 0 ? (
              <tr>
                <td colSpan={visibleColumns.length + 1} className="px-6 py-16 text-center">
                  <div className="mx-auto max-w-md rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-6 py-10 dark:border-slate-700 dark:bg-slate-800/70">
                    <p className="text-base font-extrabold text-slate-900 dark:text-white">{t.budgets.messages.emptyTitle}</p>
                    <p className="mt-2 text-sm font-semibold leading-6 text-slate-500 dark:text-slate-400">{t.budgets.messages.emptyMessage}</p>
                  </div>
                </td>
              </tr>
            ) : pagination.paginatedRows.map(expense => (
              <BudgetLineRow
                key={expense.id}
                columns={visibleColumns}
                expense={expense}
                isSelected={rowSelection.isSelected(expense.id)}
                t={t}
                onCreatePayable={onCreatePayable}
                onDeleteExpense={onDeleteExpense}
                onEditExpense={onEditExpense}
                onSelectionChange={(selected) => rowSelection.toggleSelection(expense.id, selected)}
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
  columns,
  expense,
  isSelected,
  t,
  onCreatePayable,
  onDeleteExpense,
  onEditExpense,
  onSelectionChange,
}: {
  columns: ReturnType<typeof budgetTableColumns>;
  expense: Expense;
  isSelected: boolean;
  t: ReturnType<typeof useBudgetsTranslations>;
  onCreatePayable: (expense: Expense) => void;
  onDeleteExpense: (expenseId: string) => void;
  onEditExpense: (expense: Expense) => void;
  onSelectionChange: (selected: boolean) => void;
}) {
  return (
    <tr className={`transition hover:bg-[#147514]/[0.035] dark:hover:bg-[#147514]/10 ${isSelected ? 'bg-[#147514]/5 dark:bg-[#147514]/10' : ''}`}>
      <td className="px-4 py-4 align-top">
        <Checkbox
          aria-label={t.budgets.table.selectBudgetLine(expense.folio)}
          checked={isSelected}
          onCheckedChange={(checked) => onSelectionChange(checked === true)}
          className="border-slate-300 data-[state=checked]:border-[#147514] data-[state=checked]:bg-[#147514]"
        />
      </td>
      {columns.map(column => (
        <td key={column.key} className={cellClass}>
          {renderBudgetCell(column.key, expense, t, onEditExpense, onDeleteExpense, onCreatePayable)}
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
  expense: Expense,
  t: ReturnType<typeof useBudgetsTranslations>,
  onEditExpense: (expense: Expense) => void,
  onDeleteExpense: (expenseId: string) => void,
  onCreatePayable?: (expense: Expense) => void,
) {
  switch (key) {
    case 'folio':
      return (
        <div className="min-w-[120px]">
          <p className="font-extrabold text-slate-950 dark:text-white">{expense.folio}</p>
          <p className="mt-1 text-xs font-semibold text-slate-400 dark:text-slate-500">{formatDate(expense.createdAt)}</p>
        </div>
      );
    case 'concept':
      return (
        <div className="max-w-[240px]">
          <p className="line-clamp-2 font-extrabold leading-5 text-slate-950 dark:text-white">{expense.concept}</p>
          {expense.description ? <p className="mt-1 line-clamp-2 text-xs font-semibold leading-5 text-slate-500 dark:text-slate-400">{expense.description}</p> : null}
        </div>
      );
    case 'businessUnit':
      return <StackedText primary={expense.businessUnit || '-'} secondary={expense.business || undefined} />;
    case 'providerName':
      return <span className="line-clamp-2 max-w-[180px] font-semibold">{expense.providerName || '-'}</span>;
    case 'accountingAccount':
      return <span className="line-clamp-2 max-w-[200px] font-semibold">{expense.accountingAccount || '-'}</span>;
    case 'plannedAmount':
    case 'total':
      return <MoneyCell amount={expense.total} currency={expense.currency} tone="base" />;
    case 'committedAmount':
      return <MoneyCell amount={expense.committedAmount ?? 0} currency={expense.currency} tone="amber" />;
    case 'actualExpenseAmount':
      return <MoneyCell amount={expense.actualExpenseAmount ?? expense.amountPaid ?? 0} currency={expense.currency} tone="blue" />;
    case 'availableAmount':
      return <MoneyCell amount={expense.availableAmount ?? expense.total} currency={expense.currency} tone={(expense.availableAmount ?? 0) < 0 ? 'red' : 'green'} />;
    case 'health':
      return <HealthBadge status={expense.budgetHealthStatus} t={t} />;
    case 'status':
      return <StatusBadge status={expense.budgetStatus ?? expense.status} t={t} />;
    case 'dueDate':
      return <span className="font-semibold text-slate-700 dark:text-slate-200">{formatDate(expense.dueDate)}</span>;
    case 'actions':
      return (
        <div className="flex items-center justify-end gap-2">
          <button type="button" onClick={() => onCreatePayable?.(expense)} className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-cyan-200 bg-cyan-50 text-cyan-700 shadow-sm transition hover:bg-cyan-100 dark:border-cyan-900/60 dark:bg-cyan-950/40 dark:text-cyan-300" aria-label={t.budgets.rowActions.createPayable} title={t.budgets.rowActions.createPayable}>
            <FilePlus2 className="h-4 w-4" />
          </button>
          <button type="button" onClick={() => onEditExpense(expense)} className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-[#147514] shadow-sm transition hover:border-[#147514]/30 hover:bg-[#147514]/10 dark:border-slate-700 dark:bg-slate-800 dark:text-emerald-300 dark:hover:border-emerald-700 dark:hover:bg-emerald-950/40" aria-label={t.budgets.rowActions.editLine} title={t.budgets.rowActions.editLine}>
            <Pencil className="h-4 w-4" />
          </button>
          <button type="button" onClick={() => onDeleteExpense(expense.id)} className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-red-100 bg-red-50 text-red-600 shadow-sm transition hover:bg-red-100 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300" aria-label={t.budgets.rowActions.deleteLine} title={t.budgets.rowActions.deleteLine}>
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
      <p className="line-clamp-2 font-extrabold text-slate-900 dark:text-white">{primary}</p>
      {secondary ? <p className="mt-1 line-clamp-2 text-xs font-semibold text-slate-500 dark:text-slate-400">{secondary}</p> : null}
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
    <span className={`inline-flex min-w-[112px] justify-end rounded-xl border px-3 py-2 text-sm font-extrabold ${toneClass}`}>
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
    <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-extrabold ${className}`}>
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
    <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-extrabold ${className}`}>
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
