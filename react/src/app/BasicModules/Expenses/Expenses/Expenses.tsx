import { useCallback, useEffect, useMemo, useRef, useState, type Dispatch, type SetStateAction } from 'react';
import { Plus } from 'lucide-react';
import { FailureToast } from '../../../components/FailureToast';
import { SuccessToast } from '../../../components/SuccessToast';
import { ConfirmDeleteDialog } from '../../../components/ConfirmDeleteDialog';
import { Button } from '../../../components/ui/button';
import { usePreferredBusinessCurrency } from '../../shared/BusinessCurrencyContext';
import { isBackendId } from '../adapters/adapter.utils';
import { providerRecordsToExpenseProviders, toExpenseProvider } from '../adapters/provider.adapter';
import { mockExpenses, mockProviders } from '../data/expenses.mock';
import { accountingAccountsService, expenseAttachmentsService, expensesService, paymentAccountsService, providersService, toFinanceApiErrorMessage } from '../services';
import { budgetLinesService } from '../services/budget-lines.service';
import type { Expense, ExpenseStatus, Provider } from '../types/expenses.types';
import type { ExpenseListFilters } from '../types/expenseView.types';
import type { PaymentAccount } from '../PaymentAccounts/types';
import type { ProviderRecord } from '../Providers/useProveedoresLogic';
import { createQuickProviderRecord } from '../Providers/providerRecordFactory';
import { calculateExpenseTotals, filterExpenses } from '../utils/expenseFilters';
import { useExpenseAttachments } from '../hooks/useExpenseAttachments';
import { useExpenseColumns } from '../hooks/useExpenseColumns';
import { useFinanceReferenceData } from '../hooks/useFinanceReferenceData';
import { useExpensesTranslations } from './hooks/useExpensesTranslations';
import { ExpensesHeader } from '../components/header/ExpensesHeader';
import { ExpensesFilters } from '../components/filters/ExpensesFilters';
import { ExpensesSummary } from '../components/kpis/ExpensesSummary';
import { ColumnConfigurationModal } from '../components/table/ColumnConfigurationModal';
import { ExpenseFormModal } from '../components/modals/ExpenseFormModal';
import type { ExpenseFormValues } from '../components/modals/ExpenseFormModal';
import { PayableAccountDialog, type PayableAccountValues } from '../components/modals/PayableAccountDialog';
import { PayablesKioskManagementModal } from '../components/modals/PayablesKioskManagementModal';
import { QuickExpenseDialog, type QuickExpenseValues } from '../components/modals/QuickExpenseDialog';
import type { FinanceReferenceOption } from '../types/finance-reference.types';
import { AttachmentsModal } from './components/AttachmentsModal';
import { ExpenseTable } from './components/ExpenseTable';

