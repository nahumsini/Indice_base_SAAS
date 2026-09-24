import { useCallback, useEffect, useMemo, useRef, useState, type Dispatch, type MouseEvent as ReactMouseEvent, type SetStateAction } from 'react';
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
  getDefaultExpenseWorkflow,
  type SortDirection,
} from '../../utils/expenseTableUtils';
import { useExpenseRowSelection } from '../../hooks/useExpenseRowSelection';
import { FinanceBulkActions, type FinanceBulkActionConfig } from '../../../shared/FinanceBulkActions';
import { getFinanceBulkCopy, type FinanceBulkAction } from '../../../shared/financeBulkActions.copy';
import { toFinanceApiErrorMessage } from '../../services';
import { ExpenseTableHeaderRow } from '../../components/table/ExpenseTableHeaderRow';
import type { ExpenseBulkStatusChange } from '../../types/expenseOperations.types';
import { ExpenseBulkStatusModal } from '../../components/modals/ExpenseBulkStatusModal';
import { getExpenseWorkflowCopy } from '../../utils/expenseWorkflow.copy';
import { ExpensePaymentModal } from '../../components/modals/ExpensePaymentModal';
import { useExpensesResolvedLocale, useExpensesTranslations } from '../hooks/useExpensesTranslations';
import { formatBusinessCurrencyBreakdown } from '../../../shared/businessCurrency';
import { canDeleteExpense, canEditExpense, canPayExpense, getEffectiveExpenseStatus, getExpenseBalance, getExpensePaidAmount } from '../../utils/expenseFilters';
import { DataTablePagination } from '../../../../components/table/DataTablePagination';
import { DEFAULT_TABLE_PAGE_SIZE_OPTIONS } from '../../../../hooks/useTablePagination';
import { useWorkspaceNavigationMemory } from '../../../../hooks/useWorkspaceNavigationMemory';
import {
  EditableExpenseRow,
  type EditableExpenseRowOptions,
  type ExpenseRowActionVisibility,
  type ExpenseWorkflowState,
} from './EditableExpenseRow';
import { ExpenseMobileCards } from './ExpenseMobileCards';
import { ExpenseFundGroupRow } from './ExpenseFundGroupRow';
import { getExpenseFundGroupCopy } from './expenseFundGroup.copy';
import { groupExpenseRows, sortExpenseRows, type ExpenseFundGroup } from '../../utils/expenseFundGroups';
import { useExpenseFundTotals } from '../../hooks/useExpenseFundTotals';
import type { ExpensePrintSnapshot } from '../../utils/expenseTablePrint';

type MoneySummary = {
  key: string;
  label: string;
  value: string;
};

type ExpenseTableWorkspaceState = {
  currentPage: number;
  pageSize: number;
  sortDirection: SortDirection;
  sortField: ExpenseSortField | null;
};

const expenseTableWorkspaceDefaults: ExpenseTableWorkspaceState = {
  currentPage: 1,
  pageSize: 10,
  sortDirection: null,
  sortField: null,
};

const expenseTableWorkspaceUrlFields: Partial<Record<keyof ExpenseTableWorkspaceState, string>> = {
  currentPage: 'ex_page',
  pageSize: 'ex_rows',
  sortDirection: 'ex_dir',
  sortField: 'ex_sort',
};

