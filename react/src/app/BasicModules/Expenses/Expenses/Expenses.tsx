import { useCallback, useEffect, useMemo, useRef, useState, type Dispatch, type SetStateAction } from 'react';
import { Plus } from 'lucide-react';
import { FailureToast } from '../../../components/FailureToast';
import { SuccessToast } from '../../../components/SuccessToast';
import { Button } from '../../../components/ui/button';
import { useLocalStorageState } from '../../../hooks/useLocalStorageState';
import { isBackendId } from '../adapters/adapter.utils';
import { providerRecordsToExpenseProviders } from '../adapters/provider.adapter';
import { DEFAULT_FINANCE_CURRENCY, isFinanceCurrencyOption } from '../constants/financeCurrencyOptions';
import { hrPreferredCurrencyStorageKey } from '../../shared/businessCurrency';
import { mockExpenses, mockProviders } from '../data/expenses.mock';
import { accountingAccountsService, expensesService, toFinanceApiErrorMessage } from '../services';
import type { Expense, Provider } from '../types/expenses.types';
import type { ExpenseListFilters } from '../types/expenseView.types';
import type { ProviderRecord } from '../Providers/useProveedoresLogic';
import { calculateExpenseTotals, filterExpenses } from '../utils/expenseFilters';
import { useExpenseAttachments } from '../hooks/useExpenseAttachments';
import { useExpenseColumns } from '../hooks/useExpenseColumns';
import { useFinanceReferenceData } from '../hooks/useFinanceReferenceData';
import { useFinanceTranslations } from '../hooks/useFinanceTranslations';
import { ExpensesHeader } from '../components/header/ExpensesHeader';
import { ExpensesFilters } from '../components/filters/ExpensesFilters';
import { ExpensesSummary } from '../components/kpis/ExpensesSummary';
import { ColumnConfigurationModal } from '../components/table/ColumnConfigurationModal';
import { ExpenseFormModal } from '../components/modals/ExpenseFormModal';
import type { ExpenseFormValues } from '../components/modals/ExpenseFormModal';
import { QuickExpenseDialog, type QuickExpenseValues } from '../components/modals/QuickExpenseDialog';
import type { FinanceReferenceOption } from '../types/finance-reference.types';
import { AttachmentsModal } from './components/AttachmentsModal';
import { ExpenseTable } from './components/ExpenseTable';

interface ExpensesProps {
  expenses?: Expense[];
  onExpensesChange?: Dispatch<SetStateAction<Expense[]>>;
  providers?: ProviderRecord[];
}

const defaultFilters: ExpenseListFilters = {
  searchTerm: '',
  periodFilter: 'this_month',
  businessUnitFilter: 'all',
  businessFilter: 'all',
  providerFilter: 'all',
  statusFilter: 'all',
};

const toFallbackOptions = (values: string[]): FinanceReferenceOption[] =>
  Array.from(new Set(values.filter(Boolean))).map(value => ({ value, label: value }));

const createExpenseFolio = (currentExpenses: Expense[]) => {
  const year = new Date().getFullYear();
  const prefix = `EXP-${year}-`;
  const nextSequence = currentExpenses.reduce((highest, expense) => {
    if (!expense.folio.startsWith(prefix)) return highest;
    const sequence = Number(expense.folio.slice(prefix.length));
    return Number.isFinite(sequence) ? Math.max(highest, sequence) : highest;
  }, 0) + 1;

  return `${prefix}${String(nextSequence).padStart(3, '0')}`;
};

