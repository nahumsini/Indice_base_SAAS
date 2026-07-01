import { useCallback, useEffect, useMemo, useRef, useState, type Dispatch, type DragEvent, type FormEvent, type SetStateAction } from 'react';
import { FailureToast } from '../../../components/FailureToast';
import { LoadingBarOverlay } from '../../../components/LoadingBarOverlay';
import { SuccessToast } from '../../../components/SuccessToast';
import { providerRecordsToExpenseProviders } from '../adapters/provider.adapter';
import { mockProviders } from '../data/expenses.mock';
import type { Expense } from '../types/expenses.types';
import type { ProviderRecord } from '../Providers/useProveedoresLogic';
import { accountingAccountsService, budgetLinesService, toFinanceApiErrorMessage } from '../services';
import type { ColumnConfig } from '../types/expenseView.types';
import type { FinanceReferenceOption } from '../types/finance-reference.types';
import { BudgetCreateModal } from '../components/modals/BudgetCreateModal';
import { BudgetFiltersPanel } from '../components/filters/BudgetFiltersPanel';
import { ColumnConfigurationModal } from '../components/table/ColumnConfigurationModal';
import { useFinanceReferenceData } from '../hooks/useFinanceReferenceData';
import { useFinanceTranslations } from '../hooks/useFinanceTranslations';
import { buildBudgetLineDraft, buildBudgetMasterDraft, createBudgetDraftStateFromExpense, createInitialBudgetDraftState } from './budgetDraftState';
import { generateProjectedBudgetEntries, getBudgetScheduleDates } from './budgetUtils';
import { BudgetLinesTable } from './components/BudgetLinesTable';
import { BudgetSummaryBar } from './components/BudgetSummaryBar';
import { BudgetTableHeader } from './components/BudgetTableHeader';
import { MISSING_ACCOUNTING_ACCOUNT_FILTER, useBudgetLogic } from './useBudgetLogic';
import { useBudgetMasters } from './useBudgetMasters';

interface BudgetTableProps {
  columns: ColumnConfig[];
  expenses: Expense[];
  onExpensesChange: Dispatch<SetStateAction<Expense[]>>;
  providers?: ProviderRecord[];
}

