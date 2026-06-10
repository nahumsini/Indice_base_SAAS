import { useEffect, useMemo, useState, type Dispatch, type MouseEvent as ReactMouseEvent, type SetStateAction } from 'react';
import { ArrowDown, ArrowUp, ArrowUpDown, Search } from 'lucide-react';
import { mockProviders } from '../../data/expenses.mock';
import type { Expense, Provider } from '../../types/expenses.types';
import type { ColumnConfig } from '../../types/expenseView.types';
import type { FinanceReferenceOption } from '../../types/finance-reference.types';
import {
  DEFAULT_EXPENSE_COLUMN_WIDTHS,
  EXPENSE_USER_OPTIONS,
  type ExpenseSortField,
} from '../../constants/expenseTableConfig';
import {
  compareSortValues,
  getDefaultExpenseWorkflow,
  type SortDirection,
} from '../../utils/expenseTableUtils';
import { ExpenseTableHeaderRow } from '../../components/table/ExpenseTableHeaderRow';
import {
  EditableExpenseRow,
  type EditableExpenseRowOptions,
  type ExpenseRowActionVisibility,
  type ExpenseWorkflowState,
} from './EditableExpenseRow';

type ExpenseTableProps = {
  actionVisibility?: ExpenseRowActionVisibility;
  accountingAccountOptions?: FinanceReferenceOption[];
  columns: ColumnConfig[];
  emptyMessage?: string;
  emptyTitle?: string;
  expenses: Expense[];
  getAttachments: (expense: Expense) => string[];
  onDeleteExpense?: (expenseId: string) => void;
  onDuplicateExpense?: (expenseId: string) => void;
  onEditExpense?: (expense: Expense) => void;
  onExpensesChange: Dispatch<SetStateAction<Expense[]>>;
  onOpenAttachments: (expense: Expense) => void;
  onPersistExpenseUpdate?: (expense: Expense) => void;
  businessOptions?: FinanceReferenceOption[];
  providers?: Provider[];
  unitOptions?: FinanceReferenceOption[];
  userOptions?: FinanceReferenceOption[];
};

