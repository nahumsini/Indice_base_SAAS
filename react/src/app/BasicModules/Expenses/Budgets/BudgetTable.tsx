import { useEffect, useMemo, useState, type Dispatch, type FormEvent, type SetStateAction } from 'react';
import { FailureToast } from '../../../components/FailureToast';
import { LoadingBarOverlay } from '../../../components/LoadingBarOverlay';
import { SuccessToast } from '../../../components/SuccessToast';
import { BudgetDeleteDialog } from './components/BudgetDeleteDialog';
import { providerRecordsToExpenseProviders, toExpenseProvider } from '../adapters/provider.adapter';
import { mockProviders } from '../data/expenses.mock';
import type { Expense, Provider } from '../types/expenses.types';
import type { ProviderRecord } from '../Providers/useProveedoresLogic';
import { createQuickProviderRecord } from '../Providers/providerRecordFactory';
import { accountingAccountsService, budgetLinesService, providersService, toFinanceApiErrorMessage } from '../services';
import { usePreferredBusinessCurrency } from '../../shared/BusinessCurrencyContext';
import type { ColumnConfig } from '../types/expenseView.types';
import type { FinanceReferenceOption } from '../types/finance-reference.types';
import { BudgetCreateModal } from '../components/modals/BudgetCreateModal';
import { BudgetFiltersPanel } from '../components/filters/BudgetFiltersPanel';
import { ColumnConfigurationModal } from '../components/table/ColumnConfigurationModal';
import { useFinanceReferenceData } from '../hooks/useFinanceReferenceData';
import { useBudgetsTranslations } from './hooks/useBudgetsTranslations';
import { buildBudgetLineDraft, buildBudgetMasterDraft, createBudgetDraftStateFromExpense, createInitialBudgetDraftState } from './budgetDraftState';
import { generateProjectedBudgetEntries, getBudgetScheduleDates } from './budgetUtils';
import { BudgetLinesTable } from './components/BudgetLinesTable';
import { BudgetSummaryBar } from './components/BudgetSummaryBar';
import { BudgetTableHeader } from './components/BudgetTableHeader';
import { MISSING_ACCOUNTING_ACCOUNT_FILTER, useBudgetLogic } from './useBudgetLogic';
import { useBudgetMasters } from './useBudgetMasters';
import { useBudgetTableColumns } from './hooks/useBudgetTableColumns';
import type { FinanceBulkAction } from '../../shared/financeBulkActions.copy';
import type { BudgetLineTableRow } from './types/budgetLineTable.types';
import { toBudgetLineTableRow } from './types/budgetLineTable.types';

interface BudgetTableProps {
  columns: ColumnConfig[];
  expenses: Expense[];
  loadError?: string;
  onExpensesChange: Dispatch<SetStateAction<Expense[]>>;
  onProvidersChange?: Dispatch<SetStateAction<ProviderRecord[]>>;
  onRetryLoad?: () => void;
  providers?: ProviderRecord[];
}