type ExpenseTableProps = {
  onPrintSnapshotChange?: (snapshot: ExpensePrintSnapshot) => void;
  dataReady?: boolean;
  actionVisibility?: ExpenseRowActionVisibility;
  accountingAccountOptions?: FinanceReferenceOption[];
  columns: ColumnConfig[];
  deletingExpenseIds?: Set<string>;
  emptyMessage?: string;
  emptyTitle?: string;
  expenses: Expense[];
  carryoverExpenseIds?: ReadonlySet<string>;
  fundPeriodLabel?: string;
  hasFundDetailFilters?: boolean;
  getAttachments: (expense: Expense) => string[];
  onDeleteExpense?: (expenseId: string) => void;
  onBulkStatusChange?: (rows: Expense[], change: ExpenseBulkStatusChange) => Promise<void>;
  onBulkAction?: (rows: Expense[], action: FinanceBulkAction, targetId: string, reason: string) => Promise<void>;
  onDeleteExpenses?: (expenseIds: string[]) => void;
  onEditExpense?: (expense: Expense) => void;
  onExpensesChange: Dispatch<SetStateAction<Expense[]>>;
  onMarkExpensePaid?: (expense: Expense, idempotencyKey: string) => Promise<Expense | null>;
  onOpenAttachments: (expense: Expense) => void;
  onViewExpense: (expense: Expense) => void;
  onPersistExpenseUpdate?: (expense: Expense) => void;
  onReclassifyExpense?: (expense: Expense, accountId: string) => Promise<void>;
  onRecordExpensePayment?: (expense: Expense, amount: number, paymentAccountId: string, paymentDate: Date, attachmentFiles: File[], idempotencyKey?: string) => Promise<Expense | null>;
  onStatusChange?: (expense: Expense, status: ExpenseStatus) => Promise<Expense | null>;
  businessOptions?: FinanceReferenceOption[];
  paymentAccounts?: PaymentAccount[];
  providers?: Provider[];
  unitOptions?: FinanceReferenceOption[];
  userOptions?: FinanceReferenceOption[];
};

