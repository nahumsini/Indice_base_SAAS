import { useEffect, useMemo, useState, type Dispatch, type MouseEvent as ReactMouseEvent, type SetStateAction } from 'react';
import { ArrowDown, ArrowUp, ArrowUpDown, Search } from 'lucide-react';
import { mockProviders } from '../../data/expenses.mock';
import type { Expense, ExpenseStatus, Provider } from '../../types/expenses.types';
import type { ColumnConfig } from '../../types/expenseView.types';
import type { FinanceReferenceOption } from '../../types/finance-reference.types';
import type { PaymentAccount } from '../../PaymentAccounts/types';
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
import { useExpensesTranslations } from '../hooks/useExpensesTranslations';
import { formatBusinessCurrencyBreakdown } from '../../../shared/businessCurrency';
import { getEffectiveExpenseStatus, getExpenseBalance, getExpensePaidAmount } from '../../utils/expenseFilters';
import { DataTablePagination } from '../../../../components/table/DataTablePagination';
import { DEFAULT_TABLE_PAGE_SIZE_OPTIONS } from '../../../../hooks/useTablePagination';
import {
  EditableExpenseRow,
  type EditableExpenseRowOptions,
  type ExpenseRowActionVisibility,
  type ExpenseWorkflowState,
} from './EditableExpenseRow';
import { ExpenseMobileCards } from './ExpenseMobileCards';

type MoneySummary = {
  key: string;
  label: string;
  value: string;
};

type ExpenseTableProps = {
  actionVisibility?: ExpenseRowActionVisibility;
  accountingAccountOptions?: FinanceReferenceOption[];
  columns: ColumnConfig[];
  deletingExpenseIds?: Set<string>;
  emptyMessage?: string;
  emptyTitle?: string;
  expenses: Expense[];
  getAttachments: (expense: Expense) => string[];
  onDeleteExpense?: (expenseId: string) => void;
  onDeleteExpenses?: (expenseIds: string[]) => void;
  onDuplicateExpense?: (expenseId: string) => void;
  onEditExpense?: (expense: Expense) => void;
  onExpensesChange: Dispatch<SetStateAction<Expense[]>>;
  onMarkExpensePaid?: (expense: Expense) => Promise<Expense | null>;
  onOpenAttachments: (expense: Expense) => void;
  onPersistExpenseUpdate?: (expense: Expense) => void;
  onRecordExpensePayment?: (expense: Expense, amount: number, paymentAccountId: string, paymentDate: Date) => Promise<Expense | null>;
  onStatusChange?: (expense: Expense, status: ExpenseStatus) => Promise<Expense | null>;
  businessOptions?: FinanceReferenceOption[];
  paymentAccounts?: PaymentAccount[];
  providers?: Provider[];
  unitOptions?: FinanceReferenceOption[];
  userOptions?: FinanceReferenceOption[];
};

