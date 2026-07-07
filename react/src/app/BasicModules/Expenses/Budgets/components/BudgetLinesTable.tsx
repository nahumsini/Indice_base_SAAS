import { useMemo } from 'react';
import { FilePlus2, Pencil, Trash2 } from 'lucide-react';
import type { Expense } from '../../types/expenses.types';
import type { ColumnConfig } from '../../types/expenseView.types';
import { useFinanceTranslations } from '../../hooks/useFinanceTranslations';
import { formatCurrency, formatDate } from '../../utils/expenses.utils';
import { DataTablePagination } from '../../../../components/table/DataTablePagination';
import { useTablePagination } from '../../../../hooks/useTablePagination';

type BudgetLinesTableProps = {
  columns: ColumnConfig[];
  expenses: Expense[];
  onDeleteExpense: (expenseId: string) => void;
  onCreatePayable: (expense: Expense) => void;
  onEditExpense: (expense: Expense) => void;
};

const columnClass = 'px-4 py-3 text-left text-[11px] font-extrabold uppercase tracking-[0.14em] text-slate-500';
const cellClass = 'px-4 py-4 align-top text-sm text-slate-700';

export function BudgetLinesTable({ columns, expenses, onCreatePayable, onDeleteExpense, onEditExpense }: BudgetLinesTableProps) {
  const t = useFinanceTranslations();
  const visibleKeys = new Set(columns.filter(column => column.visible).map(column => column.key));
  const visibleColumns = budgetTableColumns(t).filter(column => visibleKeys.has(column.key) || column.key === 'actions');
  const paginationResetKey = useMemo(() => expenses.map(expense => expense.id).join('|'), [expenses]);
  const pagination = useTablePagination({
    resetKey: paginationResetKey,
    rows: expenses,
  });

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="overflow-x-auto">
        <table className="min-w-[1180px] w-full border-collapse">
          <thead className="border-b border-slate-200 bg-slate-50">
            <tr>
              {visibleColumns.map(column => (
                <th key={column.key} className={columnClass}>{column.label}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {expenses.length === 0 ? (
              <tr>
                <td colSpan={visibleColumns.length} className="px-6 py-16 text-center">
                  <div className="mx-auto max-w-md rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-6 py-10">
                    <p className="text-base font-extrabold text-slate-900">{t.budgets.messages.emptyTitle}</p>
                    <p className="mt-2 text-sm font-semibold leading-6 text-slate-500">{t.budgets.messages.emptyMessage}</p>
                  </div>
                </td>
              </tr>
            ) : pagination.paginatedRows.map(expense => (
              <BudgetLineRow
                key={expense.id}
                columns={visibleColumns}
                expense={expense}
                onCreatePayable={onCreatePayable}
                onDeleteExpense={onDeleteExpense}
                onEditExpense={onEditExpense}
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
  onCreatePayable,
  onDeleteExpense,
  onEditExpense,
}: {
  columns: ReturnType<typeof budgetTableColumns>;
  expense: Expense;
  onCreatePayable: (expense: Expense) => void;
  onDeleteExpense: (expenseId: string) => void;
  onEditExpense: (expense: Expense) => void;
}) {
  return (
    <tr className="transition hover:bg-[#147514]/[0.035]">
      {columns.map(column => (
        <td key={column.key} className={cellClass}>
          {renderBudgetCell(column.key, expense, onEditExpense, onDeleteExpense, onCreatePayable)}
        </td>
      ))}
    </tr>
  );
}

function renderBudgetCell(
  key: string,
  expense: Expense,
  onEditExpense: (expense: Expense) => void,
  onDeleteExpense: (expenseId: string) => void,
  onCreatePayable?: (expense: Expense) => void,
) {
  switch (key) {
    case 'folio':
      return (
        <div className="min-w-[120px]">
          <p className="font-extrabold text-slate-950">{expense.folio}</p>
          <p className="mt-1 text-xs font-semibold text-slate-400">{formatDate(expense.createdAt)}</p>
        </div>
      );
    case 'concept':
      return (
        <div className="max-w-[240px]">
          <p className="line-clamp-2 font-extrabold leading-5 text-slate-950">{expense.concept}</p>
          {expense.description ? <p className="mt-1 line-clamp-2 text-xs font-semibold leading-5 text-slate-500">{expense.description}</p> : null}
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
      return <HealthBadge status={expense.budgetHealthStatus} />;
    case 'status':
      return <StatusBadge status={expense.budgetStatus ?? expense.status} />;
    case 'dueDate':
      return <span className="font-semibold text-slate-700">{formatDate(expense.dueDate)}</span>;
    case 'actions':
      return (
        <div className="flex items-center justify-end gap-2">
          <button type="button" onClick={() => onCreatePayable?.(expense)} className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-cyan-200 bg-cyan-50 text-cyan-700 shadow-sm transition hover:bg-cyan-100" aria-label="Crear CxP">
            <FilePlus2 className="h-4 w-4" />
          </button>
          <button type="button" onClick={() => onEditExpense(expense)} className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-[#147514] shadow-sm transition hover:border-[#147514]/30 hover:bg-[#147514]/10" aria-label="Edit budget line">
            <Pencil className="h-4 w-4" />
          </button>
          <button type="button" onClick={() => onDeleteExpense(expense.id)} className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-red-100 bg-red-50 text-red-600 shadow-sm transition hover:bg-red-100" aria-label="Delete budget line">
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      );
    default:
      return <span className="text-slate-400">-</span>;
  }
}

function StackedText({ primary, secondary }: { primary: string; secondary?: string }) {
  return (
    <div className="max-w-[160px]">
      <p className="line-clamp-2 font-extrabold text-slate-900">{primary}</p>
      {secondary ? <p className="mt-1 line-clamp-2 text-xs font-semibold text-slate-500">{secondary}</p> : null}
    </div>
  );
}

function MoneyCell({ amount, currency, tone }: { amount: number; currency: string; tone: 'amber' | 'base' | 'blue' | 'green' | 'red' }) {
  const toneClass = {
    amber: 'text-amber-700 bg-amber-50 border-amber-100',
    base: 'text-slate-950 bg-slate-50 border-slate-200',
    blue: 'text-blue-700 bg-blue-50 border-blue-100',
    green: 'text-[#147514] bg-[#147514]/10 border-[#147514]/15',
    red: 'text-red-700 bg-red-50 border-red-100',
  }[tone];

  return (
    <span className={`inline-flex min-w-[112px] justify-end rounded-xl border px-3 py-2 text-sm font-extrabold ${toneClass}`}>
      {formatCurrency(amount, currency)}
    </span>
  );
}

function HealthBadge({ status }: { status?: string }) {
  const normalizedStatus = status ?? 'ON_TRACK';
  const className = normalizedStatus === 'EXCEEDED'
    ? 'border-red-200 bg-red-50 text-red-700'
    : normalizedStatus === 'WARNING'
      ? 'border-amber-200 bg-amber-50 text-amber-700'
      : 'border-emerald-200 bg-emerald-50 text-emerald-700';

  return (
    <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-extrabold ${className}`}>
      {toTitleCase(normalizedStatus)}
    </span>
  );
}

function StatusBadge({ status }: { status: string }) {
  return (
    <span className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-extrabold text-slate-600">
      {toTitleCase(status)}
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

function budgetTableColumns(t: ReturnType<typeof useFinanceTranslations>) {
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