export function ExpenseTable({
  actionVisibility,
  accountingAccountOptions = [],
  columns,
  emptyMessage = 'Intenta ajustar los filtros de búsqueda',
  emptyTitle = 'No se encontraron gastos',
  expenses,
  getAttachments,
  onDeleteExpense,
  onDuplicateExpense,
  onEditExpense,
  onExpensesChange,
  onOpenAttachments,
  onPersistExpenseUpdate,
  businessOptions = [],
  providers = mockProviders,
  unitOptions = [],
  userOptions = [],
}: ExpenseTableProps) {
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>(DEFAULT_EXPENSE_COLUMN_WIDTHS);
  const [editingRowId, setEditingRowId] = useState<string | null>(null);
  const [resizeStartWidth, setResizeStartWidth] = useState(0);
  const [resizeStartX, setResizeStartX] = useState(0);
  const [resizingColumn, setResizingColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>(null);
  const [sortField, setSortField] = useState<ExpenseSortField | null>(null);
  const [workflowByExpenseId, setWorkflowByExpenseId] = useState<Record<string, ExpenseWorkflowState>>({});

  const editableRowOptions = useEditableRowOptions(expenses, providers, unitOptions, businessOptions, userOptions, accountingAccountOptions);
  const sortedExpenses = useMemo(() => {
    if (!sortField || !sortDirection) return expenses;
    return [...expenses].sort((left, right) => compareSortValues(left[sortField], right[sortField], sortDirection));
  }, [expenses, sortDirection, sortField]);

  useEffect(() => {
    if (!resizingColumn) return undefined;

    const handleMouseMove = (event: MouseEvent) => {
      const diff = event.clientX - resizeStartX;
      const newWidth = Math.max(80, resizeStartWidth + diff);
      setColumnWidths(prev => ({ ...prev, [resizingColumn]: newWidth }));
    };
    const handleMouseUp = () => setResizingColumn(null);

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [resizeStartWidth, resizeStartX, resizingColumn]);

  const handleResizeStart = (event: ReactMouseEvent, columnKey: string) => {
    event.preventDefault();
    setResizingColumn(columnKey);
    setResizeStartX(event.clientX);
    setResizeStartWidth(columnWidths[columnKey] || 150);
  };

  const handleSort = (field: ExpenseSortField) => {
    if (sortField === field && sortDirection === 'asc') {
      setSortDirection('desc');
      return;
    }
    if (sortField === field && sortDirection === 'desc') {
      setSortField(null);
      setSortDirection(null);
      return;
    }
    setSortField(field);
    setSortDirection('asc');
  };

  const getSortIcon = (field: ExpenseSortField) => {
    if (sortField !== field) return <ArrowUpDown className="h-4 w-4 text-slate-400" />;
    return sortDirection === 'asc'
      ? <ArrowUp className="h-4 w-4 text-[#147514]" />
      : <ArrowDown className="h-4 w-4 text-[#147514]" />;
  };

  const isColumnVisible = (key: string) => columns.find(item => item.key === key)?.visible ?? false;
  const updateExpense = (id: string, updates: Partial<Expense>) => {
    const currentExpense = expenses.find(expense => expense.id === id);
    const nextExpense = currentExpense ? { ...currentExpense, ...updates, updatedAt: new Date() } : null;
    onExpensesChange(prev => prev.map(expense => (expense.id === id ? { ...expense, ...updates, updatedAt: nextExpense?.updatedAt ?? new Date() } : expense)));
    if (nextExpense) onPersistExpenseUpdate?.(nextExpense);
  };

  const updateExpenseWorkflow = (expenseId: string, updates: Partial<ExpenseWorkflowState>) => {
    const expense = expenses.find(item => item.id === expenseId);
    if (!expense) return;
    setWorkflowByExpenseId(prev => ({
      ...prev,
      [expenseId]: { ...getDefaultExpenseWorkflow(expense), ...prev[expenseId], ...updates },
    }));
    const expenseUpdates: Partial<Expense> = {};
    if (updates.authorizer !== undefined) {
      expenseUpdates.approvedByUserId = updates.authorizer || undefined;
      expenseUpdates.approver = updates.authorizer || undefined;
    }
    if (updates.performer !== undefined) {
      expenseUpdates.performedByUserId = updates.performer || undefined;
    }
    if (Object.keys(expenseUpdates).length > 0) {
      updateExpense(expenseId, expenseUpdates);
    }
  };

  const handleDuplicate = (id: string) => {
    if (onDuplicateExpense) {
      onDuplicateExpense(id);
      return;
    }
    const expenseToDuplicate = expenses.find(expense => expense.id === id);
    if (!expenseToDuplicate) return;
    onExpensesChange(prev => [...prev, {
      ...expenseToDuplicate,
      id: `${expenseToDuplicate.id}-copy-${Date.now()}`,
      folio: `${expenseToDuplicate.folio}-COPY`,
      createdAt: new Date(),
      updatedAt: new Date(),
    }]);
  };

  const handleDelete = (id: string) => {
    if (onDeleteExpense) {
      onDeleteExpense(id);
      return;
    }
    onExpensesChange(prev => prev.filter(expense => expense.id !== id));
  };

  const handlePay = (id: string) => {
    const expense = expenses.find(item => item.id === id);
    if (!expense) return;
    updateExpense(id, { amountPaid: expense.amount, paymentDate: new Date(), status: 'paid' });
  };

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800">
      <div className="overflow-x-auto">
        <table className="min-w-full">
          <thead className="border-b border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-900/60">
            <ExpenseTableHeaderRow
              columnWidths={columnWidths}
              getSortIcon={getSortIcon}
              isColumnVisible={isColumnVisible}
              onResizeStart={handleResizeStart}
              onSort={handleSort}
              resizingColumn={resizingColumn}
            />
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
            {sortedExpenses.length === 0 ? (
              <EmptyExpenseTableRow emptyMessage={emptyMessage} emptyTitle={emptyTitle} />
            ) : (
              sortedExpenses.map(expense => (
                <EditableExpenseRow
                  key={expense.id}
                  actionVisibility={actionVisibility}
                  expense={expense}
                  attachmentsCount={getAttachments(expense).length}
                  columnWidths={columnWidths}
                  isEditing={editingRowId === expense.id}
                  isColumnVisible={isColumnVisible}
                  options={editableRowOptions}
                  workflow={workflowByExpenseId[expense.id] ?? getDefaultExpenseWorkflow(expense)}
                  onStartEdit={setEditingRowId}
                  onUpdateExpense={updateExpense}
                  onUpdateWorkflow={updateExpenseWorkflow}
                  onOpenAttachments={onOpenAttachments}
                  onDuplicate={handleDuplicate}
                  onDelete={handleDelete}
                  onActionEdit={onEditExpense ? () => onEditExpense(expense) : undefined}
                  onMarkPaid={handlePay}
                  onAudit={setEditingRowId}
                />
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function useEditableRowOptions(
  expenses: Expense[],
  providers: Provider[],
  unitOptions: FinanceReferenceOption[],
  businessOptions: FinanceReferenceOption[],
  userOptions: FinanceReferenceOption[],
  accountingAccountOptions: FinanceReferenceOption[],
): EditableExpenseRowOptions {
  return useMemo(() => {
    const baseAccounts = ['', 'Gastos Operativos', 'Marketing', 'Nómina', 'Servicios', 'Impuestos', 'Activos'];
    const existingAccounts = Array.from(new Set(expenses.map(expense => expense.accountingAccount).filter(Boolean) as string[]));

    return {
      accountingAccounts: accountingAccountOptions.length > 0
        ? [{ value: '', label: 'Seleccionar' }, ...accountingAccountOptions]
        : Array.from(new Set([...baseAccounts, ...existingAccounts])).map(account => ({
          value: account,
          label: account || 'Seleccionar',
        })),
      businessUnits: unitOptions.length > 0
        ? unitOptions
        : Array.from(new Set(expenses.map(expense => expense.businessUnit))).map(value => ({ value, label: value })),
      businesses: [
        { value: '', label: 'Seleccionar' },
        ...(businessOptions.length > 0
          ? businessOptions
          : Array.from(new Set(expenses.map(expense => expense.business))).map(value => ({ value, label: value }))),
      ],
      paymentMethods: [
        { value: 'credit_card', label: 'Tarjeta de crédito' },
        { value: 'transfer', label: 'Transferencia' },
        { value: 'cash', label: 'Efectivo' },
        { value: 'debit_card', label: 'Tarjeta de débito' },
        { value: 'check', label: 'Cheque' },
      ],
      providers,
      statuses: [
        { value: 'paid', label: 'Pagado' },
        { value: 'pending', label: 'Pendiente' },
        { value: 'overdue', label: 'Vencido' },
        { value: 'partial', label: 'Pago Parcial' },
        { value: 'audited', label: 'Auditado' },
      ],
      users: [{ value: '', label: 'Seleccionar' }, ...(userOptions.length > 0 ? userOptions : EXPENSE_USER_OPTIONS.map(user => ({ value: user, label: user })))],
    };
  }, [accountingAccountOptions, businessOptions, expenses, providers, unitOptions, userOptions]);
}

function EmptyExpenseTableRow({ emptyMessage, emptyTitle }: { emptyMessage: string; emptyTitle: string }) {
  return (
    <tr>
      <td colSpan={21} className="px-6 py-12 text-center">
        <div className="flex flex-col items-center justify-center text-gray-500 dark:text-gray-400">
          <Search className="w-12 h-12 mb-4 opacity-50" />
          <p className="text-lg font-medium">{emptyTitle}</p>
          <p className="text-sm">{emptyMessage}</p>
        </div>
      </td>
    </tr>
  );
}