export default function BudgetTable({ columns, expenses, loadError, onExpensesChange, onProvidersChange, onRetryLoad, providers: providerRecords }: BudgetTableProps) {
  const t = useBudgetsTranslations();
  const { preferredCurrency } = usePreferredBusinessCurrency();
  const [activeAccountingAccountOptions, setActiveAccountingAccountOptions] = useState<FinanceReferenceOption[]>([]);
  const [bulkAccountingOptions, setBulkAccountingOptions] = useState<FinanceReferenceOption[]>([]);
  const [draft, setDraft] = useState(() => createInitialBudgetDraftState(preferredCurrency));
  const [editingBudgetExpense, setEditingBudgetExpense] = useState<Expense | null>(null);
  const [failureToastMessage, setFailureToastMessage] = useState('');
  const [isColumnModalOpen, setIsColumnModalOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [pendingDeleteBudgetExpenseIds, setPendingDeleteBudgetExpenseIds] = useState<string[]>([]);
  const [selectionResetKey, setSelectionResetKey] = useState(0);
  const [successToastMessage, setSuccessToastMessage] = useState('');
  const { columns: tableColumns, applyColumns } = useBudgetTableColumns(columns);
  const {
    accountingAccountFilter,
    businessFilter,
    businessUnitFilter,
    customEndDate,
    customStartDate,
    filteredBudgetExpenses,
    futureFilter,
    healthFilter,
    providerFilter,
    searchTerm,
    statusFilter,
    summaryBudgetExpenses,
    setAccountingAccountFilter,
    setBusinessFilter,
    setBusinessUnitFilter,
    setCustomEndDate,
    setCustomStartDate,
    setFutureFilter,
    setHealthFilter,
    setProviderFilter,
    setSearchTerm,
    setStatusFilter,
  } = useBudgetLogic({ expenses });
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

  useEffect(() => {
    let isMounted = true;

    accountingAccountsService.getAccountingAccounts()
      .then(accounts => {
        if (!isMounted) return;
        setBulkAccountingOptions(accounts.filter(account => account.isActive).map(account => ({ value: account.id, label: `${account.code} - ${account.name}` })));
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
      : Array.from(new Set(expenses.map(expense => expense.businessUnit.trim()).filter(Boolean))).map(value => ({ value, label: value }))
  ), [expenses, referenceUnitOptions]);
  const businessOptions = useMemo(() => (
    referenceBusinessOptions.length > 0
      ? referenceBusinessOptions
      : Array.from(new Set(expenses.map(expense => expense.business.trim()).filter(Boolean))).map(value => ({ value, label: value }))
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
  const budgetTableRows = useMemo(
    () => filteredBudgetExpenses.map(expense => ({
      ...toBudgetLineTableRow(expense),
      businessUnit: unitOptions.find(option => option.value === expense.businessUnit)?.label ?? expense.businessUnit,
      business: businessOptions.find(option => option.value === expense.business)?.label ?? expense.business,
    })),
    [filteredBudgetExpenses, unitOptions, businessOptions],
  );
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
  const healthOptions = useMemo(() => [
    { value: 'all', label: t.common.all },
    ...['ON_TRACK', 'WARNING', 'EXCEEDED'].map(value => ({ value, label: t.budgets.healthLabels[value] ?? value })),
  ], [t]);
  const statusOptions = useMemo(() => [
    { value: 'all', label: t.common.all },
    ...Array.from(new Set([
      'DRAFT',
      'ACTIVE',
      'CLOSED',
      'ARCHIVED',
      ...expenses
        .filter(expense => expense.type === 'budget')
        .map(expense => expense.budgetStatus ?? expense.status),
    ]))
      .sort()
      .map(value => ({ value, label: t.budgets.statusLabels[value] ?? value })),
  ], [expenses, t]);

  const openCreateModal = () => {
    setDraft(createInitialBudgetDraftState(preferredCurrency));
    setEditingBudgetExpense(null);
    setIsCreateModalOpen(true);
  };

  const closeBudgetModal = () => {
    setDraft(createInitialBudgetDraftState(preferredCurrency));
    setEditingBudgetExpense(null);
    setIsCreateModalOpen(false);
  };

  const updateDraft = (updates: Partial<ReturnType<typeof createInitialBudgetDraftState>>) => {
    setDraft(current => ({ ...current, ...updates }));
  };

  const handleQuickProviderCreate = async (name: string): Promise<Provider> => {
    const normalizedName = name.trim();
    const existingProvider = providers.find(provider => provider.name.trim().toLocaleLowerCase() === normalizedName.toLocaleLowerCase());
    if (existingProvider) return existingProvider;

    const providerRecord = createQuickProviderRecord(providerRecords ?? [], normalizedName);
    try {
      const savedProvider = await providersService.createProvider(providerRecord);
      onProvidersChange?.(currentProviders => [savedProvider, ...currentProviders]);
      setSuccessToastMessage(t.expenses.payableAccount.quickProviderCreated);
      return toExpenseProvider(savedProvider);
    } catch (error) {
      setFailureToastMessage(toFinanceApiErrorMessage(error, t.expenses.payableAccount.quickProviderSaveFailed));
      throw error;
    }
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
    setHealthFilter('all');
    setStatusFilter('all');
  };

  const openEditBudgetExpense = (expense: Expense) => {
    setDraft(createBudgetDraftStateFromExpense(expense));
    setEditingBudgetExpense(expense);
    setIsCreateModalOpen(true);
  };

  const openEditBudgetLine = (budgetLineId: string) => {
    const expense = filteredBudgetExpenses.find(item => item.id === budgetLineId);
    if (expense) openEditBudgetExpense(expense);
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

      onExpensesChange(currentExpenses => [...savedEntries, ...currentExpenses]);
      revealCreatedBudgetEntries(savedEntries);

      if (failedEntries.length > 0) {
        setFailureToastMessage(t.budgets.messages.partialSaveFailed);
      } else {
        setSuccessToastMessage(t.budgets.messages.created(savedEntries.length));
      }
      setDraft(createInitialBudgetDraftState(preferredCurrency));
      setIsCreateModalOpen(false);
    } catch (error) {
      setFailureToastMessage(toFinanceApiErrorMessage(error, t.budgets.messages.createFailed));
      throw error;
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

    try {
      const savedExpense = editingBudgetExpense.id.startsWith('budget-line-')
        ? await budgetLinesService.updateBudgetLineFromExpense(nextExpense)
        : nextExpense;
      onExpensesChange(currentExpenses => currentExpenses.map(expense => (
        expense.id === editingBudgetExpense.id ? savedExpense : expense
      )));
      setSuccessToastMessage(t.budgets.messages.updated);
      closeBudgetModal();
    } catch (error) {
      setFailureToastMessage(toFinanceApiErrorMessage(error, t.budgets.messages.lineSaveFailed));
      throw error;
    }
  };

  const applyBulkAction = async (action: FinanceBulkAction, rows: BudgetLineTableRow[], targetId: string, reason: string) => {
    if (action === 'PAYMENT_ACCOUNT') throw new Error('Payment belongs to the linked expense.');
    const saved = await budgetLinesService.applyBulkAction(action, rows, targetId, reason);
    const ids = new Set(rows.map(row => row.id));
    const updates = new Map(saved.map(row => [row.id, row]));
    onExpensesChange(current => current.flatMap(row => action === 'DELETE' && ids.has(row.id) ? [] : [updates.get(row.id) ?? row]));
    setSuccessToastMessage(action === 'DELETE' ? t.budgets.messages.deleted : t.budgets.messages.updated);
  };

  const requestDeleteBudgetExpense = (expenseId: string) => {
    setPendingDeleteBudgetExpenseIds([expenseId]);
  };

  const pendingDeleteBudgetExpenses = pendingDeleteBudgetExpenseIds
    .map(expenseId => expenses.find(expense => expense.id === expenseId))
    .filter((expense): expense is Expense => Boolean(expense));

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
        healthFilter={healthFilter}
        healthOptions={healthOptions}
        providerFilter={providerFilter}
        providers={providers}
        resultCount={filteredBudgetExpenses.length}
        searchTerm={searchTerm}
        statusFilter={statusFilter}
        statusOptions={statusOptions}
        onAccountingAccountChange={setAccountingAccountFilter}
        onBusinessChange={setBusinessFilter}
        onBusinessUnitChange={setBusinessUnitFilter}
        onCustomEndDateChange={setCustomEndDate}
        onCustomStartDateChange={setCustomStartDate}
        onFutureFilterChange={setFutureFilter}
        onHealthChange={setHealthFilter}
        onProviderChange={setProviderFilter}
        onSearchChange={setSearchTerm}
        onStatusChange={setStatusFilter}
      />

      <BudgetSummaryBar
        key={summaryBudgetExpenses.map(row => `${row.id}:${row.version}`).join('|')}
        expenses={summaryBudgetExpenses}
        healthFilter={healthFilter}
        onHealthChange={setHealthFilter}
      />

      {isCreateModalOpen && (
        <BudgetCreateModal
          accountingAccountOptions={selectableAccountingAccountOptions}
          businessOptions={businessOptions}
          draft={draft}
          mode={editingBudgetExpense ? 'edit' : 'create'}
          providers={providers}
          onCreateProvider={onProvidersChange ? handleQuickProviderCreate : undefined}
          unitOptions={unitOptions}
          onClose={closeBudgetModal}
          onDraftChange={updateDraft}
          onSubmit={editingBudgetExpense ? handleEditSubmit : handleCreateSubmit}
        />
      )}

      <BudgetLinesTable
        budgetLines={budgetTableRows}
        columns={tableColumns}
        errorMessage={loadError}
        selectionResetKey={selectionResetKey}
        onDeleteBudgetLine={requestDeleteBudgetExpense}
        bulkOptions={{ units: referenceUnitOptions, businesses: referenceBusinessOptions,
          providers: providers.filter(provider => provider.status === 'active').map(provider => ({ value: provider.id, label: provider.name })), accounts: bulkAccountingOptions }}
        onBulkAction={applyBulkAction}
        onEditBudgetLine={openEditBudgetLine}
        onRetry={onRetryLoad}
      />

      {isColumnModalOpen && (
        <ColumnConfigurationModal
          columns={tableColumns}
          defaultColumns={columns}
          onClose={() => setIsColumnModalOpen(false)}
          onSaveColumns={(nextColumns) => {
            applyColumns(nextColumns);
            setIsColumnModalOpen(false);
          }}
        />
      )}

      {pendingDeleteBudgetExpenses.length > 0 && <BudgetDeleteDialog
        rows={pendingDeleteBudgetExpenses.map(toBudgetLineTableRow)}
        onClose={() => setPendingDeleteBudgetExpenseIds([])}
        onDelete={async reason => {
          await applyBulkAction('DELETE', pendingDeleteBudgetExpenses.map(toBudgetLineTableRow), '', reason);
          setSelectionResetKey(current => current + 1);
        }}
      />}

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

function toDateFromInput(value: string) {
  return value ? new Date(`${value}T00:00:00`) : new Date('');
}

function formatDateInputValue(value: Date) {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, '0');
  const day = String(value.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