export default function BudgetTable({ columns, expenses, onExpensesChange, providers: providerRecords }: BudgetTableProps) {
  const t = useFinanceTranslations();
  const [activeAccountingAccountOptions, setActiveAccountingAccountOptions] = useState<FinanceReferenceOption[]>([]);
  const [draft, setDraft] = useState(createInitialBudgetDraftState);
  const [draggedColumnIndex, setDraggedColumnIndex] = useState<number | null>(null);
  const [editingBudgetExpense, setEditingBudgetExpense] = useState<Expense | null>(null);
  const [failureToastMessage, setFailureToastMessage] = useState('');
  const [isColumnModalOpen, setIsColumnModalOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [successToastMessage, setSuccessToastMessage] = useState('');
  const [tableColumns, setTableColumns] = useState(() => columns.map(column => ({ ...column })));
  const saveTimeoutsRef = useRef<Record<string, number>>({});
  const {
    accountingAccountFilter,
    businessFilter,
    businessUnitFilter,
    customEndDate,
    customStartDate,
    filteredBudgetExpenses,
    futureFilter,
    providerFilter,
    searchTerm,
    setAccountingAccountFilter,
    setBusinessFilter,
    setBusinessUnitFilter,
    setCustomEndDate,
    setCustomStartDate,
    setFutureFilter,
    setProviderFilter,
    setSearchTerm,
  } = useBudgetLogic({ expenses, onExpensesChange });
  const providers = useMemo(() => (
    providerRecords?.length ? providerRecordsToExpenseProviders(providerRecords) : mockProviders
  ), [providerRecords]);
  const {
    businessOptions: referenceBusinessOptions,
    unitOptions: referenceUnitOptions,
  } = useFinanceReferenceData(setFailureToastMessage);
  const {
    createBudget,
    isLoadingBudgets,
  } = useBudgetMasters(setFailureToastMessage);

  useEffect(() => () => {
    Object.values(saveTimeoutsRef.current).forEach(timeoutId => window.clearTimeout(timeoutId));
  }, []);

  useEffect(() => {
    setTableColumns(currentColumns => reconcileBudgetColumns(currentColumns, columns));
  }, [columns]);

  useEffect(() => {
    let isMounted = true;

    accountingAccountsService.getAccountingAccounts()
      .then(accounts => {
        if (!isMounted) return;
        setActiveAccountingAccountOptions(accounts
          .filter(account => account.isActive)
          .sort((first, second) => first.code.localeCompare(second.code))
          .map(account => {
            const label = `${account.code} - ${account.name}`;
            return { value: label, label };
          }));
      })
      .catch(error => {
        if (isMounted) {
          setFailureToastMessage(toFinanceApiErrorMessage(error, t.expenses.messages.accountLoadFailed));
        }
      });

    return () => {
      isMounted = false;
    };
  }, [t.expenses.messages.accountLoadFailed]);

  const unitOptions = useMemo(() => (
    referenceUnitOptions.length > 0
      ? referenceUnitOptions
      : Array.from(new Set(expenses.map(expense => expense.businessUnit))).map(value => ({ value, label: value }))
  ), [expenses, referenceUnitOptions]);
  const businessOptions = useMemo(() => (
    referenceBusinessOptions.length > 0
      ? referenceBusinessOptions
      : Array.from(new Set(expenses.map(expense => expense.business))).map(value => ({ value, label: value }))
  ), [expenses, referenceBusinessOptions]);
  const businessUnitFilterOptions = useMemo(() => [{ value: 'all', label: t.common.all }, ...unitOptions], [t.common.all, unitOptions]);
  const businessFilterOptions = useMemo(() => [{ value: 'all', label: t.common.all }, ...businessOptions], [businessOptions, t.common.all]);
  const fallbackAccountingAccountOptions = useMemo<FinanceReferenceOption[]>(() => {
    const accounts = new Set<string>();

    expenses.forEach(expense => {
      if (expense.type !== 'budget') return;
      const account = expense.accountingAccount?.trim();
      if (account) accounts.add(account);
    });

    return Array.from(accounts)
      .sort((first, second) => first.localeCompare(second))
      .map(account => ({ value: account, label: account }));
  }, [expenses]);
  const selectableAccountingAccountOptions = activeAccountingAccountOptions.length > 0
    ? activeAccountingAccountOptions
    : fallbackAccountingAccountOptions;
  const accountingAccountFilterOptions = useMemo(() => {
    const accounts = new Set<string>();
    let hasMissingAccount = false;

    expenses.forEach(expense => {
      if (expense.type !== 'budget') return;
      const account = expense.accountingAccount?.trim();
      if (account) {
        accounts.add(account);
        return;
      }
      hasMissingAccount = true;
    });

    return [
      { value: 'all', label: t.common.all },
      ...Array.from(accounts).sort((first, second) => first.localeCompare(second)).map(account => ({ value: account, label: account })),
      ...(hasMissingAccount ? [{ value: MISSING_ACCOUNTING_ACCOUNT_FILTER, label: t.budgets.columns.accountingAccount.label }] : []),
    ];
  }, [expenses, t.budgets.columns.accountingAccount.label, t.common.all]);

  const openCreateModal = () => {
    setDraft(createInitialBudgetDraftState());
    setEditingBudgetExpense(null);
    setIsCreateModalOpen(true);
  };

  const closeBudgetModal = () => {
    setDraft(createInitialBudgetDraftState());
    setEditingBudgetExpense(null);
    setIsCreateModalOpen(false);
  };

  const updateDraft = (updates: Partial<ReturnType<typeof createInitialBudgetDraftState>>) => {
    setDraft(current => ({ ...current, ...updates }));
  };

  const revealCreatedBudgetEntries = (entries: Expense[]) => {
    const scheduledDates = entries
      .map(entry => entry.dueDate)
      .filter(date => !Number.isNaN(date.getTime()))
      .sort((left, right) => left.getTime() - right.getTime());

    if (scheduledDates.length === 0) return;

    setFutureFilter('custom');
    setCustomStartDate(formatDateInputValue(scheduledDates[0]));
    setCustomEndDate(formatDateInputValue(scheduledDates[scheduledDates.length - 1]));
    setSearchTerm('');
    setBusinessUnitFilter('all');
    setBusinessFilter('all');
    setProviderFilter('all');
    setAccountingAccountFilter('all');
  };

  const openEditBudgetExpense = (expense: Expense) => {
    setDraft(createBudgetDraftStateFromExpense(expense));
    setEditingBudgetExpense(expense);
    setIsCreateModalOpen(true);
  };

  const handleCreateSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    try {
      const budget = await createBudget(buildBudgetMasterDraft(draft));
      const providerName = providers.find(provider => provider.id === draft.providerId)?.name;
      const localBudgetEntries = generateProjectedBudgetEntries(
        buildBudgetLineDraft(draft, providerName),
        expenses.filter(expense => expense.type === 'budget').length,
      ).map(entry => ({ ...entry, budgetId: budget.id }));
      const createLineResults = await Promise.allSettled(
        localBudgetEntries.map(entry => budgetLinesService.createBudgetLineFromExpense(entry, budget.id)),
      );
      const savedEntries = createLineResults
        .filter((result): result is PromiseFulfilledResult<Expense> => result.status === 'fulfilled')
        .map(result => result.value);
      const failedEntries = createLineResults
        .map((result, index) => (result.status === 'rejected' ? localBudgetEntries[index] : null))
        .filter((entry): entry is (typeof localBudgetEntries)[number] => Boolean(entry));

      onExpensesChange(currentExpenses => [...savedEntries, ...failedEntries, ...currentExpenses]);
      revealCreatedBudgetEntries([...savedEntries, ...failedEntries]);

      if (failedEntries.length > 0) {
        setFailureToastMessage(t.budgets.messages.partialSaveFailed);
      } else {
        setSuccessToastMessage(t.budgets.messages.created(savedEntries.length));
      }
      setDraft(createInitialBudgetDraftState());
      setIsCreateModalOpen(false);
    } catch (error) {
      setFailureToastMessage(toFinanceApiErrorMessage(error, t.budgets.messages.createFailed));
    }
  };

  const handleEditSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!editingBudgetExpense) return;

    const providerName = providers.find(provider => provider.id === draft.providerId)?.name;
    const lineDraft = buildBudgetLineDraft(draft, providerName);
    const scheduleDates = getBudgetScheduleDates(
      toDateFromInput(draft.budgetPeriodStart),
      toDateFromInput(draft.budgetPeriodEnd),
      draft.frequency,
    );
    const dueDate = scheduleDates[0] ?? lineDraft.startDate;
    const nextExpense: Expense = {
      ...editingBudgetExpense,
      accountingAccount: lineDraft.accountingAccount,
      amount: lineDraft.amount ?? 0,
      business: lineDraft.business,
      businessUnit: lineDraft.businessUnit,
      concept: lineDraft.concept,
      currency: lineDraft.currency ?? editingBudgetExpense.currency,
      date: dueDate,
      description: lineDraft.description,
      dueDate,
      duration: scheduleDates.length || 1,
      frequency: lineDraft.frequency,
      providerId: lineDraft.providerId,
      providerName,
      startDate: lineDraft.startDate,
      taxes: lineDraft.taxes ?? 0,
      taxCountry: lineDraft.taxCountry,
      taxIncluded: lineDraft.taxIncluded,
      taxMode: lineDraft.taxMode,
      taxName: lineDraft.taxName,
      taxProfileId: lineDraft.taxProfileId,
      taxRate: lineDraft.taxRate,
      taxRegion: lineDraft.taxRegion,
      taxSpecialAmount: lineDraft.taxSpecialAmount,
      total: lineDraft.total ?? 0,
      updatedAt: new Date(),
    };

    onExpensesChange(currentExpenses => currentExpenses.map(expense => (
      expense.id === editingBudgetExpense.id ? nextExpense : expense
    )));
    persistBudgetExpense(nextExpense);
    setSuccessToastMessage(t.budgets.messages.updated);
    closeBudgetModal();
  };

  const persistBudgetExpense = useCallback((expense: Expense) => {
    if (!expense.id.startsWith('budget-line-')) return;
    window.clearTimeout(saveTimeoutsRef.current[expense.id]);
    saveTimeoutsRef.current[expense.id] = window.setTimeout(() => {
      budgetLinesService.updateBudgetLineFromExpense(expense)
        .then(savedExpense => {
          onExpensesChange(currentExpenses => currentExpenses.map(item => (
            item.id === expense.id ? savedExpense : item
          )));
        })
        .catch(error => {
          setFailureToastMessage(toFinanceApiErrorMessage(error, t.budgets.messages.lineSaveFailed));
        });
    }, 700);
  }, [onExpensesChange, t.budgets.messages.lineSaveFailed]);

  const deleteBudgetExpense = (expenseId: string) => {
    const expense = expenses.find(item => item.id === expenseId);
    onExpensesChange(currentExpenses => currentExpenses.filter(item => item.id !== expenseId));
    if (!expense || !expense.id.startsWith('budget-line-')) return;

    budgetLinesService.deleteBudgetLine(expenseId)
      .then(() => setSuccessToastMessage(t.budgets.messages.deleted))
      .catch(error => {
        onExpensesChange(currentExpenses => [expense, ...currentExpenses]);
        setFailureToastMessage(toFinanceApiErrorMessage(error, t.budgets.messages.deleteFailed));
      });
  };

  const handleColumnDragStart = (index: number) => {
    setDraggedColumnIndex(index);
  };

  const handleColumnDragOver = (event: DragEvent, index: number) => {
    event.preventDefault();
    if (draggedColumnIndex === null || draggedColumnIndex === index) return;

    setTableColumns(currentColumns => {
      const nextColumns = [...currentColumns];
      const draggedColumn = nextColumns[draggedColumnIndex];
      nextColumns.splice(draggedColumnIndex, 1);
      nextColumns.splice(index, 0, draggedColumn);
      return nextColumns;
    });
    setDraggedColumnIndex(index);
  };

  const handleColumnDragEnd = () => {
    setDraggedColumnIndex(null);
  };

  const updateColumnVisibility = (index: number, visible: boolean) => {
    setTableColumns(currentColumns => {
      const nextColumns = [...currentColumns];
      const targetColumn = nextColumns[index];
      nextColumns[index] = { ...targetColumn, visible: targetColumn.fixed ? true : visible };
      return nextColumns;
    });
  };

  return (
    <div className="space-y-6">
      <LoadingBarOverlay isVisible={isLoadingBudgets} title={t.budgets.loadingTitle} description={t.budgets.loadingDescription} />
      <BudgetTableHeader onConfigureColumns={() => setIsColumnModalOpen(true)} onCreate={openCreateModal} />

      <BudgetFiltersPanel
        accountingAccountFilter={accountingAccountFilter}
        accountingAccountOptions={accountingAccountFilterOptions}
        businessOptions={businessFilterOptions}
        businessFilter={businessFilter}
        businessUnitFilter={businessUnitFilter}
        businessUnitOptions={businessUnitFilterOptions}
        customEndDate={customEndDate}
        customStartDate={customStartDate}
        futureFilter={futureFilter}
        providerFilter={providerFilter}
        providers={providers}
        resultCount={filteredBudgetExpenses.length}
        searchTerm={searchTerm}
        onAccountingAccountChange={setAccountingAccountFilter}
        onBusinessChange={setBusinessFilter}
        onBusinessUnitChange={setBusinessUnitFilter}
        onCustomEndDateChange={setCustomEndDate}
        onCustomStartDateChange={setCustomStartDate}
        onFutureFilterChange={setFutureFilter}
        onProviderChange={setProviderFilter}
        onSearchChange={setSearchTerm}
      />

      <BudgetSummaryBar expenses={filteredBudgetExpenses} />

      {isCreateModalOpen && (
        <BudgetCreateModal
          accountingAccountOptions={selectableAccountingAccountOptions}
          businessOptions={businessOptions}
          draft={draft}
          mode={editingBudgetExpense ? 'edit' : 'create'}
          providers={providers}
          unitOptions={unitOptions}
          onClose={closeBudgetModal}
          onDraftChange={updateDraft}
          onSubmit={editingBudgetExpense ? handleEditSubmit : handleCreateSubmit}
        />
      )}

      <BudgetLinesTable
        columns={tableColumns}
        expenses={filteredBudgetExpenses}
        onDeleteExpense={deleteBudgetExpense}
        onEditExpense={openEditBudgetExpense}
      />

      {isColumnModalOpen && (
        <ColumnConfigurationModal
          columns={tableColumns}
          description={t.budgets.headerSubtitle}
          onApply={() => setIsColumnModalOpen(false)}
          onClose={() => setIsColumnModalOpen(false)}
          onDragEnd={handleColumnDragEnd}
          onDragOver={handleColumnDragOver}
          onDragStart={handleColumnDragStart}
          onHideOptionalColumns={() => setTableColumns(currentColumns => currentColumns.map(column => (column.fixed ? { ...column, visible: true } : { ...column, visible: false })))}
          onShowAllColumns={() => setTableColumns(currentColumns => currentColumns.map(column => ({ ...column, visible: true })))}
          onUpdateVisibility={updateColumnVisibility}
        />
      )}

      <SuccessToast
        isVisible={Boolean(successToastMessage)}
        message={successToastMessage}
        onClose={() => setSuccessToastMessage('')}
      />
      <FailureToast
        isVisible={Boolean(failureToastMessage)}
        message={failureToastMessage}
        onClose={() => setFailureToastMessage('')}
      />
    </div>
  );
}

