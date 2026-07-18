import { useMemo, useState } from 'react';
import { ArrowDown, ArrowUp, ArrowUpDown, CheckCircle2, FileCheck2, Printer, RotateCcw, ShieldCheck, Trash2 } from 'lucide-react';
import type { CashFund, PettyCashExpense } from '../../types/pettyCash.types';
import {
  formatPettyCashCurrency,
  formatPettyCashDate,
  pettyCashAuditStatusClasses,
  pettyCashAuditStatusLabels,
  pettyCashStatusClasses,
  pettyCashStatusLabels,
} from '../../utils/pettyCash.utils';
import { PettyCashPagination } from '../../components/PettyCashShared';
import { useTablePagination } from '../../../../hooks/useTablePagination';
import { printPettyCashExpenseVoucher } from '../../utils/pettyCashExpensePrintDocument';

export interface PettyCashColumnConfig {
  key: string;
  label: string;
  visible: boolean;
  sortKey?: keyof PettyCashExpense;
  align?: 'left' | 'right' | 'center';
}

type SortDirection = 'asc' | 'desc' | null;

interface PettyCashExpenseTableProps {
  columns: PettyCashColumnConfig[];
  expenses: PettyCashExpense[];
  funds?: CashFund[];
  onAuditExpense: (expenseId: string) => void;
  onDeleteExpense: (expenseId: string) => void;
  onRegisterReceipt: (expenseId: string) => void;
  onRejectExpense: (expenseId: string) => void;
  onSettleExpense: (expenseId: string) => void;
}

const compareValues = (leftValue: unknown, rightValue: unknown, direction: Exclude<SortDirection, null>) => {
  const multiplier = direction === 'asc' ? 1 : -1;

  if (leftValue instanceof Date && rightValue instanceof Date) {
    return (leftValue.getTime() - rightValue.getTime()) * multiplier;
  }

  if (typeof leftValue === 'number' && typeof rightValue === 'number') {
    return (leftValue - rightValue) * multiplier;
  }

  return String(leftValue ?? '').localeCompare(String(rightValue ?? '')) * multiplier;
};