export function ExpenseTable({
  onPrintSnapshotChange,
  dataReady = true,
  actionVisibility,
  accountingAccountOptions = [],
  columns,
  deletingExpenseIds = new Set<string>(),
  emptyMessage,
  emptyTitle,
  expenses,
  carryoverExpenseIds = new Set<string>(),
  fundPeriodLabel,
  hasFundDetailFilters = false,
  getAttachments,
  onDeleteExpense,
  onBulkAction,
  onBulkStatusChange,
  onEditExpense,
  onExpensesChange,
  onMarkExpensePaid,
  onOpenAttachments,
  onViewExpense,
  onPersistExpenseUpdate,
  onReclassifyExpense,
  onRecordExpensePayment,
  onStatusChange,
  businessOptions = [],
  paymentAccounts = [],
  providers = mockProviders,
  unitOptions = [],
  userOptions = [],
}: ExpenseTableProps) {
  const t = useExpensesTranslations();
  const locale = useExpensesResolvedLocale();
  const bulkCopy = getFinanceBulkCopy(locale);
  const fundCopy = getExpenseFundGroupCopy(locale);
  const showAuditAction = actionVisibility?.showAudit ?? true;
  const showMarkPaidAction = actionVisibility?.showMarkPaid ?? true;
  const showStatusChangeAction = actionVisibility?.showStatusChange ?? true;
  const showPaymentStatusOptions = showMarkPaidAction;
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>(DEFAULT_EXPENSE_COLUMN_WIDTHS);
  const [expandedFunds, setExpandedFunds] = useState<Set<string>>(() => new Set());
  const [editingRowId, setEditingRowId] = useState<string | null>(null);
  const [resizeStartWidth, setResizeStartWidth] = useState(0);
  const [resizeStartX, setResizeStartX] = useState(0);
  const [resizingColumn, setResizingColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>(null);
  const [sortField, setSortField] = useState<ExpenseSortField | null>(null);
  const [bulkStatusOpen, setBulkStatusOpen] = useState(false);
  const [paymentExpenseId, setPaymentExpenseId] = useState<string | null>(null);
  const paymentAttempts = useRef(new Map<string, { busy: boolean; key: string }>());
  const [payingExpenseIds, setPayingExpenseIds] = useState<Set<string>>(() => new Set());
  const [paymentError, setPaymentError] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [workflowByExpenseId, setWorkflowByExpenseId] = useState<Record<string, ExpenseWorkflowState>>({});
  const rowSelection = useExpenseRowSelection<string>();
  const workspaceState = useMemo<ExpenseTableWorkspaceState>(() => ({
    currentPage,
    pageSize,
    sortDirection,
    sortField,
  }), [currentPage, pageSize, sortDirection, sortField]);
  const restoreWorkspaceState = useCallback((restoredState: ExpenseTableWorkspaceState) => {
    setCurrentPage(Number.isInteger(restoredState.currentPage) && restoredState.currentPage > 0 ? restoredState.currentPage : 1);
    setPageSize(DEFAULT_TABLE_PAGE_SIZE_OPTIONS.includes(restoredState.pageSize as 10) ? restoredState.pageSize : 10);
    setSortDirection(restoredState.sortDirection === 'asc' || restoredState.sortDirection === 'desc' ? restoredState.sortDirection : null);
    setSortField(restoredState.sortField && Object.prototype.hasOwnProperty.call(DEFAULT_EXPENSE_COLUMN_WIDTHS, restoredState.sortField) ? restoredState.sortField : null);
  }, []);

  useWorkspaceNavigationMemory({
    moduleKey: 'expenses',
    tabKey: 'expenses-table',
    enabled: dataReady,
    state: workspaceState,
    defaults: expenseTableWorkspaceDefaults,
    urlFields: expenseTableWorkspaceUrlFields,
    onRestore: restoreWorkspaceState,
    rememberScroll: false,
  });

  const effectiveEmptyMessage = emptyMessage ?? t.expenses.emptyMessage;
  const effectiveEmptyTitle = emptyTitle ?? t.expenses.emptyTitle;
  const editableRowOptions = useEditableRowOptions(expenses, providers, unitOptions, businessOptions, userOptions, accountingAccountOptions);
  const displayRows = useMemo(() => groupExpenseRows(expenses), [expenses]);
  const fundGroups = useMemo(() => displayRows.filter((row): row is ExpenseFundGroup => row.kind === 'fund'), [displayRows]);
  const fundTotals = useExpenseFundTotals(fundGroups);
  const sortedRows = useMemo(() => sortExpenseRows(displayRows, sortField, sortDirection, fundTotals.data),
    [displayRows, sortField, sortDirection, fundTotals.data]);
  const totalPages = Math.max(1, Math.ceil(sortedRows.length / pageSize));
  const pageStartIndex = (Math.min(currentPage, totalPages) - 1) * pageSize;
  const pageEndIndex = pageStartIndex + pageSize;
  const paginatedRows = useMemo(() => sortedRows.slice(pageStartIndex, pageEndIndex), [pageStartIndex, pageEndIndex, sortedRows]);
  const paginationStart = sortedRows.length === 0 ? 0 : pageStartIndex + 1;
  const paginationEnd = Math.min(pageEndIndex, sortedRows.length);
  const selectableExpenses = useMemo(() => displayRows.flatMap(row => row.kind === 'expense' ? [row.expense] : []), [displayRows]);
  const visibleExpenseIds = useMemo(() => paginatedRows.flatMap(row => row.kind === 'expense' ? [row.expense.id] : []), [paginatedRows]);
  const fundRowProps = (group: ExpenseFundGroup) => ({
    group, money: fundTotals.data[group.key], periodLabel: fundPeriodLabel ?? fundCopy.period,
    filtered: hasFundDetailFilters, expanded: expandedFunds.has(group.key),
    onToggle: () => setExpandedFunds(previous => {
      const next = new Set(previous);
      if (next.has(group.key)) next.delete(group.key); else next.add(group.key);
      return next;
    }),
    isColumnVisible, columns, columnWidths, columnCount: visibleColumnCount, options: editableRowOptions,
    onViewExpense, onOpenAttachments, getAttachments,
  });
  const visibleSelection = rowSelection.visibleSelectionState(visibleExpenseIds);
  const visibleColumnCount = useMemo(() => (
    columns.filter(column => column.key !== 'actions' && column.visible).length + 2
  ), [columns]);
  const filteredMoneySummaries = useMemo(() => getMoneySummaries(expenses, columns), [columns, expenses]);
  const selectedExpenses = useMemo(
    () => selectableExpenses.filter(expense => rowSelection.selectedIds.has(expense.id)),
    [rowSelection.selectedIds, selectableExpenses],
  );
  const selectedMoneySummaries = useMemo(() => getMoneySummaries(selectedExpenses, columns), [columns, selectedExpenses]);
  const printSnapshot = useMemo<ExpensePrintSnapshot>(() => {
    const all = sortedRows.flatMap(row => row.kind === 'expense' ? [row.expense] : row.expenses);
    return { all, selected: all.filter(expense => rowSelection.selectedIds.has(expense.id)) };
  }, [sortedRows, rowSelection.selectedIds]);
  useEffect(() => { onPrintSnapshotChange?.(printSnapshot); }, [onPrintSnapshotChange, printSnapshot]);
  const bulkProtected = !onBulkAction || selectedExpenses.some(row => !/^\d+$/.test(row.id) || row.version === undefined
    || row.originFund || row.accountingPosted || row.purchaseOrderId || row.budgetLineId || row.type === 'budget'
    || ['CLOSED', 'CANCELLED', 'REJECTED'].includes(row.backendStatus ?? '')) ? bulkCopy.protected : undefined;
  const selectedUnits = new Set(selectedExpenses.map(row => row.businessUnit));
  const bulkActions: FinanceBulkActionConfig[] = [
    { action: 'DELETE', hint: t.expenses.confirmDelete.description, blockedReason: !onBulkAction || selectedExpenses.some(row => !/^\d+$/.test(row.id) || row.version === undefined || !canDeleteExpense(row)) ? t.expenses.messages.deleteDraftOnly : undefined },
    { action: 'UNIT', options: unitOptions, blockedReason: bulkProtected, hint: bulkCopy.unit },
    { action: 'BUSINESS', options: businessOptions.filter(option => option.unitId === selectedExpenses[0]?.businessUnit), blockedReason: bulkProtected || (selectedUnits.size !== 1 ? bulkCopy.business : undefined), hint: bulkCopy.business },
    { action: 'PAYMENT_ACCOUNT', options: paymentAccounts.filter(account => account.isActive && account.source !== 'petty_cash' && !account.linkedFundId && account.backendType !== 'PETTY_CASH' && selectedExpenses.every(row => row.currency === account.currency)).map(account => ({ value: account.id, label: `${account.name} · ${account.currency}` })), blockedReason: bulkProtected || (selectedExpenses.some(row => getExpenseBalance(row) <= 0) ? bulkCopy.noBalance : undefined), hint: bulkCopy.payment },
    { action: 'ACCOUNTING_ACCOUNT', options: accountingAccountOptions, blockedReason: bulkProtected },
    { action: 'PROVIDER', options: providers.filter(provider => provider.status === 'active').map(provider => ({ value: provider.id, label: provider.name })), blockedReason: bulkProtected },
  ];
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
    rowSelection.pruneSelection(selectableExpenses.map(expense => expense.id));
  }, [selectableExpenses, rowSelection.pruneSelection]);

  useEffect(() => {
    setCurrentPage(current => Math.min(Math.max(current, 1), totalPages));
  }, [currentPage, totalPages]);

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
    if (!currentExpense || !canEditExpense(currentExpense)) return;
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

  const handleDelete = (id: string) => {
    if (deletingExpenseIds.has(id)) return;
    const expense = expenses.find(item => item.id === id);
    if (!expense || !canDeleteExpense(expense)) return;
    if (onDeleteExpense) {
      onDeleteExpense(id);
      return;
    }
    onExpensesChange(prev => prev.filter(expense => expense.id !== id));
  };

  const replaceSavedExpense = (savedExpense: Expense) => {
    onExpensesChange(prev => prev.map(expense => (expense.id === savedExpense.id ? savedExpense : expense)));
  };

  const handleStatusChange = async (id: string, status: ExpenseStatus) => {
    if (!showStatusChangeAction) return;
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
    if (!expense || !canPayExpense(expense) || !onMarkExpensePaid || deletingExpenseIds.has(id)) return;
    const attemptId = `${id}:${expense.paymentAccountId ?? ''}`;
    const attempt = paymentAttempts.current.get(attemptId) ?? { busy: false, key: crypto.randomUUID() };
    if (attempt.busy) return;
    attempt.busy = true;
    paymentAttempts.current.set(attemptId, attempt);
    setPayingExpenseIds(current => new Set(current).add(id));
    setPaymentError('');
    try {
      const savedExpense = await onMarkExpensePaid(expense, attempt.key);
      if (savedExpense) {
        replaceSavedExpense(savedExpense);
        paymentAttempts.current.delete(attemptId);
      } else {
        setPaymentError(t.expenses.messages.saveFailed);
      }
    } catch (error) {
      setPaymentError(toFinanceApiErrorMessage(error, t.expenses.messages.saveFailed));
    } finally {
      attempt.busy = false;
      setPayingExpenseIds(current => { const next = new Set(current); next.delete(id); return next; });
    }
  };

  const openPaymentModal = (id: string) => {
    const expense = expenses.find(item => item.id === id);
    if (!expense || !canPayExpense(expense) || payingExpenseIds.has(id) || deletingExpenseIds.has(id)) return;
    setPaymentExpenseId(id);
  };

  const handleRecordPayment = async (id: string, amount: number, paymentAccountId: string, paymentDate: Date, attachmentFiles: File[], idempotencyKey?: string) => {
    const expense = expenses.find(item => item.id === id);
    if (!expense) return;
    if (getExpenseBalance(expense) <= 0) {
      setPaymentExpenseId(null);
      return;
    }
    if (onRecordExpensePayment) {
      const savedExpense = await onRecordExpensePayment(expense, amount, paymentAccountId, paymentDate, attachmentFiles, idempotencyKey);
      if (savedExpense) {
        replaceSavedExpense(savedExpense);
        setPaymentExpenseId(null);
      }
      if (!savedExpense) throw new Error(t.expenses.messages.saveFailed);
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
      {paymentError && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{paymentError}</p>}
      {rowSelection.selectedCount > 0 ? (
        <FinanceBulkActions key={rowSelection.selectedIdList.join(',')} count={selectedExpenses.length} locale={locale}
          additionalActions={onBulkStatusChange ? [{ id: 'status', label: getExpenseWorkflowCopy(locale).changeStatus, onClick: () => setBulkStatusOpen(true) }] : []}
          actions={bulkActions} onClear={rowSelection.clearSelection} formatError={toFinanceApiErrorMessage}
          onApply={async (action, targetId, reason) => { if (onBulkAction) await onBulkAction(selectedExpenses, action, targetId, reason); }} />
      ) : null}

      {bulkStatusOpen && onBulkStatusChange && <ExpenseBulkStatusModal rows={selectedExpenses} paymentAccounts={paymentAccounts} locale={locale}
        summary={<div className="flex flex-wrap gap-3 text-sm">{selectedMoneySummaries.map(item => <span key={item.key}>{item.label}: {item.value}</span>)}</div>}
        onClose={() => setBulkStatusOpen(false)} onApply={async change => { await onBulkStatusChange(selectedExpenses, change); rowSelection.clearSelection(); }} />}
      {fundGroups.length > 0 && <div className="flex flex-wrap items-center justify-between gap-2 px-1 text-xs text-slate-500 dark:text-slate-400">
        <span>{fundCopy.rows(displayRows.length, expenses.length)}</span>
        {fundTotals.loading && <span role="status">{fundCopy.loading}</span>}
        {fundTotals.error && <span role="alert" className="text-rose-600 dark:text-rose-400">{fundCopy.failed} <button type="button" className="underline" onClick={fundTotals.refresh}>{fundCopy.retry}</button></span>}
      </div>}
      <div className="space-y-2.5 md:hidden">
      {paginatedRows.map(row => row.kind === 'fund'
        ? <ExpenseFundGroupRow key={row.key} {...fundRowProps(row)} mobile />
        : <div key={row.key}>
      <ExpenseMobileCards
        carryoverExpenseIds={carryoverExpenseIds}
        actionVisibility={actionVisibility}
        emptyMessage={effectiveEmptyMessage}
        emptyTitle={effectiveEmptyTitle}
        expenses={[row.expense]}
        deletingExpenseIds={deletingExpenseIds}
        payingExpenseIds={payingExpenseIds}
        isSelected={rowSelection.isSelected}
        onAudit={setEditingRowId}
        onDelete={handleDelete}
        onEdit={(expense) => {
          if (onEditExpense) {
            onEditExpense(expense);
            return;
          }
          setEditingRowId(expense.id);
        }}
        onMarkPaid={handlePay}
        onRecordPayment={openPaymentModal}
        onSelectionChange={rowSelection.toggleSelection}
        onView={onViewExpense}
      />

          </div>)}
      {paginatedRows.length === 0 && <div className="rounded-xl border p-5 text-center"><p>{effectiveEmptyTitle}</p><p className="text-sm text-slate-500">{effectiveEmptyMessage}</p></div>}
      </div>

      <div className="hidden overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800 md:block">
        <div className="overflow-x-auto [container-type:inline-size]">
          <table className="min-w-[1280px]">
          <thead className="border-b border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-900/60">
            <ExpenseTableHeaderRow
              allVisibleSelected={visibleSelection.allVisibleSelected}
              columns={columns}
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
            {sortedRows.length === 0 ? (
              <EmptyExpenseTableRow colSpan={visibleColumnCount} emptyMessage={effectiveEmptyMessage} emptyTitle={effectiveEmptyTitle} />
            ) : (
              paginatedRows.map(row => {
                if (row.kind === 'fund') return <ExpenseFundGroupRow key={row.key} {...fundRowProps(row)} />;
                const expense = row.expense;
                return (
                <EditableExpenseRow
                  key={expense.id}
                  actionVisibility={actionVisibility}
                  expense={expense}
                  isCarryover={carryoverExpenseIds.has(expense.id)}
                  attachmentsCount={expense.attachmentCount ?? getAttachments(expense).length}
                  columns={columns}
                  columnWidths={columnWidths}
                  isEditing={editingRowId === expense.id}
                  isColumnVisible={isColumnVisible}
                  isDeletePending={deletingExpenseIds.has(expense.id)}
                  isPaymentPending={payingExpenseIds.has(expense.id)}
                  isSelected={rowSelection.isSelected(expense.id)}
                  options={editableRowOptions}
                  workflow={workflowByExpenseId[expense.id] ?? getDefaultExpenseWorkflow(expense)}
                  onStartEdit={setEditingRowId}
                  onSelectionChange={rowSelection.toggleSelection}
                  onStatusChange={handleStatusChange}
                  onUpdateExpense={updateExpense}
                  onReclassifyExpense={onReclassifyExpense}
                  onUpdateWorkflow={updateExpenseWorkflow}
                  onOpenAttachments={onOpenAttachments}
                  onDelete={handleDelete}
                  onActionEdit={onEditExpense ? () => onEditExpense(expense) : undefined}
                  onMarkPaid={handlePay}
                  onRecordPayment={openPaymentModal}
                  onAudit={setEditingRowId}
                  onView={() => onViewExpense(expense)}
                />
                );
              })
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
          totalCount={sortedRows.length}
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
          totalCount={sortedRows.length}
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
      <span className={`text-xs font-medium ${emphasis ? 'text-[#147514] dark:text-emerald-300' : 'text-slate-500 dark:text-slate-400'}`}>
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
            <span className="font-medium text-slate-500 dark:text-slate-400">{summary.label}</span>
            <strong className="font-medium text-slate-900 dark:text-white">{summary.value}</strong>
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