function reconcileBudgetColumns(currentColumns: ColumnConfig[], sourceColumns: ColumnConfig[]) {
  const sourceByKey = new Map(sourceColumns.map(column => [column.key, column]));
  const currentByKey = new Map(currentColumns.map(column => [column.key, column]));
  const nextColumns = [
    ...currentColumns
      .filter(column => sourceByKey.has(column.key))
      .map(column => {
        const sourceColumn = sourceByKey.get(column.key);
        return {
          ...sourceColumn,
          visible: sourceColumn?.fixed ? true : column.visible,
        } as ColumnConfig;
      }),
    ...sourceColumns
      .filter(column => !currentByKey.has(column.key))
      .map(column => ({ ...column })),
  ];

  return areColumnConfigsEqual(currentColumns, nextColumns) ? currentColumns : nextColumns;
}

function areColumnConfigsEqual(leftColumns: ColumnConfig[], rightColumns: ColumnConfig[]) {
  if (leftColumns.length !== rightColumns.length) return false;

  return leftColumns.every((leftColumn, index) => {
    const rightColumn = rightColumns[index];
    return (
      leftColumn.key === rightColumn.key
      && leftColumn.label === rightColumn.label
      && leftColumn.visible === rightColumn.visible
      && Boolean(leftColumn.fixed) === Boolean(rightColumn.fixed)
    );
  });
}

function toDateFromInput(value: string) {
  return value ? new Date(`${value}T00:00:00`) : new Date('');
}

function formatDateInputValue(value: Date) {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, '0');
  const day = String(value.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