export function PettyCashExpenseTable({
  columns,
  expenses,
  funds = [],
  onAuditExpense,
  onDeleteExpense,
  onRegisterReceipt,
  onRejectExpense,
  onSettleExpense,
}: PettyCashExpenseTableProps) {
  const [sortDirection, setSortDirection] = useState<SortDirection>(null);
  const [sortField, setSortField] = useState<keyof PettyCashExpense | null>(null);

  const visibleColumns = columns.filter(column => column.visible);

  const sortedExpenses = useMemo(() => {
    if (!sortField || !sortDirection) return expenses;

    return [...expenses].sort((leftExpense, rightExpense) =>
      compareValues(leftExpense[sortField], rightExpense[sortField], sortDirection),
    );
  }, [expenses, sortDirection, sortField]);
  const paginationResetKey = useMemo(
    () => `${sortField ?? 'none'}:${sortDirection ?? 'none'}:${expenses.map(expense => expense.id).join('|')}`,
    [expenses, sortDirection, sortField],
  );
  const pagination = useTablePagination({
    resetKey: paginationResetKey,
    rows: sortedExpenses,
  });

  const handleSort = (field?: keyof PettyCashExpense) => {
    if (!field) return;

    if (sortField === field) {
      if (sortDirection === 'asc') {
        setSortDirection('desc');
        return;
      }

      if (sortDirection === 'desc') {
        setSortDirection(null);
        setSortField(null);
        return;
      }
    }

    setSortField(field);
    setSortDirection('asc');
  };

  const getSortIcon = (field?: keyof PettyCashExpense) => {
    if (!field) return null;
    if (sortField !== field) return <ArrowUpDown className="h-4 w-4 text-gray-400" />;
    if (sortDirection === 'asc') return <ArrowUp className="h-4 w-4 text-[#147514]" />;
    return <ArrowDown className="h-4 w-4 text-[#147514]" />;
  };

  const renderCell = (expense: PettyCashExpense, columnKey: string) => {
    switch (columnKey) {
      case 'folio':
        return <span className="font-semibold text-gray-900 dark:text-white">{expense.folio}</span>;
      case 'cashFundName':
        return (
          <div>
            <p className="font-semibold text-gray-900 dark:text-white">{expense.cashFundName}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">{expense.businessUnit} / {expense.business}</p>
          </div>
        );
      case 'collaborator':
        return (
          <div>
            <p className="font-semibold text-gray-900 dark:text-white">{expense.collaborator}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">{expense.department}</p>
          </div>
        );
      case 'concept':
        return (
          <div className="max-w-xs">
            <p className="truncate font-semibold text-gray-900 dark:text-white">{expense.concept}</p>
            <p className="truncate text-xs text-gray-500 dark:text-gray-400">{expense.description}</p>
          </div>
        );
      case 'amountIssued':
        return <span className="font-bold text-gray-900 dark:text-white">{formatPettyCashCurrency(expense.amountIssued)}</span>;
      case 'amountSettled':
        return <span>{formatPettyCashCurrency(expense.amountSettled)}</span>;
      case 'balance':
        return (
          <span className={expense.balance > 0 ? 'font-bold text-amber-600 dark:text-amber-300' : 'font-bold text-green-600 dark:text-green-300'}>
            {formatPettyCashCurrency(expense.balance)}
          </span>
        );
      case 'status':
        return (
          <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${pettyCashStatusClasses[expense.status]}`}>
            {pettyCashStatusLabels[expense.status]}
          </span>
        );
      case 'auditStatus':
        return (
          <div>
            <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${pettyCashAuditStatusClasses[expense.auditStatus]}`}>
              {pettyCashAuditStatusLabels[expense.auditStatus]}
            </span>
            {expense.auditNotes && (
              <p className="mt-1 max-w-[220px] truncate text-xs text-gray-500 dark:text-gray-400">{expense.auditNotes}</p>
            )}
          </div>
        );
      case 'dueDate':
        return <span>{formatPettyCashDate(expense.dueDate)}</span>;
      case 'receipts':
        return (
          <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-1 text-xs font-semibold text-gray-700 dark:bg-gray-700 dark:text-gray-200">
            {expense.receiptCount} file{expense.receiptCount === 1 ? '' : 's'}
          </span>
        );
      case 'approver':
        return <span>{expense.approver}</span>;
      case 'actions':
        return (
          <div className="flex justify-end gap-1">
            <button
              type="button"
              onClick={() => printPettyCashExpenseVoucher(expense, funds.find((fund) => fund.id === expense.cashFundId))}
              className="rounded-lg p-2 text-[#147514] transition hover:bg-emerald-50 dark:text-emerald-300 dark:hover:bg-emerald-900/20"
              title="Imprimir comprobante / Print voucher"
            >
              <Printer className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => onAuditExpense(expense.id)}
              className="rounded-lg p-2 text-purple-600 transition hover:bg-purple-50 dark:text-purple-300 dark:hover:bg-purple-900/20"
              title="Audit inside Petty Cash"
            >
              <ShieldCheck className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => onRegisterReceipt(expense.id)}
              className="rounded-lg p-2 text-blue-600 transition hover:bg-blue-50 dark:text-blue-300 dark:hover:bg-blue-900/20"
              title="Register receipt"
            >
              <FileCheck2 className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => onSettleExpense(expense.id)}
              className="rounded-lg p-2 text-green-600 transition hover:bg-green-50 dark:text-green-300 dark:hover:bg-green-900/20"
              title="Settle expense"
            >
              <CheckCircle2 className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => onRejectExpense(expense.id)}
              className="rounded-lg p-2 text-amber-600 transition hover:bg-amber-50 dark:text-amber-300 dark:hover:bg-amber-900/20"
              title="Reject and return balance"
            >
              <RotateCcw className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => onDeleteExpense(expense.id)}
              className="rounded-lg p-2 text-red-600 transition hover:bg-red-50 dark:text-red-300 dark:hover:bg-red-900/20"
              title="Delete expense"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        );
      default:
        return <span>{String(expense[columnKey as keyof PettyCashExpense] ?? '')}</span>;
    }
  };

  return (
    <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[1120px]">
          <thead className="border-b border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-900/40">
            <tr>
              {visibleColumns.map((column) => (
                <th
                  key={column.key}
                  className={`px-4 py-3 text-xs font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400 ${
                    column.align === 'right' ? 'text-right' : column.align === 'center' ? 'text-center' : 'text-left'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => handleSort(column.sortKey)}
                    className={`inline-flex items-center gap-1 ${column.sortKey ? 'cursor-pointer hover:text-gray-900 dark:hover:text-white' : 'cursor-default'}`}
                  >
                    {column.label}
                    {getSortIcon(column.sortKey)}
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
            {sortedExpenses.length === 0 ? (
              <tr>
                <td colSpan={visibleColumns.length} className="px-6 py-12 text-center">
                  <p className="font-semibold text-gray-900 dark:text-white">No petty cash expenses found</p>
                  <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Adjust filters or upload a new expense.</p>
                </td>
              </tr>
            ) : (
              pagination.paginatedRows.map((expense) => (
                <tr key={expense.id} className="transition odd:bg-white even:bg-gray-50/60 hover:bg-green-50/50 dark:odd:bg-gray-800 dark:even:bg-gray-900/30 dark:hover:bg-green-900/10">
                  {visibleColumns.map((column) => (
                    <td
                      key={column.key}
                      className={`px-4 py-3 text-sm text-gray-600 dark:text-gray-300 ${
                        column.align === 'right' ? 'text-right' : column.align === 'center' ? 'text-center' : 'text-left'
                      }`}
                    >
                      {renderCell(expense, column.key)}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <PettyCashPagination
        currentPage={pagination.currentPage}
        itemLabel="gastos"
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
