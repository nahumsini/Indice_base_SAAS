import type { Expense } from '../../types/expenses.types';
import { formatCurrency } from '../../utils/expenses.utils';
import { readonlyCellClass } from './ExpenseInlineControls';

type ExpenseAmountCellsProps = {
  columnWidths: Record<string, number>;
  expense: Expense;
  isColumnVisible: (key: string) => boolean;
};

export function getExpenseAmountCells({ columnWidths, expense, isColumnVisible }: ExpenseAmountCellsProps) {
  const balance = Math.max(expense.total - (expense.amountPaid || 0), 0);

  return {
    total: isColumnVisible('total') && (
        <td className={`px-6 py-4 whitespace-nowrap font-medium ${readonlyCellClass}`} style={{ width: columnWidths.total, minWidth: columnWidths.total }}>
          {formatCurrency(expense.total, expense.currency)}
        </td>
    ),
    taxes: isColumnVisible('taxes') && (
        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400" style={{ width: columnWidths.taxes, minWidth: columnWidths.taxes }}>
          {formatCurrency(expense.taxes, expense.currency)}
        </td>
    ),
    amount: isColumnVisible('amount') && (
        <td className={`px-6 py-4 whitespace-nowrap ${readonlyCellClass}`} style={{ width: columnWidths.amount, minWidth: columnWidths.amount }}>
          <span className={`font-medium ${expense.amount > 5000 ? 'text-gray-900 dark:text-white text-base' : ''}`}>
            {formatCurrency(expense.amount, expense.currency)}
          </span>
          {expense.amount > 10000 && <span className="ml-2 text-xs text-yellow-600 dark:text-yellow-400 font-medium">ALTO</span>}
        </td>
    ),
    amountPaid: isColumnVisible('amountPaid') && (
        <td className={`px-6 py-4 whitespace-nowrap ${readonlyCellClass}`} style={{ width: columnWidths.amountPaid, minWidth: columnWidths.amountPaid }}>
          <span className={`font-medium ${(expense.amountPaid ?? 0) > 0 ? 'text-green-600 dark:text-green-400' : 'text-gray-500 dark:text-gray-400'}`}>
            {formatCurrency(expense.amountPaid || 0, expense.currency)}
          </span>
        </td>
    ),
    balance: isColumnVisible('balance') && (
        <td className={`px-6 py-4 whitespace-nowrap ${readonlyCellClass}`} style={{ width: columnWidths.balance, minWidth: columnWidths.balance }}>
          <span className={`font-medium ${balance > 0 ? 'text-red-600 dark:text-red-400' : 'text-gray-500 dark:text-gray-400'}`}>
            {formatCurrency(balance, expense.currency)}
          </span>
        </td>
    ),
  };
}