export function ExpenseTable({
  actionVisibility,
  accountingAccountOptions = [],
  columns,
  deletingExpenseIds = new Set<string>(),
  emptyMessage,
  emptyTitle,
  expenses,
  getAttachments,
  onDeleteExpense,
  onDeleteExpenses,
  onDuplicateExpense,
  onEditExpense,
  onExpensesChange,
  onMarkExpensePaid,
  onOpenAttachments,
  onPersistExpenseUpdate,
  onRecordExpensePayment,
  onStatusChange,
  businessOptions = [],
  paymentAccounts = [],
  providers = mockProviders,
  unitOptions = [],
  userOptions = [],
}: ExpenseTableProps) {
  const t = useExpensesTranslations();
  const showAuditAction = actionVisibility?.showAudit ?? true;
  const showMarkPaidAction = actionVisibility?.showMarkPaid ?? true;
  const showPaymentStatusOptions = showMarkPaidAction;
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>(DEFAULT_EXPENSE_COLUMN_WIDTHS);
  const [editingRowId, setEditingRowId] = useState<string | null>(null);
  const [resizeStartWidth, setResizeStartWidth] = useState(0);
  const [resizeStartX, setResizeStartX] = useState(0);
  const [resizingColumn, setResizingColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>(null);
  const [sortField, setSortField] = useState<ExpenseSortField | null>(null);
  const [paymentExpenseId, setPaymentExpenseId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [workflowByExpenseId, setWorkflowByExpenseId] = useState<Record<string, ExpenseWorkflowState>>({});
  const rowSelection = useExpenseRowSelection<string>();

  const effectiveEmptyMessage = emptyMessage ?? t.expenses.emptyMessage;
  const effectiveEmptyTitle = emptyTitle ?? t.expenses.emptyTitle;
  const editableRowOptions = useEditableRowOptions(expenses, providers, unitOptions, businessOptions, userOptions, accountingAccountOptions);
  const sortedExpenses = useMemo(() => {
    if (!sortField || !sortDirection) return expenses;
    return [...expenses].sort((left, right) => compareSortValues(
      sortField === 'status' ? getEffectiveExpenseStatus(left) : left[sortField],
      sortField === 'status' ? getEffectiveExpenseStatus(right) : right[sortField],
      sortDirection,
    ));
  }, [expenses, sortDirection, sortField]);
  const totalPages = Math.max(1, Math.ceil(sortedExpenses.length / pageSize));
  const pageStartIndex = (currentPage - 1) * pageSize;
  const pageEndIndex = pageStartIndex + pageSize;
  const paginatedExpenses = useMemo(
    () => sortedExpenses.slice(pageStartIndex, pageEndIndex),
    [pageEndIndex, pageStartIndex, sortedExpenses],
  );
  const paginationStart = sortedExpenses.length === 0 ? 0 : pageStartIndex + 1;
  const paginationEnd = sortedExpenses.length === 0 ? 0 : Math.min(pageEndIndex, sortedExpenses.length);
  const visibleExpenseIds = useMemo(() => paginatedExpenses.map(expense => expense.id), [paginatedExpenses]);
  const visibleSelection = rowSelection.visibleSelectionState(visibleExpenseIds);
  const visibleColumnCount = useMemo(() => (
    columns.filter(column => column.key !== 'actions' && column.visible).length + 2
  ), [columns]);
  const filteredMoneySummaries = useMemo(() => getMoneySummaries(sortedExpenses, columns), [columns, sortedExpenses]);
  const selectedExpenses = useMemo(
    () => sortedExpenses.filter(expense => rowSelection.selectedIds.has(expense.id)),
    [rowSelection.selectedIds, sortedExpenses],
  );
  const selectedMoneySummaries = useMemo(() => getMoneySummaries(selectedExpenses, columns), [columns, selectedExpenses]);
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

  useEffect(() => {
    setCurrentPage(current => Math.min(Math.max(current, 1), totalPages));
  }, [totalPages]);

  const handleResizeStart = (event: ReactMouseEvent, columnKey: string) => {
    event.preventDefault();
    setResizingColumn(columnKey);
    setResizeStartX(event.clientX);
    setResizeStartWidth(columnWidths[columnKey] || 150);
  };

  const handleSort = (field: ExpenseSortField) => {
    setCurrentPage(1);
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
    rowSelection.selectedIdList.forEach(id => {
      void handleStatusChange(id, status);
    });
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
    rowSelection.selectedIdList.forEach(id => {
      void handlePay(id);
    });
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
    if (deletingExpenseIds.has(id)) return;
    if (onDeleteExpense) {
      onDeleteExpense(id);
      return;
    }
    onExpensesChange(prev => prev.filter(expense => expense.id !== id));
  };

  const handleDeleteSelected = () => {
    if (onDeleteExpenses) {
      onDeleteExpenses(rowSelection.selectedIdList);
      rowSelection.clearSelection();
      return;
    }
    rowSelection.selectedIdList.forEach(id => handleDelete(id));
    rowSelection.clearSelection();
  };

  const replaceSavedExpense = (savedExpense: Expense) => {
    onExpensesChange(prev => prev.map(expense => (expense.id === savedExpense.id ? savedExpense : expense)));
  };

  const handleStatusChange = async (id: string, status: ExpenseStatus) => {
    const expense = expenses.find(item => item.id === id);
    if (!expense) return;
    if (!showPaymentStatusOptions && (status === 'paid' || status === 'partial')) return;
    if (!showAuditAction && status === 'audited') return;
    const optimisticExpense = {
      ...expense,
      ...getStatusPatch(expense, status),
      updatedAt: new Date(),
    };
    onExpensesChange(prev => prev.map(item => (item.id === id ? optimisticExpense : item)));

    if (onStatusChange) {
      const savedExpense = await onStatusChange(expense, status);
      if (savedExpense) replaceSavedExpense(savedExpense);
      return;
    }

    onPersistExpenseUpdate?.(optimisticExpense);
  };

  const handlePay = async (id: string) => {
    const expense = expenses.find(item => item.id === id);
    if (!expense) return;
    if (expense.type === 'budget' || getExpenseBalance(expense) <= 0) return;
    if (onMarkExpensePaid) {
      const savedExpense = await onMarkExpensePaid(expense);
      if (savedExpense) replaceSavedExpense(savedExpense);
      return;
    }
    void handleStatusChange(id, 'paid');
  };

  const openPaymentModal = (id: string) => {
    const expense = expenses.find(item => item.id === id);
    if (!expense || getExpenseBalance(expense) <= 0) return;
    setPaymentExpenseId(id);
  };

  const handleRecordPayment = async (id: string, amount: number, paymentAccountId: string, paymentDate: Date) => {
    const expense = expenses.find(item => item.id === id);
    if (!expense) return;
    if (getExpenseBalance(expense) <= 0) {
      setPaymentExpenseId(null);
      return;
    }
    if (onRecordExpensePayment) {
      const savedExpense = await onRecordExpensePayment(expense, amount, paymentAccountId, paymentDate);
      if (savedExpense) {
        replaceSavedExpense(savedExpense);
        setPaymentExpenseId(null);
      }
      return;
    }

    const nextAmountPaid = Math.min(expense.total, (expense.amountPaid ?? 0) + amount);
    updateExpense(id, {
      amountPaid: nextAmountPaid,
      paymentAccountId,
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
          showMarkPaid={showMarkPaidAction}
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
        expenses={paginatedExpenses}
        deletingExpenseIds={deletingExpenseIds}
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
        onRecordPayment={openPaymentModal}
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
              paginatedExpenses.map(expense => (
                <EditableExpenseRow
                  key={expense.id}
                  actionVisibility={actionVisibility}
                  expense={expense}
                  attachmentsCount={getAttachments(expense).length}
                  columnWidths={columnWidths}
                  isEditing={editingRowId === expense.id}
                  isColumnVisible={isColumnVisible}
                  isDeletePending={deletingExpenseIds.has(expense.id)}
                  isSelected={rowSelection.isSelected(expense.id)}
                  options={editableRowOptions}
                  workflow={workflowByExpenseId[expense.id] ?? getDefaultExpenseWorkflow(expense)}
                  onStartEdit={setEditingRowId}
                  onSelectionChange={rowSelection.toggleSelection}
                  onStatusChange={handleStatusChange}
                  onUpdateExpense={updateExpense}
                  onUpdateWorkflow={updateExpenseWorkflow}
                  onOpenAttachments={onOpenAttachments}
                  onDuplicate={handleDuplicate}
                  onDelete={handleDelete}
                  onActionEdit={onEditExpense ? () => onEditExpense(expense) : undefined}
                  onMarkPaid={handlePay}
                  onRecordPayment={openPaymentModal}
                  onAudit={setEditingRowId}
                />
              ))
            )}
          </tbody>
          </table>
        </div>
        <ExpenseTablePagination
          attached
          currentPage={currentPage}
          moneySummaries={filteredMoneySummaries}
          onPageChange={setCurrentPage}
          onPageSizeChange={(nextPageSize) => {
            setPageSize(nextPageSize);
            setCurrentPage(1);
          }}
          pageEnd={paginationEnd}
          pageSize={pageSize}
          pageStart={paginationStart}
          selectedCount={rowSelection.selectedCount}
          selectedMoneySummaries={selectedMoneySummaries}
          t={t}
          totalCount={sortedExpenses.length}
          totalPages={totalPages}
        />
      </div>

      <div className="md:hidden">
        <ExpenseTablePagination
          currentPage={currentPage}
          moneySummaries={filteredMoneySummaries}
          onPageChange={setCurrentPage}
          onPageSizeChange={(nextPageSize) => {
            setPageSize(nextPageSize);
            setCurrentPage(1);
          }}
          pageEnd={paginationEnd}
          pageSize={pageSize}
          pageStart={paginationStart}
          selectedCount={rowSelection.selectedCount}
          selectedMoneySummaries={selectedMoneySummaries}
          t={t}
          totalCount={sortedExpenses.length}
          totalPages={totalPages}
        />
      </div>

      {paymentExpense && (
        <ExpensePaymentModal
          expense={paymentExpense}
          onClose={() => setPaymentExpenseId(null)}
          paymentAccounts={paymentAccounts}
          onSubmit={handleRecordPayment}
        />
      )}
    </div>
  );
}

function ExpenseTablePagination({
  attached = false,
  currentPage,
  moneySummaries = [],
  onPageChange,
  onPageSizeChange,
  pageEnd,
  pageSize,
  pageStart,
  selectedCount = 0,
  selectedMoneySummaries = [],
  t,
  totalCount,
  totalPages,
}: {
  attached?: boolean;
  currentPage: number;
  moneySummaries?: MoneySummary[];
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
  pageEnd: number;
  pageSize: number;
  pageStart: number;
  selectedCount?: number;
  selectedMoneySummaries?: MoneySummary[];
  t: ReturnType<typeof useExpensesTranslations>;
  totalCount: number;
  totalPages: number;
}) {
  const hasMoneySummary = moneySummaries.length > 0 || selectedMoneySummaries.length > 0;
  const pagination = (
    <DataTablePagination
      attached={attached || hasMoneySummary}
      currentPage={currentPage}
      labels={{
        next: t.common.next,
        page: (current, total) => `${current} / ${total}`,
        previous: t.common.previous,
        rowsPerPage: t.common.rowsPerPage,
        showing: (start, end, total) => t.common.showing(start, end, total),
      }}
      onPageChange={onPageChange}
      onPageSizeChange={onPageSizeChange}
      pageEnd={pageEnd}
      pageSize={pageSize}
      pageSizeOptions={DEFAULT_TABLE_PAGE_SIZE_OPTIONS}
      pageStart={pageStart}
      totalCount={totalCount}
      totalPages={totalPages}
    />
  );

  if (!hasMoneySummary) {
    return pagination;
  }

  return (
    <div className={`bg-white dark:bg-slate-800 ${
      attached
        ? 'border-t border-slate-200 dark:border-slate-700'
        : 'rounded-2xl border border-slate-200 shadow-sm dark:border-slate-700'
    }`}>
      {moneySummaries.length > 0 ? (
        <MoneySummaryStrip label={t.expenses.summary.filteredTotals} summaries={moneySummaries} />
      ) : null}
      {selectedCount > 0 && selectedMoneySummaries.length > 0 ? (
        <MoneySummaryStrip
          emphasis
          label={t.expenses.summary.selectedRows(selectedCount)}
          summaries={selectedMoneySummaries}
        />
      ) : null}
      {pagination}
    </div>
  );
}

function MoneySummaryStrip({ emphasis = false, label, summaries }: { emphasis?: boolean; label: string; summaries: MoneySummary[] }) {
  return (
    <div className={`flex flex-col gap-2 px-4 py-3 ${emphasis ? 'bg-[#147514]/5 dark:bg-emerald-400/10' : ''} lg:flex-row lg:items-center lg:justify-between`}>
      <span className={`text-xs font-extrabold uppercase tracking-[0.18em] ${emphasis ? 'text-[#147514] dark:text-emerald-300' : 'text-slate-500 dark:text-slate-400'}`}>
        {label}
      </span>
      <div className="flex flex-wrap gap-2">
        {summaries.map(summary => (
          <span
            key={summary.key}
            className={`inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-xs shadow-sm ${
              emphasis
                ? 'border-[#147514]/20 bg-white text-slate-700 dark:border-emerald-400/20 dark:bg-slate-900 dark:text-slate-200'
                : 'border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300'
            }`}
          >
            <span className="font-bold text-slate-500 dark:text-slate-400">{summary.label}</span>
            <strong className="font-extrabold text-slate-900 dark:text-white">{summary.value}</strong>
          </span>
        ))}
      </div>
    </div>
  );
}

function getMoneySummaries(expenses: Expense[], columns: ColumnConfig[]): MoneySummary[] {
  const visibleLabels = new Map(columns.filter(column => column.visible).map(column => [column.key, column.label]));
  const monetaryColumns = [
    { key: 'amount', getValue: (expense: Expense) => expense.amount },
    { key: 'taxes', getValue: (expense: Expense) => expense.taxes },
    { key: 'total', getValue: (expense: Expense) => expense.total },
    { key: 'amountPaid', getValue: (expense: Expense) => getExpensePaidAmount(expense) },
    { key: 'balance', getValue: (expense: Expense) => getExpenseBalance(expense) },
  ];

  return monetaryColumns
    .filter(column => visibleLabels.has(column.key))
    .map(column => ({
      key: column.key,
      label: visibleLabels.get(column.key) ?? column.key,
      value: formatBusinessCurrencyBreakdown(expenses, column.getValue, expense => expense.currency),
    }));
}

function getStatusPatch(expense: Expense, status: ExpenseStatus): Partial<Expense> {
  const paymentDate = new Date();
  if (status === 'paid' || status === 'audited') {
    return { amountPaid: expense.total, paymentDate, status };
  }

  if (status === 'partial') {
    const fallbackPaidAmount = Math.max(0.01, Math.min(expense.total / 2, Math.max(expense.total - 0.01, 0)));
    const amountPaid = (expense.amountPaid ?? 0) > 0 && (expense.amountPaid ?? 0) < expense.total
      ? expense.amountPaid
      : fallbackPaidAmount;
    return { amountPaid, paymentDate, status };
  }

  if (status === 'overdue') {
    return {
      amountPaid: Math.min(getExpensePaidAmount(expense), expense.total),
      paymentDate: expense.paymentDate,
      status,
    };
  }

  return { amountPaid: 0, paymentDate: undefined, status };
}

function useEditableRowOptions(
  expenses: Expense[],
  providers: Provider[],
  unitOptions: FinanceReferenceOption[],
  businessOptions: FinanceReferenceOption[],
  userOptions: FinanceReferenceOption[],
  accountingAccountOptions: FinanceReferenceOption[],
): EditableExpenseRowOptions {
  const t = useExpensesTranslations();

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
