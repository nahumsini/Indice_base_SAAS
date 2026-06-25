import { useEffect, useMemo, useState, type Dispatch, type MouseEvent as ReactMouseEvent, type SetStateAction } from 'react';
import { ArrowDown, ArrowUp, ArrowUpDown, Search } from 'lucide-react';
import { mockProviders } from '../../data/expenses.mock';
import type { Expense, ExpenseStatus, Provider } from '../../types/expenses.types';
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
import { useExpenseRowSelection } from '../../hooks/useExpenseRowSelection';
import { ExpenseBulkActionsBar } from '../../components/table/ExpenseBulkActionsBar';
import { ExpenseTableHeaderRow } from '../../components/table/ExpenseTableHeaderRow';
import { ExpensePaymentModal } from '../../components/modals/ExpensePaymentModal';
import { useFinanceTranslations } from '../../hooks/useFinanceTranslations';
import {
  EditableExpenseRow,
  type EditableExpenseRowOptions,
  type ExpenseRowActionVisibility,
  type ExpenseWorkflowState,
} from './EditableExpenseRow';
import { ExpenseMobileCards } from './ExpenseMobileCards';

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
  emptyMessage,
  emptyTitle,
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
  const t = useFinanceTranslations();
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>(DEFAULT_EXPENSE_COLUMN_WIDTHS);
  const [editingRowId, setEditingRowId] = useState<string | null>(null);
  const [resizeStartWidth, setResizeStartWidth] = useState(0);
  const [resizeStartX, setResizeStartX] = useState(0);
  const [resizingColumn, setResizingColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>(null);
  const [sortField, setSortField] = useState<ExpenseSortField | null>(null);
  const [paymentExpenseId, setPaymentExpenseId] = useState<string | null>(null);
  const [workflowByExpenseId, setWorkflowByExpenseId] = useState<Record<string, ExpenseWorkflowState>>({});
  const rowSelection = useExpenseRowSelection<string>();

  const effectiveEmptyMessage = emptyMessage ?? t.expenses.emptyMessage;
  const effectiveEmptyTitle = emptyTitle ?? t.expenses.emptyTitle;
  const editableRowOptions = useEditableRowOptions(expenses, providers, unitOptions, businessOptions, userOptions, accountingAccountOptions);
  const sortedExpenses = useMemo(() => {
    if (!sortField || !sortDirection) return expenses;
    return [...expenses].sort((left, right) => compareSortValues(left[sortField], right[sortField], sortDirection));
  }, [expenses, sortDirection, sortField]);
  const visibleExpenseIds = useMemo(() => sortedExpenses.map(expense => expense.id), [sortedExpenses]);
  const visibleSelection = rowSelection.visibleSelectionState(visibleExpenseIds);
  const visibleColumnCount = useMemo(() => (
    columns.filter(column => column.key !== 'actions' && column.visible).length + 2
  ), [columns]);
  const paymentExpense = useMemo(
    () => expenses.find(expense => expense.id === paymentExpenseId) ?? null,
    [expenses, paymentExpenseId],
  );

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

  useEffect(() => {
    rowSelection.pruneSelection(expenses.map(expense => expense.id));
  }, [expenses, rowSelection.pruneSelection]);

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

  const applyBulkExpenseUpdates = (getUpdates: (expense: Expense) => Partial<Expense>) => {
    const selectedIds = new Set(rowSelection.selectedIdList);
    if (selectedIds.size === 0) return;

    const updatedExpenses = expenses
      .filter(expense => selectedIds.has(expense.id))
      .map(expense => ({ ...expense, ...getUpdates(expense), updatedAt: new Date() }));
    const updatedExpenseMap = new Map(updatedExpenses.map(expense => [expense.id, expense]));

    onExpensesChange(prev => prev.map(expense => updatedExpenseMap.get(expense.id) ?? expense));
    updatedExpenses.forEach(expense => onPersistExpenseUpdate?.(expense));
  };

  const handleBulkUnitChange = (businessUnit: string) => {
    applyBulkExpenseUpdates(() => ({ businessUnit, business: '' }));
  };

  const handleBulkBusinessChange = (business: string) => {
    applyBulkExpenseUpdates(() => ({ business }));
  };

  const handleBulkProviderChange = (providerId: string) => {
    const provider = providers.find(item => item.id === providerId);
    applyBulkExpenseUpdates(() => ({ providerId, providerName: provider?.name ?? '' }));
  };

  const handleBulkAccountingAccountChange = (accountingAccount: string) => {
    applyBulkExpenseUpdates(() => ({ accountingAccount }));
  };

  const handleBulkStatusChange = (status: ExpenseStatus) => {
    applyBulkExpenseUpdates(() => ({ status }));
  };

  const updateSelectedWorkflowState = (updates: Partial<ExpenseWorkflowState>) => {
    const selectedIds = new Set(rowSelection.selectedIdList);
    if (selectedIds.size === 0) return;

    setWorkflowByExpenseId(prev => {
      const next = { ...prev };
      expenses
        .filter(expense => selectedIds.has(expense.id))
        .forEach(expense => {
          next[expense.id] = {
            ...getDefaultExpenseWorkflow(expense),
            ...next[expense.id],
            ...updates,
          };
        });
      return next;
    });
  };

  const handleBulkAuthorizerChange = (authorizer: string) => {
    updateSelectedWorkflowState({ authorizer });
    applyBulkExpenseUpdates(() => ({
      approvedByUserId: authorizer || undefined,
      approver: authorizer || undefined,
    }));
  };

  const handleBulkResponsibleChange = (performer: string) => {
    updateSelectedWorkflowState({ performer });
    applyBulkExpenseUpdates(() => ({ performedByUserId: performer || undefined }));
  };

  const handleBulkMarkPaid = () => {
    const paymentDate = new Date();
    applyBulkExpenseUpdates(expense => ({
      amountPaid: expense.total,
      paymentDate,
      status: 'paid',
    }));
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

  const handleDeleteSelected = () => {
    rowSelection.selectedIdList.forEach(id => handleDelete(id));
    rowSelection.clearSelection();
  };

  const handlePay = (id: string) => {
    const expense = expenses.find(item => item.id === id);
    if (!expense) return;
    updateExpense(id, { amountPaid: expense.total, paymentDate: new Date(), status: 'paid' });
  };

  const handleRecordPayment = (id: string, amount: number, paymentDate: Date) => {
    const expense = expenses.find(item => item.id === id);
    if (!expense) return;

    const nextAmountPaid = Math.min(expense.total, (expense.amountPaid ?? 0) + amount);
    updateExpense(id, {
      amountPaid: nextAmountPaid,
      paymentDate,
      status: nextAmountPaid >= expense.total ? 'paid' : 'partial',
    });
    setPaymentExpenseId(null);
  };

  return (
    <div className="space-y-3">
      {rowSelection.selectedCount > 0 ? (
        <ExpenseBulkActionsBar
          accountingAccountOptions={editableRowOptions.accountingAccounts}
          businessOptions={editableRowOptions.businesses}
          onAccountingAccountChange={handleBulkAccountingAccountChange}
          onAuthorizerChange={handleBulkAuthorizerChange}
          onBusinessChange={handleBulkBusinessChange}
          onClearSelection={rowSelection.clearSelection}
          onDeleteSelected={handleDeleteSelected}
          onMarkPaidSelected={handleBulkMarkPaid}
          onProviderChange={handleBulkProviderChange}
          onResponsibleChange={handleBulkResponsibleChange}
          onStatusChange={handleBulkStatusChange}
          onUnitChange={handleBulkUnitChange}
          providers={providers}
          selectedCount={rowSelection.selectedCount}
          unitOptions={editableRowOptions.businessUnits}
          userOptions={editableRowOptions.users}
        />
      ) : null}

      <ExpenseMobileCards
        actionVisibility={actionVisibility}
        emptyMessage={effectiveEmptyMessage}
        emptyTitle={effectiveEmptyTitle}
        expenses={sortedExpenses}
        getAttachments={getAttachments}
        isColumnVisible={isColumnVisible}
        isSelected={rowSelection.isSelected}
        options={editableRowOptions}
        onAudit={setEditingRowId}
        onDelete={handleDelete}
        onDuplicate={handleDuplicate}
        onEdit={(expense) => {
          if (onEditExpense) {
            onEditExpense(expense);
            return;
          }
          setEditingRowId(expense.id);
        }}
        onMarkPaid={handlePay}
        onOpenAttachments={onOpenAttachments}
        onRecordPayment={(expenseId) => setPaymentExpenseId(expenseId)}
        onSelectionChange={rowSelection.toggleSelection}
      />

      <div className="hidden overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800 md:block">
        <div className="overflow-x-auto">
          <table className="min-w-[1280px]">
          <thead className="border-b border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-900/60">
            <ExpenseTableHeaderRow
              allVisibleSelected={visibleSelection.allVisibleSelected}
              columnWidths={columnWidths}
              getSortIcon={getSortIcon}
              isColumnVisible={isColumnVisible}
              onResizeStart={handleResizeStart}
              onSort={handleSort}
              onToggleAllVisible={(selected) => rowSelection.toggleAllVisible(visibleExpenseIds, selected)}
              resizingColumn={resizingColumn}
              selectionColumnWidth={56}
              someVisibleSelected={visibleSelection.someVisibleSelected}
            />
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
            {sortedExpenses.length === 0 ? (
              <EmptyExpenseTableRow colSpan={visibleColumnCount} emptyMessage={effectiveEmptyMessage} emptyTitle={effectiveEmptyTitle} />
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
                  isSelected={rowSelection.isSelected(expense.id)}
                  options={editableRowOptions}
                  workflow={workflowByExpenseId[expense.id] ?? getDefaultExpenseWorkflow(expense)}
                  onStartEdit={setEditingRowId}
                  onSelectionChange={rowSelection.toggleSelection}
                  onUpdateExpense={updateExpense}
                  onUpdateWorkflow={updateExpenseWorkflow}
                  onOpenAttachments={onOpenAttachments}
                  onDuplicate={handleDuplicate}
                  onDelete={handleDelete}
                  onActionEdit={onEditExpense ? () => onEditExpense(expense) : undefined}
                  onMarkPaid={handlePay}
                  onRecordPayment={(expenseId) => setPaymentExpenseId(expenseId)}
                  onAudit={setEditingRowId}
                />
              ))
            )}
          </tbody>
          </table>
        </div>
      </div>

      {paymentExpense && (
        <ExpensePaymentModal
          expense={paymentExpense}
          onClose={() => setPaymentExpenseId(null)}
          onSubmit={handleRecordPayment}
        />
      )}
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
  const t = useFinanceTranslations();

  return useMemo(() => {
    const baseAccounts = t.expenses.table.fallbackAccounts;
    const existingAccounts = Array.from(new Set(expenses.map(expense => expense.accountingAccount).filter(Boolean) as string[]));

    return {
      accountingAccounts: accountingAccountOptions.length > 0
        ? [{ value: '', label: t.common.select }, ...accountingAccountOptions]
        : Array.from(new Set([...baseAccounts, ...existingAccounts])).map(account => ({
          value: account,
          label: account || t.common.select,
        })),
      businessUnits: unitOptions.length > 0
        ? unitOptions
        : Array.from(new Set(expenses.map(expense => expense.businessUnit))).map(value => ({ value, label: value })),
      businesses: [
        { value: '', label: t.common.select },
        ...(businessOptions.length > 0
          ? businessOptions
          : Array.from(new Set(expenses.map(expense => expense.business))).map(value => ({ value, label: value }))),
      ],
      paymentMethods: [
        { value: 'credit_card', label: t.expenses.table.paymentMethods.credit_card },
        { value: 'transfer', label: t.expenses.table.paymentMethods.transfer },
        { value: 'cash', label: t.expenses.table.paymentMethods.cash },
        { value: 'debit_card', label: t.expenses.table.paymentMethods.debit_card },
        { value: 'check', label: t.expenses.table.paymentMethods.check },
      ],
      providers,
      statuses: [
        { value: 'paid', label: t.expenses.table.statuses.paid },
        { value: 'pending', label: t.expenses.table.statuses.pending },
        { value: 'overdue', label: t.expenses.table.statuses.overdue },
        { value: 'partial', label: t.expenses.table.statuses.partial },
        { value: 'audited', label: t.expenses.table.statuses.audited },
      ],
      users: [{ value: '', label: t.common.select }, ...(userOptions.length > 0 ? userOptions : EXPENSE_USER_OPTIONS.map(user => ({ value: user, label: user })))],
    };
  }, [accountingAccountOptions, businessOptions, expenses, providers, t, unitOptions, userOptions]);
}

function EmptyExpenseTableRow({ colSpan, emptyMessage, emptyTitle }: { colSpan: number; emptyMessage: string; emptyTitle: string }) {
  return (
    <tr>
      <td colSpan={colSpan} className="px-6 py-12 text-center">
        <div className="flex flex-col items-center justify-center text-gray-500 dark:text-gray-400">
          <Search className="w-12 h-12 mb-4 opacity-50" />
          <p className="text-lg font-medium">{emptyTitle}</p>
          <p className="text-sm">{emptyMessage}</p>
        </div>
      </td>
    </tr>
  );
}