export default function Expenses({ expenses: controlledExpenses, onExpensesChange, providers: providerRecords }: ExpensesProps = {}) {
  const t = useFinanceTranslations();
  const [localExpenses, setLocalExpenses] = useState<Expense[]>(mockExpenses);
  const [filters, setFilters] = useState<ExpenseListFilters>(defaultFilters);
  const [failureToastMessage, setFailureToastMessage] = useState('');
  const [accountingAccountOptions, setAccountingAccountOptions] = useState<FinanceReferenceOption[]>([]);
  const [isColumnModalOpen, setIsColumnModalOpen] = useState(false);
  const [isAddExpenseModalOpen, setIsAddExpenseModalOpen] = useState(false);
  const [isQuickExpenseModalOpen, setIsQuickExpenseModalOpen] = useState(false);
  const [isQuickExpenseSubmitting, setIsQuickExpenseSubmitting] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [successToastMessage, setSuccessToastMessage] = useState('');
  const [storedPreferredCurrency, setStoredPreferredCurrency] = useLocalStorageState<string>(hrPreferredCurrencyStorageKey, DEFAULT_FINANCE_CURRENCY);
  const saveTimeoutsRef = useRef<Record<string, number>>({});
  const expenses = controlledExpenses ?? localExpenses;
  const setExpenses = onExpensesChange ?? setLocalExpenses;
  const preferredCurrency = isFinanceCurrencyOption(storedPreferredCurrency) ? storedPreferredCurrency : DEFAULT_FINANCE_CURRENCY;
  const { businessOptions: referenceBusinessOptions, currentUser, isLoadingReferenceData, unitOptions: referenceUnitOptions, userOptions } =
    useFinanceReferenceData(setFailureToastMessage);

  const { attachmentsExpense, closeAttachmentsModal, getExpenseAttachments, openAttachmentsModal, saveExpenseAttachments } =
    useExpenseAttachments();
  const { columns, handleDragEnd, handleDragOver, handleDragStart, hideOptionalColumns, showAllColumns, updateColumnVisibility } =
    useExpenseColumns();
  const translatedColumns = useMemo(() => (
    columns.map(column => ({
      ...column,
      label: t.expenses.columns[column.key]?.label ?? column.label,
    }))
  ), [columns, t.expenses.columns]);

  const unitOptions = useMemo<FinanceReferenceOption[]>(() => (
    referenceUnitOptions.length > 0
      ? referenceUnitOptions
      : toFallbackOptions(expenses.map(expense => expense.businessUnit))
  ), [expenses, referenceUnitOptions]);
  const businessOptions = useMemo<FinanceReferenceOption[]>(() => (
    referenceBusinessOptions.length > 0
      ? referenceBusinessOptions
      : toFallbackOptions(expenses.map(expense => expense.business))
  ), [expenses, referenceBusinessOptions]);
  const businessUnitFilterOptions = useMemo<FinanceReferenceOption[]>(() => [{ value: 'all', label: t.common.all }, ...unitOptions], [t.common.all, unitOptions]);
  const businessFilterOptions = useMemo<FinanceReferenceOption[]>(() => {
    const scopedBusinesses = filters.businessUnitFilter === 'all'
      ? businessOptions
      : businessOptions.filter(option => !option.unitId || option.unitId === filters.businessUnitFilter);
    return [{ value: 'all', label: t.common.all }, ...scopedBusinesses];
  }, [businessOptions, filters.businessUnitFilter, t.common.all]);
  const providers = useMemo<Provider[]>(() => (
    providerRecords?.length ? providerRecordsToExpenseProviders(providerRecords) : mockProviders
  ), [providerRecords]);
  const providerOptions = useMemo(() => [{ id: 'all', name: t.common.all }, ...providers], [providers, t.common.all]);
  const createExpenseDisabled = isLoadingReferenceData;
  const createExpenseDisabledReason = t.expenses.createDisabledReason;
  const filteredExpenses = useMemo(() => filterExpenses(expenses, filters), [expenses, filters]);
  const totals = useMemo(() => calculateExpenseTotals(filteredExpenses), [filteredExpenses]);

  useEffect(() => () => {
    Object.values(saveTimeoutsRef.current).forEach(timeoutId => window.clearTimeout(timeoutId));
  }, []);

  useEffect(() => {
    if (storedPreferredCurrency !== preferredCurrency) {
      setStoredPreferredCurrency(preferredCurrency);
    }
  }, [preferredCurrency, setStoredPreferredCurrency, storedPreferredCurrency]);

  useEffect(() => {
    let isMounted = true;

    accountingAccountsService.getAccountingAccounts()
      .then(accounts => {
        if (!isMounted) return;
        setAccountingAccountOptions(accounts
          .filter(account => account.isActive)
          .sort((first, second) => first.code.localeCompare(second.code))
          .map(account => {
            const label = `${account.code} - ${account.name}`;
            return { value: account.id, label };
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

  useEffect(() => {
    if (filters.businessFilter === 'all') return;
    if (businessFilterOptions.some(option => option.value === filters.businessFilter)) return;
    setFilters(currentFilters => ({ ...currentFilters, businessFilter: 'all' }));
  }, [businessFilterOptions, filters.businessFilter]);

  const openCreateExpenseModal = () => {
    if (createExpenseDisabled) {
      setFailureToastMessage(createExpenseDisabledReason);
      return;
    }
    setEditingExpense(null);
    setIsAddExpenseModalOpen(true);
  };

  const handlePreferredCurrencyChange = (currency: string) => {
    setStoredPreferredCurrency(isFinanceCurrencyOption(currency) ? currency : DEFAULT_FINANCE_CURRENCY);
  };

  const openQuickExpenseModal = () => {
    if (createExpenseDisabled) {
      setFailureToastMessage(createExpenseDisabledReason);
      return;
    }
    setEditingExpense(null);
    setIsQuickExpenseModalOpen(true);
  };

  const handleQuickExpenseSubmit = async ({ amount, concept }: QuickExpenseValues) => {
    setIsQuickExpenseSubmitting(true);
    try {
      await handleExpenseSubmit({
        accountingAccount: '',
        amount,
        attachments: [],
        business: '',
        businessUnit: '',
        concept,
        currency: preferredCurrency,
        description: '',
        dueDate: '',
        paymentDate: '',
        paymentMethod: 'transfer',
        providerId: '',
        status: 'pending',
        taxes: 0,
        taxIncluded: false,
        taxMode: 'none',
        total: amount,
      });
      setIsQuickExpenseModalOpen(false);
    } finally {
      setIsQuickExpenseSubmitting(false);
    }
  };

  const closeExpenseModal = () => {
    setIsAddExpenseModalOpen(false);
    setEditingExpense(null);
  };

  const persistExpenseUpdate = useCallback((expense: Expense) => {
    if (!isBackendId(expense.id) || expense.type === 'budget') return;
    window.clearTimeout(saveTimeoutsRef.current[expense.id]);
    saveTimeoutsRef.current[expense.id] = window.setTimeout(() => {
      expensesService.updateExpense(expense, providers)
        .then(savedExpense => {
          setExpenses(currentExpenses => currentExpenses.map(item => (
            item.id === expense.id ? savedExpense : item
          )));
        })
        .catch(error => {
          setFailureToastMessage(toFinanceApiErrorMessage(error, t.expenses.messages.saveFailed));
        });
    }, 700);
  }, [providers, setExpenses, t.expenses.messages.saveFailed]);

  const handleExpenseSubmit = async (values: ExpenseFormValues) => {
    const provider = providers.find(item => item.id === values.providerId);
    const now = new Date();
    const inputPaymentDate = values.paymentDate ? new Date(`${values.paymentDate}T00:00:00`) : undefined;
    const inputDueDate = values.dueDate ? new Date(`${values.dueDate}T00:00:00`) : undefined;
    const paymentDate = inputPaymentDate ?? editingExpense?.paymentDate;
    const recordDate = editingExpense?.date ?? inputPaymentDate ?? now;
    const dueDate = inputDueDate ?? editingExpense?.dueDate ?? now;
    const amountPaid = values.status === 'paid' || values.status === 'audited'
      ? values.total
      : values.status === 'partial'
        ? Math.min(editingExpense?.amountPaid ?? 0, values.total)
        : 0;
    const draftExpense: Expense = {
      ...(editingExpense ?? {}),
      id: editingExpense?.id ?? `expense-${Date.now()}`,
      folio: editingExpense?.folio ?? createExpenseFolio(expenses),
      businessUnit: values.businessUnit,
      business: values.business,
      concept: values.concept,
      description: values.description,
      category: editingExpense?.category ?? mockExpenses[0].category,
      providerId: values.providerId,
      providerName: provider?.name,
      requestedByUserId: editingExpense?.requestedByUserId ?? currentUser?.id,
      approvedByUserId: editingExpense?.approvedByUserId,
      performedByUserId: editingExpense?.performedByUserId,
      total: values.total,
      taxes: values.taxes,
      taxCountry: values.taxCountry,
      taxIncluded: values.taxIncluded,
      taxMode: values.taxMode,
      taxName: values.taxName,
      taxProfileId: values.taxProfileId,
      taxRate: values.taxRate,
      taxRegion: values.taxRegion,
      taxSpecialAmount: values.taxSpecialAmount,
      amount: values.amount,
      amountPaid,
      currency: values.currency,
      dueDate,
      paymentDate,
      date: recordDate,
      paymentMethod: values.paymentMethod,
      accountingAccount: values.accountingAccount,
      status: values.status,
      attachments: values.attachments ?? editingExpense?.attachments ?? [],
      type: editingExpense?.type ?? 'real',
      createdAt: editingExpense?.createdAt ?? now,
      updatedAt: now,
    };

    try {
      const savedExpense = editingExpense && isBackendId(editingExpense.id) && editingExpense.type !== 'budget'
        ? await expensesService.updateExpense(draftExpense, providers)
        : await expensesService.createExpense(draftExpense, providers);

      setExpenses(currentExpenses => (
        editingExpense
          ? currentExpenses.map(item => (item.id === editingExpense.id ? savedExpense : item))
          : [savedExpense, ...currentExpenses]
      ));
      setSuccessToastMessage(editingExpense ? t.expenses.messages.saved : t.expenses.messages.created);
    } catch (error) {
      setExpenses(currentExpenses => (
        editingExpense
          ? currentExpenses.map(item => (item.id === editingExpense.id ? draftExpense : item))
          : [draftExpense, ...currentExpenses]
      ));
      setFailureToastMessage(toFinanceApiErrorMessage(error, editingExpense ? t.expenses.messages.updateFailed : t.expenses.messages.createFailed));
    } finally {
      closeExpenseModal();
    }
  };

  const handleDelete = (id: string) => {
    const expense = expenses.find(item => item.id === id);
    setExpenses(currentExpenses => currentExpenses.filter(item => item.id !== id));
    if (!expense || !isBackendId(id) || expense.type === 'budget') return;

    expensesService.deleteExpense(id)
      .then(() => setSuccessToastMessage(t.expenses.messages.deleted))
      .catch(error => {
        setExpenses(currentExpenses => [expense, ...currentExpenses]);
        setFailureToastMessage(toFinanceApiErrorMessage(error, t.expenses.messages.deleteFailed));
      });
  };

  const handleSaveAttachments = (attachments: string[]) => {
    if (!attachmentsExpense) return;
    saveExpenseAttachments(attachments);

    const updatedExpense = {
      ...attachmentsExpense,
      attachments,
      updatedAt: new Date(),
    };

    setExpenses(currentExpenses => currentExpenses.map(item => (
      item.id === attachmentsExpense.id ? updatedExpense : item
    )));
    persistExpenseUpdate(updatedExpense);
  };

  const ensureExpensePayable = async (expense: Expense) => {
    if (!isBackendId(expense.id) || expense.type === 'budget') {
      return expense;
    }

    let currentExpense = expense;
    if (currentExpense.backendStatus === 'DRAFT') {
      currentExpense = await expensesService.submitExpense(currentExpense.id, providers);
    }
    if (currentExpense.backendStatus === 'PENDING_APPROVAL') {
      currentExpense = await expensesService.approveExpense(currentExpense.id, providers);
    }
    return currentExpense;
  };

  const handleMarkExpensePaid = async (expense: Expense) => {
    try {
      const payableExpense = await ensureExpensePayable(expense);
      const remainingAmount = Math.max(payableExpense.total - (payableExpense.amountPaid ?? 0), 0);
      if (remainingAmount <= 0) return payableExpense;

      const savedExpense = isBackendId(payableExpense.id) && payableExpense.type !== 'budget'
        ? await expensesService.recordExpensePayment(payableExpense.id, remainingAmount, new Date(), providers)
        : { ...payableExpense, amountPaid: payableExpense.total, paymentDate: new Date(), status: 'paid' as const };

      setSuccessToastMessage(t.expenses.messages.saved);
      return savedExpense;
    } catch (error) {
      setFailureToastMessage(toFinanceApiErrorMessage(error, t.expenses.messages.saveFailed));
      return null;
    }
  };

  const handleRecordExpensePayment = async (expense: Expense, amount: number, paymentDate: Date) => {
    try {
      const payableExpense = await ensureExpensePayable(expense);
      const savedExpense = isBackendId(payableExpense.id) && payableExpense.type !== 'budget'
        ? await expensesService.recordExpensePayment(payableExpense.id, amount, paymentDate, providers)
        : {
          ...payableExpense,
          amountPaid: Math.min(payableExpense.total, (payableExpense.amountPaid ?? 0) + amount),
          paymentDate,
          status: (payableExpense.amountPaid ?? 0) + amount >= payableExpense.total ? 'paid' as const : 'partial' as const,
        };

      setSuccessToastMessage(t.expenses.messages.saved);
      return savedExpense;
    } catch (error) {
      setFailureToastMessage(toFinanceApiErrorMessage(error, t.expenses.messages.saveFailed));
      return null;
    }
  };

  const handleDuplicate = (id: string) => {
    const expense = expenses.find(item => item.id === id);
    if (!expense) return;
    const copy = {
      ...expense,
      id: `expense-${Date.now()}`,
      folio: `${expense.folio}-COPY`,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    expensesService.createExpense(copy, providers)
      .then(savedExpense => {
        setExpenses(currentExpenses => [savedExpense, ...currentExpenses]);
        setSuccessToastMessage(t.expenses.messages.duplicated);
      })
      .catch(error => {
        setExpenses(currentExpenses => [copy, ...currentExpenses]);
        setFailureToastMessage(toFinanceApiErrorMessage(error, t.expenses.messages.duplicateFailed));
      });
  };

  return (
    <div className="space-y-6">
      <ExpensesHeader
        createExpenseDisabled={createExpenseDisabled}
        createExpenseDisabledReason={createExpenseDisabledReason}
        onConfigureColumns={() => setIsColumnModalOpen(true)}
        onCreateExpense={openCreateExpenseModal}
        onPreferredCurrencyChange={handlePreferredCurrencyChange}
        preferredCurrency={preferredCurrency}
      />

      <ExpensesFilters
        businessOptions={businessFilterOptions}
        businessUnitOptions={businessUnitFilterOptions}
        filteredCount={filteredExpenses.length}
        filters={filters}
        providers={providerOptions}
        onFiltersChange={setFilters}
      />

      <ExpensesSummary expenses={filteredExpenses} totals={totals} />

      <ExpenseTable
        actionVisibility={{ showAudit: false }}
        accountingAccountOptions={accountingAccountOptions}
        columns={translatedColumns}
        expenses={filteredExpenses}
        getAttachments={getExpenseAttachments}
        onDeleteExpense={handleDelete}
        onDuplicateExpense={handleDuplicate}
        onEditExpense={(expense) => {
          if (expense.type === 'budget') return;
          setEditingExpense(expense);
          setIsAddExpenseModalOpen(true);
        }}
        onExpensesChange={setExpenses}
        onMarkExpensePaid={handleMarkExpensePaid}
        onOpenAttachments={openAttachmentsModal}
        onPersistExpenseUpdate={persistExpenseUpdate}
        onRecordExpensePayment={handleRecordExpensePayment}
        businessOptions={businessOptions}
        providers={providers}
        unitOptions={unitOptions}
        userOptions={userOptions}
      />

      {isColumnModalOpen && (
        <ColumnConfigurationModal
          columns={translatedColumns}
          description={t.expenses.columnModalDescription}
          onApply={() => setIsColumnModalOpen(false)}
          onClose={() => setIsColumnModalOpen(false)}
          onDragEnd={handleDragEnd}
          onDragOver={handleDragOver}
          onDragStart={handleDragStart}
          onHideOptionalColumns={hideOptionalColumns}
          onShowAllColumns={showAllColumns}
          onUpdateVisibility={updateColumnVisibility}
        />
      )}

      {attachmentsExpense && (
        <AttachmentsModal
          isOpen
          onClose={closeAttachmentsModal}
          expenseFolio={attachmentsExpense.folio}
          expenseConcept={attachmentsExpense.concept}
          attachments={getExpenseAttachments(attachmentsExpense)}
          onSave={handleSaveAttachments}
        />
      )}

      {isAddExpenseModalOpen && (
        <ExpenseFormModal
          accountingAccountOptions={accountingAccountOptions}
          businessOptions={businessOptions}
          editingExpense={editingExpense}
          onClose={closeExpenseModal}
          preferredCurrency={preferredCurrency}
          providers={providers}
          unitOptions={unitOptions}
          onSubmitExpense={handleExpenseSubmit}
        />
      )}

      <Button
        type="button"
        title={t.expenses.quick.title}
        aria-label={t.expenses.quick.title}
        className="fixed bottom-[calc(1rem+env(safe-area-inset-bottom))] right-4 z-40 h-12 w-12 rounded-full border border-[#147514]/50 bg-[#147514] p-0 text-white shadow-lg shadow-[#147514]/25 hover:bg-[#105010] sm:bottom-6 sm:right-6"
        onClick={openQuickExpenseModal}
      >
        <Plus className="h-5 w-5" />
      </Button>

      <QuickExpenseDialog
        currency={preferredCurrency}
        isSubmitting={isQuickExpenseSubmitting}
        onOpenChange={setIsQuickExpenseModalOpen}
        onSubmit={handleQuickExpenseSubmit}
        open={isQuickExpenseModalOpen}
      />

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