interface ExpensesProps {
  expenses?: Expense[];
  onFinanceDataChanged?: () => void;
  onExpensesChange?: Dispatch<SetStateAction<Expense[]>>;
  onProvidersChange?: Dispatch<SetStateAction<ProviderRecord[]>>;
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

const AUTO_EXPENSE_FOLIO = 'AUTO-EXP';
const AUTO_PAYABLE_FOLIO = 'AUTO-CXP';

export default function Expenses({ expenses: controlledExpenses, onFinanceDataChanged, onExpensesChange, onProvidersChange, providers: providerRecords }: ExpensesProps = {}) {
  const t = useExpensesTranslations();
  const [localExpenses, setLocalExpenses] = useState<Expense[]>(mockExpenses);
  const [filters, setFilters] = useState<ExpenseListFilters>(defaultFilters);
  const [failureToastMessage, setFailureToastMessage] = useState('');
  const [accountingAccountOptions, setAccountingAccountOptions] = useState<FinanceReferenceOption[]>([]);
  const [paymentAccounts, setPaymentAccounts] = useState<PaymentAccount[]>([]);
  const [isColumnModalOpen, setIsColumnModalOpen] = useState(false);
  const [isAddExpenseModalOpen, setIsAddExpenseModalOpen] = useState(false);
  const [isPayableAccountModalOpen, setIsPayableAccountModalOpen] = useState(false);
  const [isPayablesKioskModalOpen, setIsPayablesKioskModalOpen] = useState(false);
  const [isPayableAccountSubmitting, setIsPayableAccountSubmitting] = useState(false);
  const [isQuickExpenseModalOpen, setIsQuickExpenseModalOpen] = useState(false);
  const [isQuickExpenseSubmitting, setIsQuickExpenseSubmitting] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [initialExpense, setInitialExpense] = useState<Expense | null>(null);
  const [pendingDeleteExpenseIds, setPendingDeleteExpenseIds] = useState<string[]>([]);
  const [deletingExpenseIds, setDeletingExpenseIds] = useState<Set<string>>(() => new Set());
  const [successToastMessage, setSuccessToastMessage] = useState('');
  const deletingExpenseIdsRef = useRef<Set<string>>(new Set());
  const saveTimeoutsRef = useRef<Record<string, number>>({});
  const expenses = controlledExpenses ?? localExpenses;
  const setExpenses = onExpensesChange ?? setLocalExpenses;
  const { exchangeRatesPerUsd, preferredCurrency } = usePreferredBusinessCurrency();
  const { businessOptions: referenceBusinessOptions, currentUser, isLoadingReferenceData, unitOptions: referenceUnitOptions, userOptions } =
    useFinanceReferenceData(setFailureToastMessage);

  const { attachmentsExpense, closeAttachmentsModal, getExpenseAttachments, openAttachmentsModal } =
    useExpenseAttachments();
  const { applyColumns, columns } = useExpenseColumns();
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
  const totals = useMemo(
    () => calculateExpenseTotals(filteredExpenses, preferredCurrency, exchangeRatesPerUsd),
    [exchangeRatesPerUsd, filteredExpenses, preferredCurrency],
  );

  useEffect(() => () => {
    Object.values(saveTimeoutsRef.current).forEach(timeoutId => window.clearTimeout(timeoutId));
  }, []);

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
    let isMounted = true;

    paymentAccountsService.getPaymentAccounts()
      .then(accounts => {
        if (!isMounted) return;
        setPaymentAccounts(accounts.filter(account => account.isActive));
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
    setInitialExpense(null);
    setIsAddExpenseModalOpen(true);
  };

  const openQuickExpenseModal = () => {
    if (createExpenseDisabled) {
      setFailureToastMessage(createExpenseDisabledReason);
      return;
    }
    setEditingExpense(null);
    setInitialExpense(null);
    setIsQuickExpenseModalOpen(true);
  };

  const openPayableAccountModal = () => {
    if (createExpenseDisabled) {
      setFailureToastMessage(createExpenseDisabledReason);
      return;
    }
    setEditingExpense(null);
    setInitialExpense(null);
    setIsPayableAccountModalOpen(true);
  };

  const openPayablesKiosk = () => {
    setIsPayablesKioskModalOpen(true);
  };

  const handleQuickExpenseSubmit = async ({ amount, attachmentFiles, business, businessUnit, concept, currency, description, taxes, taxCountry, taxIncluded, taxMode, taxName, taxProfileId, taxRate, taxRegion, total }: QuickExpenseValues) => {
    setIsQuickExpenseSubmitting(true);
    try {
      const now = new Date();
      const draftExpense: Expense = {
        id: `expense-${Date.now()}`,
        folio: AUTO_EXPENSE_FOLIO,
        businessUnit,
        business,
        concept,
        description,
        category: mockExpenses[0].category,
        total,
        taxes,
        amount,
        amountPaid: total,
        currency,
        dueDate: now,
        paymentDate: now,
        date: now,
        paymentMethod: 'transfer',
        status: 'pending',
        requestedByUserId: currentUser?.id,
        attachments: [],
        taxCountry,
        taxIncluded,
        taxMode,
        taxName,
        taxProfileId,
        taxRate,
        taxRegion,
        type: 'real',
        createdAt: now,
        updatedAt: now,
      };
      const createdExpense = await expensesService.createExpense(draftExpense, providers);
      const paidExpense = await expensesService.updateExpenseStatus(createdExpense.id, 'paid', providers, total, now);
      const uploadedAttachments = [];
      for (const file of attachmentFiles) {
        uploadedAttachments.push(await expenseAttachmentsService.upload(paidExpense.id, file));
      }
      const refreshedExpense = isBackendId(paidExpense.id)
        ? await expensesService.getExpenseById(paidExpense.id, providers)
        : null;
      const savedExpense = refreshedExpense ?? {
        ...paidExpense,
        attachments: uploadedAttachments.map(file => file.originalFilename),
        attachmentCount: uploadedAttachments.length,
      };
      setExpenses(currentExpenses => [savedExpense, ...currentExpenses]);
      setSuccessToastMessage(t.expenses.messages.created);
      setIsQuickExpenseModalOpen(false);
    } catch (error) {
      setFailureToastMessage(toFinanceApiErrorMessage(error, t.expenses.messages.createFailed));
    } finally {
      setIsQuickExpenseSubmitting(false);
    }
  };

  const closeExpenseModal = () => {
    setIsAddExpenseModalOpen(false);
    setEditingExpense(null);
    setInitialExpense(null);
  };

  const persistExpenseUpdate = useCallback((expense: Expense) => {
    window.clearTimeout(saveTimeoutsRef.current[expense.id]);
    saveTimeoutsRef.current[expense.id] = window.setTimeout(() => {
      const saveOperation = expense.type === 'budget'
        ? budgetLinesService.updateBudgetLineFromExpense(expense)
        : isBackendId(expense.id)
          ? expensesService.updateExpense(expense, providers)
          : Promise.resolve(expense);

      saveOperation
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

  const createPayableExpense = async (payableExpense: Expense) => {
    const createdExpense = await expensesService.createPayableAccount(payableExpense, providers);
    if (!payableExpense.budgetLineId || !isBackendId(createdExpense.id)) {
      return createdExpense;
    }

    const submittedExpense = await expensesService.submitExpense(createdExpense.id, providers);
    return expensesService.approveExpense(submittedExpense.id, providers);
  };

  const getUpdatedBudgetExpense = async (budgetLineId?: string) => {
    if (!budgetLineId) return null;
    try {
      return await budgetLinesService.getBudgetExpense(budgetLineId);
    } catch {
      return null;
    }
  };

  const replaceBudgetExpense = (currentExpenses: Expense[], budgetExpense: Expense | null) => (
    budgetExpense
      ? currentExpenses.map(item => (item.id === budgetExpense.id ? budgetExpense : item))
      : currentExpenses
  );

  const handleExpenseSubmit = async (values: ExpenseFormValues) => {
    const provider = providers.find(item => item.id === values.providerId);
    const now = new Date();
    const inputPaymentDate = values.paymentDate ? new Date(`${values.paymentDate}T00:00:00`) : undefined;
    const inputDueDate = values.dueDate ? new Date(`${values.dueDate}T00:00:00`) : undefined;
    const sourceExpense = editingExpense ?? initialExpense;
    const paymentDate = inputPaymentDate ?? sourceExpense?.paymentDate;
    const recordDate = sourceExpense?.date ?? inputPaymentDate ?? now;
    const dueDate = inputDueDate ?? sourceExpense?.dueDate ?? now;
    const previousAmountPaid = sourceExpense?.amountPaid ?? 0;
    const amountPaid = values.status === 'paid' || values.status === 'audited'
      ? values.total
      : values.status === 'partial' || values.status === 'overdue'
        ? Math.min(previousAmountPaid, values.total)
        : 0;
    const draftExpense: Expense = {
      ...(sourceExpense ?? {}),
      id: editingExpense?.id ?? `expense-${Date.now()}`,
      folio: sourceExpense?.folio ?? AUTO_EXPENSE_FOLIO,
      businessUnit: values.businessUnit,
      business: values.business,
      concept: values.concept,
      description: values.description,
      category: sourceExpense?.category ?? mockExpenses[0].category,
      providerId: values.providerId,
      providerName: provider?.name,
      budgetLineId: sourceExpense?.budgetLineId,
      requestedByUserId: sourceExpense?.requestedByUserId ?? currentUser?.id,
      approvedByUserId: sourceExpense?.approvedByUserId,
      performedByUserId: sourceExpense?.performedByUserId,
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
      attachments: values.attachments ?? sourceExpense?.attachments ?? [],
      type: sourceExpense?.type ?? 'real',
      createdAt: sourceExpense?.createdAt ?? now,
      updatedAt: now,
    };

    try {
      const savedExpense = editingExpense?.type === 'budget'
        ? await budgetLinesService.updateBudgetLineFromExpense(draftExpense)
        : editingExpense && isBackendId(editingExpense.id)
          ? await expensesService.updateExpense(draftExpense, providers)
          : draftExpense.type === 'payable'
            ? await createPayableExpense(draftExpense)
            : await expensesService.createExpense(draftExpense, providers);
      const updatedBudgetExpense = await getUpdatedBudgetExpense(savedExpense.budgetLineId);

      setExpenses(currentExpenses => (
        editingExpense
          ? replaceBudgetExpense(currentExpenses.map(item => (item.id === editingExpense.id ? savedExpense : item)), updatedBudgetExpense)
          : [savedExpense, ...replaceBudgetExpense(currentExpenses, updatedBudgetExpense)]
      ));
      setSuccessToastMessage(editingExpense ? t.expenses.messages.saved : t.expenses.messages.created);
      closeExpenseModal();
    } catch (error) {
      setFailureToastMessage(toFinanceApiErrorMessage(error, editingExpense ? t.expenses.messages.updateFailed : t.expenses.messages.createFailed));
      throw error;
    }
  };

  const handlePayableAccountSubmit = async (values: PayableAccountValues) => {
    const provider = providers.find(item => item.id === values.providerId);
    const now = new Date();
    const dueDate = values.dueDate ? new Date(`${values.dueDate}T00:00:00`) : now;
    const payableExpense: Expense = {
      id: `payable-${Date.now()}`,
      folio: AUTO_PAYABLE_FOLIO,
      businessUnit: '',
      business: '',
      concept: values.concept,
      description: values.notes,
      category: mockExpenses[0].category,
      providerId: values.providerId,
      providerName: provider?.name,
      requestedByUserId: currentUser?.id,
      total: values.total,
      taxes: values.taxes,
      taxIncluded: values.taxIncluded,
      taxMode: values.taxMode,
      taxRate: values.taxRate,
      amount: values.amount,
      amountPaid: 0,
      currency: values.currency,
      dueDate,
      date: now,
      paymentMethod: 'transfer',
      accountingAccount: '',
      status: 'pending',
      attachments: [],
      notes: values.notes,
      type: 'payable',
      createdAt: now,
      updatedAt: now,
    };

    setIsPayableAccountSubmitting(true);
    try {
      const savedExpense = await expensesService.createPayableAccount(payableExpense, providers);
      const attachmentResults = await Promise.allSettled(
        values.attachmentFiles.map(file => expenseAttachmentsService.upload(savedExpense.id, file)),
      );
      const uploadedAttachments = attachmentResults.flatMap(result => (
        result.status === 'fulfilled' ? [result.value] : []
      ));
      const attachmentUploadFailed = attachmentResults.some(result => result.status === 'rejected');
      let refreshedExpense: Expense | null = null;
      let refreshFailed = false;
      if (isBackendId(savedExpense.id)) {
        try {
          refreshedExpense = await expensesService.getExpenseById(savedExpense.id, providers);
        } catch {
          refreshFailed = true;
        }
      }
      const savedExpenseWithAttachments = refreshedExpense ?? {
        ...savedExpense,
        attachments: uploadedAttachments.map(file => file.originalFilename),
        attachmentCount: uploadedAttachments.length,
      };
      setExpenses(currentExpenses => [
        savedExpenseWithAttachments,
        ...currentExpenses.filter(expense => expense.id !== savedExpenseWithAttachments.id),
      ]);
      setIsPayableAccountModalOpen(false);
      if (attachmentUploadFailed || refreshFailed) {
        setFailureToastMessage(
          `${t.expenses.messages.payableCreated} ${t.expenses.attachments.operationFailed}`,
        );
      } else {
        setSuccessToastMessage(t.expenses.messages.payableCreated);
      }
    } catch (error) {
      setFailureToastMessage(toFinanceApiErrorMessage(error, t.expenses.messages.createFailed));
    } finally {
      setIsPayableAccountSubmitting(false);
    }
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
      onProvidersChange?.(currentProviders => [providerRecord, ...currentProviders]);
      setFailureToastMessage(toFinanceApiErrorMessage(error, t.expenses.payableAccount.quickProviderSaveFailed));
      return toExpenseProvider(providerRecord);
    }
  };

  const setExpenseDeleting = (id: string, isDeleting: boolean) => {
    const nextIds = new Set(deletingExpenseIdsRef.current);
    if (isDeleting) {
      nextIds.add(id);
    } else {
      nextIds.delete(id);
    }
    deletingExpenseIdsRef.current = nextIds;
    setDeletingExpenseIds(nextIds);
  };

  const executeDelete = async (id: string) => {
    if (deletingExpenseIdsRef.current.has(id)) return;
    const expense = expenses.find(item => item.id === id);
    if (!expense) return;

    if (expense.type === 'budget') {
      setExpenseDeleting(id, true);
      try {
        await budgetLinesService.deleteBudgetLine(id);
        setExpenses(currentExpenses => currentExpenses.filter(item => item.id !== id));
        setSuccessToastMessage(t.expenses.messages.deleted);
      } catch (error) {
        setFailureToastMessage(toFinanceApiErrorMessage(error, t.expenses.messages.deleteFailed));
      } finally {
        setExpenseDeleting(id, false);
      }
      return;
    }

    if (!isBackendId(id)) {
      setExpenses(currentExpenses => currentExpenses.filter(item => item.id !== id));
      setSuccessToastMessage(t.expenses.messages.deleted);
      return;
    }

    setExpenseDeleting(id, true);
    try {
      await expensesService.deleteExpense(id);
      setExpenses(currentExpenses => currentExpenses.filter(item => item.id !== id));
      setSuccessToastMessage(t.expenses.messages.deleted);
    } catch (error) {
      setFailureToastMessage(toFinanceApiErrorMessage(error, t.expenses.messages.deleteFailed));
    } finally {
      setExpenseDeleting(id, false);
    }
  };

  const requestDeleteExpense = (id: string) => {
    setPendingDeleteExpenseIds([id]);
  };

  const requestDeleteExpenses = (ids: string[]) => {
    setPendingDeleteExpenseIds(ids);
  };

  const confirmPendingDelete = () => {
    const ids = pendingDeleteExpenseIds;
    setPendingDeleteExpenseIds([]);
    ids.forEach(id => {
      void executeDelete(id);
    });
  };

  const pendingDeleteExpenses = pendingDeleteExpenseIds
    .map(id => expenses.find(expense => expense.id === id))
    .filter((expense): expense is Expense => Boolean(expense));

  const handleAttachmentsChanged = (attachments: string[]) => {
    if (!attachmentsExpense) return;

    const updatedExpense = {
      ...attachmentsExpense,
      attachments,
      attachmentCount: attachments.length,
      updatedAt: new Date(),
    };

    setExpenses(currentExpenses => currentExpenses.map(item => (
      item.id === attachmentsExpense.id ? updatedExpense : item
    )));
  };

  const handleExpenseStatusChange = async (expense: Expense, status: ExpenseStatus) => {
    try {
      if (expense.type === 'budget') {
        const updatedExpense = applyExpenseStatus(expense, status);
        const savedExpense = await budgetLinesService.updateBudgetLineFromExpense(updatedExpense);
        setSuccessToastMessage(t.expenses.messages.saved);
        return savedExpense;
      }

      if (isBackendId(expense.id)) {
        const paidAmount = status === 'partial'
          ? Math.max(0.01, Math.min(expense.amountPaid && expense.amountPaid < expense.total ? expense.amountPaid : expense.total / 2, expense.total - 0.01))
          : undefined;
        const savedExpense = await expensesService.updateExpenseStatus(expense.id, status, providers, paidAmount, new Date());
        setSuccessToastMessage(t.expenses.messages.saved);
        return savedExpense;
      }

      const updatedExpense = applyExpenseStatus(expense, status);
      setSuccessToastMessage(t.expenses.messages.saved);
      return updatedExpense;
    } catch (error) {
      setFailureToastMessage(toFinanceApiErrorMessage(error, t.expenses.messages.saveFailed));
      return null;
    }
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
    return handleExpenseStatusChange(expense, 'paid');
  };

  const handleRecordExpensePayment = async (expense: Expense, amount: number, paymentAccountId: string, paymentDate: Date) => {
    try {
      const payableExpense = await ensureExpensePayable(expense);
      const savedExpense = payableExpense.type === 'budget'
        ? await budgetLinesService.updateBudgetLineFromExpense(applyExpensePayment(payableExpense, amount, paymentDate))
        : isBackendId(payableExpense.id)
          ? await expensesService.recordExpensePayment(payableExpense.id, amount, paymentAccountId, paymentDate, providers)
          : { ...applyExpensePayment(payableExpense, amount, paymentDate), paymentAccountId };
      const updatedBudgetExpense = await getUpdatedBudgetExpense(savedExpense.budgetLineId);

      setPaymentAccounts(currentAccounts => currentAccounts.map(account => (
        account.id === paymentAccountId ? { ...account, balance: account.balance - amount } : account
      )));
      if (updatedBudgetExpense) {
        setExpenses(currentExpenses => replaceBudgetExpense(currentExpenses, updatedBudgetExpense));
      }
      onFinanceDataChanged?.();
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
        onCreatePayableAccount={openPayableAccountModal}
        onCreateExpense={openCreateExpenseModal}
        onOpenPayablesKiosk={openPayablesKiosk}
      />

      <ExpensesFilters
        businessOptions={businessFilterOptions}
        businessUnitOptions={businessUnitFilterOptions}
        filteredCount={filteredExpenses.length}
        filters={filters}
        providers={providerOptions}
        onFiltersChange={setFilters}
      />

      <ExpensesSummary
        exchangeRatesPerUsd={exchangeRatesPerUsd}
        expenses={filteredExpenses}
        preferredCurrency={preferredCurrency}
        totals={totals}
      />

      <ExpenseTable
        actionVisibility={{ showAudit: false }}
        accountingAccountOptions={accountingAccountOptions}
        columns={translatedColumns}
        deletingExpenseIds={deletingExpenseIds}
        expenses={filteredExpenses}
        getAttachments={getExpenseAttachments}
        onDeleteExpense={requestDeleteExpense}
        onDeleteExpenses={requestDeleteExpenses}
        onDuplicateExpense={handleDuplicate}
        onEditExpense={(expense) => {
          setEditingExpense(expense);
          setInitialExpense(null);
          setIsAddExpenseModalOpen(true);
        }}
        onExpensesChange={setExpenses}
        onMarkExpensePaid={handleMarkExpensePaid}
        onOpenAttachments={openAttachmentsModal}
        onPersistExpenseUpdate={persistExpenseUpdate}
        paymentAccounts={paymentAccounts}
        onRecordExpensePayment={handleRecordExpensePayment}
        onStatusChange={handleExpenseStatusChange}
        businessOptions={businessOptions}
        providers={providers}
        unitOptions={unitOptions}
        userOptions={userOptions}
      />

      {isColumnModalOpen && (
        <ColumnConfigurationModal
          columns={translatedColumns}
          onClose={() => setIsColumnModalOpen(false)}
          onSaveColumns={(nextColumns) => {
            applyColumns(nextColumns);
            setIsColumnModalOpen(false);
          }}
        />
      )}

      {attachmentsExpense && (
        <AttachmentsModal
          isOpen
          onClose={closeAttachmentsModal}
          expenseId={attachmentsExpense.id}
          expenseFolio={attachmentsExpense.folio}
          expenseConcept={attachmentsExpense.concept}
          attachments={getExpenseAttachments(attachmentsExpense)}
          onChanged={handleAttachmentsChanged}
        />
      )}

      {isAddExpenseModalOpen && (
        <ExpenseFormModal
          accountingAccountOptions={accountingAccountOptions}
          businessOptions={businessOptions}
          editingExpense={editingExpense}
          initialExpense={initialExpense}
          onClose={closeExpenseModal}
          preferredCurrency={preferredCurrency}
          providers={providers}
          unitOptions={unitOptions}
          onSubmitExpense={handleExpenseSubmit}
        />
      )}

      <PayableAccountDialog
        currency={preferredCurrency}
        isSubmitting={isPayableAccountSubmitting}
        onOpenChange={setIsPayableAccountModalOpen}
        onCreateProvider={onProvidersChange ? handleQuickProviderCreate : undefined}
        onSubmit={handlePayableAccountSubmit}
        open={isPayableAccountModalOpen}
        providers={providers}
      />

      <PayablesKioskManagementModal
        businessOptions={businessOptions}
        isOpen={isPayablesKioskModalOpen}
        onClose={() => setIsPayablesKioskModalOpen(false)}
        onError={setFailureToastMessage}
        onSuccess={setSuccessToastMessage}
        providers={providers}
        unitOptions={unitOptions}
      />

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

      <ConfirmDeleteDialog
        isVisible={pendingDeleteExpenseIds.length > 0}
        title={pendingDeleteExpenseIds.length > 1 ? t.expenses.confirmDelete.bulkTitle : t.expenses.confirmDelete.title}
        description={pendingDeleteExpenseIds.length > 1 ? t.expenses.confirmDelete.bulkDescription(pendingDeleteExpenseIds.length) : t.expenses.confirmDelete.description}
        itemName={pendingDeleteExpenseIds.length > 1 ? t.expenses.confirmDelete.bulkItemName(pendingDeleteExpenseIds.length) : pendingDeleteExpenses[0]?.folio}
        confirmLabel={t.common.delete}
        cancelLabel={t.common.cancel}
        onConfirm={confirmPendingDelete}
        onCancel={() => setPendingDeleteExpenseIds([])}
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

function applyExpenseStatus(expense: Expense, status: ExpenseStatus): Expense {
  const paymentDate = new Date();
  if (status === 'paid' || status === 'audited') {
    return { ...expense, amountPaid: expense.total, paymentDate, status, updatedAt: paymentDate };
  }

  if (status === 'partial') {
    const fallbackPaidAmount = Math.max(0.01, Math.min(expense.total / 2, Math.max(expense.total - 0.01, 0)));
    const amountPaid = (expense.amountPaid ?? 0) > 0 && (expense.amountPaid ?? 0) < expense.total
      ? expense.amountPaid
      : fallbackPaidAmount;
    return { ...expense, amountPaid, paymentDate, status, updatedAt: paymentDate };
  }

  if (status === 'overdue') {
    return {
      ...expense,
      amountPaid: Math.min(expense.amountPaid ?? 0, expense.total),
      paymentDate: expense.paymentDate,
      status,
      updatedAt: new Date(),
    };
  }

  return { ...expense, amountPaid: 0, paymentDate: undefined, status, updatedAt: new Date() };
}

function applyExpensePayment(expense: Expense, amount: number, paymentDate: Date): Expense {
  const amountPaid = Math.min(expense.total, (expense.amountPaid ?? 0) + amount);
  return {
    ...expense,
    amountPaid,
    paymentDate,
    status: amountPaid >= expense.total ? 'paid' : 'partial',
    updatedAt: new Date(),
  };
}
