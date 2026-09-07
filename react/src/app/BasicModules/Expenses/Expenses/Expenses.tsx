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
import {
  accountingAccountsService,
  budgetLineAttachmentsService,
  expenseAttachmentsService,
  expensesService,
  paymentAccountsService,
  providersService,
  toFinanceApiErrorMessage,
  type AttachmentService,
} from '../services';
import { budgetLinesService } from '../services/budget-lines.service';
import type { Expense, Provider } from '../types/expenses.types';
import type { ExpenseListFilters } from '../types/expenseView.types';
import type { PaymentAccount } from '../PaymentAccounts/types';
import type { ProviderRecord } from '../Providers/useProveedoresLogic';
import { createQuickProviderRecord } from '../Providers/providerRecordFactory';
import { canDeleteExpense, canEditExpense, filterExpenses, isExpenseEffectivelyOverdue } from '../utils/expenseFilters';
import { useExpenseAttachments } from '../hooks/useExpenseAttachments';
import { useExpenseColumns } from '../hooks/useExpenseColumns';
import { useFinanceReferenceData } from '../hooks/useFinanceReferenceData';
import { useExpensesResolvedLocale, useExpensesTranslations } from './hooks/useExpensesTranslations';
import { ExpensesHeader } from '../components/header/ExpensesHeader';
import { ExpensesFilters } from '../components/filters/ExpensesFilters';
import { ExpensesSummary } from '../components/kpis/ExpensesSummary';
import { ColumnConfigurationModal } from '../components/table/ColumnConfigurationModal';
import { ExpenseFormModal } from '../components/modals/ExpenseFormModal';
import type { ExpenseFormValues } from '../components/modals/ExpenseFormModal';
import { ExpensePaymentModal } from '../components/modals/ExpensePaymentModal';
import {
  ExpenseBulkIntegrationModal,
  type ExpenseBulkDraft,
  type ExpenseBulkEditDraft,
} from '../components/modals/ExpenseBulkIntegrationModal';
import { PayableAccountDialog, type PayableAccountValues } from '../components/modals/PayableAccountDialog';
import { QuickExpenseDialog, type QuickExpenseValues } from '../components/modals/QuickExpenseDialog';
import type { FinanceReferenceOption } from '../types/finance-reference.types';
import { AttachmentsModal } from './components/AttachmentsModal';
import { ExpenseDetailModal } from './components/ExpenseDetailModal';
import { getExpenseDetailCopy } from './components/expenseDetail.copy';
import { ExpenseTable } from './components/ExpenseTable';
import { useWorkspaceNavigationMemory } from '../../../hooks/useWorkspaceNavigationMemory';

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

const expenseWorkspaceUrlFields: Partial<Record<keyof ExpenseListFilters, string>> = {
  searchTerm: 'ex_q',
  periodFilter: 'ex_period',
  businessUnitFilter: 'ex_unit',
  businessFilter: 'ex_business',
  providerFilter: 'ex_provider',
  statusFilter: 'ex_status',
};

const toFallbackOptions = (values: string[]): FinanceReferenceOption[] =>
  Array.from(new Set(values.filter(Boolean))).map(value => ({ value, label: value }));

const AUTO_EXPENSE_FOLIO = 'AUTO-EXP';
const AUTO_PAYABLE_FOLIO = 'AUTO-CXP';

type ExpenseAttachmentOwner = {
  id: string;
  kind: 'budget-line' | 'expense';
  service: AttachmentService;
};

const resolveExpenseAttachmentOwner = (expenseId: string): ExpenseAttachmentOwner | null => {
  if (/^\d+$/.test(expenseId)) {
    return { id: expenseId, kind: 'expense', service: expenseAttachmentsService };
  }

  const budgetLineMatch = /^budget-line-(\d+)$/.exec(expenseId);
  if (budgetLineMatch) {
    return { id: budgetLineMatch[1], kind: 'budget-line', service: budgetLineAttachmentsService };
  }

  return null;
};

export default function Expenses({ expenses: controlledExpenses, onFinanceDataChanged, onExpensesChange, onProvidersChange, providers: providerRecords }: ExpensesProps = {}) {
  const t = useExpensesTranslations();
  const detailCopy = getExpenseDetailCopy(useExpensesResolvedLocale());
  const [localExpenses, setLocalExpenses] = useState<Expense[]>(mockExpenses);
  const [filters, setFilters] = useState<ExpenseListFilters>(defaultFilters);
  const [failureToastMessage, setFailureToastMessage] = useState('');
  const [accountingAccountOptions, setAccountingAccountOptions] = useState<FinanceReferenceOption[]>([]);
  const [paymentAccounts, setPaymentAccounts] = useState<PaymentAccount[]>([]);
  const [isColumnModalOpen, setIsColumnModalOpen] = useState(false);
  const [isBulkIntegrationOpen, setIsBulkIntegrationOpen] = useState(false);
  const [isBulkIntegrationSaving, setIsBulkIntegrationSaving] = useState(false);
  const [isAddExpenseModalOpen, setIsAddExpenseModalOpen] = useState(false);
  const [isPayableAccountModalOpen, setIsPayableAccountModalOpen] = useState(false);
  const [isPayableAccountSubmitting, setIsPayableAccountSubmitting] = useState(false);
  const [isQuickExpenseModalOpen, setIsQuickExpenseModalOpen] = useState(false);
  const [isQuickExpenseSubmitting, setIsQuickExpenseSubmitting] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [initialExpense, setInitialExpense] = useState<Expense | null>(null);
  const [detailExpense, setDetailExpense] = useState<Expense | null>(null);
  const [detailPaymentExpense, setDetailPaymentExpense] = useState<Expense | null>(null);
  const [pendingDeleteExpenseIds, setPendingDeleteExpenseIds] = useState<string[]>([]);
  const [deletingExpenseIds, setDeletingExpenseIds] = useState<Set<string>>(() => new Set());
  const [successToastMessage, setSuccessToastMessage] = useState('');
  const deletingExpenseIdsRef = useRef<Set<string>>(new Set());
  const saveTimeoutsRef = useRef<Record<string, number>>({});
  const expenses = controlledExpenses ?? localExpenses;
  const setExpenses = onExpensesChange ?? setLocalExpenses;
  const { preferredCurrency } = usePreferredBusinessCurrency();
  const { businessOptions: referenceBusinessOptions, currentUser, isLoadingReferenceData, unitOptions: referenceUnitOptions, userOptions } =
    useFinanceReferenceData(setFailureToastMessage);

  useWorkspaceNavigationMemory<ExpenseListFilters>({
    moduleKey: 'expenses',
    tabKey: 'expenses',
    state: filters,
    defaults: defaultFilters,
    urlFields: expenseWorkspaceUrlFields,
    onRestore: setFilters,
  });

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
  const operationalExpenses = useMemo(
    () => expenses.filter(expense => expense.type !== 'budget'),
    [expenses],
  );
  const filteredExpenses = useMemo(
    () => filterExpenses(operationalExpenses, filters),
    [filters, operationalExpenses],
  );
  const summaryExpenses = useMemo(
    () => filterExpenses(operationalExpenses, { ...filters, statusFilter: 'all' }),
    [filters, operationalExpenses],
  );
  const bulkEditableExpenses = useMemo(() => expenses.filter(expense => (
    isBackendId(expense.id)
    && !expense.purchaseOrderId
    && !expense.budgetLineId
    && expense.type !== 'budget'
    && canEditExpense(expense)
  )), [expenses]);
  const totals = useMemo(() => ({
    total: 0,
    paid: 0,
    pending: 0,
    overdue: 0,
    overdueCount: summaryExpenses.filter((expense) => isExpenseEffectivelyOverdue(expense)).length,
  }), [summaryExpenses]);

  const handleBulkExpenseCreate = async (drafts: ExpenseBulkDraft[]) => {
    setIsBulkIntegrationSaving(true);
    try {
      const now = new Date();
      const defaultUnit = filters.businessUnitFilter !== 'all' ? filters.businessUnitFilter : unitOptions[0]?.value ?? '';
      const scopedBusinesses = defaultUnit
        ? businessOptions.filter(option => !option.unitId || option.unitId === defaultUnit)
        : businessOptions;
      const defaultBusiness = filters.businessFilter !== 'all' ? filters.businessFilter : scopedBusinesses[0]?.value ?? '';
      const results = await Promise.allSettled(drafts.map((draft, index) => {
        const expenseDate = new Date(`${draft.date}T00:00:00`);
        return expensesService.createExpense({
        id: `bulk-expense-${Date.now()}-${index}`,
        folio: AUTO_EXPENSE_FOLIO,
        businessUnit: defaultUnit,
        business: defaultBusiness,
        concept: draft.concept,
        description: draft.concept,
        category: mockExpenses[0].category,
        providerId: draft.providerId,
        providerName: providers.find(provider => provider.id === draft.providerId)?.name,
        total: draft.total,
        taxes: 0,
        amount: draft.total,
        amountPaid: 0,
        currency: preferredCurrency,
        dueDate: expenseDate,
        paymentDate: undefined,
        date: expenseDate,
        paymentMethod: 'transfer',
        status: 'pending',
        type: 'real',
        requestedByUserId: currentUser?.id,
        createdAt: now,
        updatedAt: now,
        }, providers);
      }));
      const saved = results.flatMap(result => result.status === 'fulfilled' ? [result.value] : []);
      const failed = results.length - saved.length;
      if (!saved.length) throw new Error('No se pudo guardar ningún gasto. Revisa las referencias e inténtalo de nuevo.');
      setExpenses(current => [...saved, ...current]);
      onFinanceDataChanged?.();
      setSuccessToastMessage(`${saved.length} gasto${saved.length === 1 ? '' : 's'} creado${saved.length === 1 ? '' : 's'} correctamente.`);
      if (failed) setFailureToastMessage(`${failed} fila${failed === 1 ? '' : 's'} no se pudieron guardar y requieren revisión.`);
    } finally {
      setIsBulkIntegrationSaving(false);
    }
  };

  const handleBulkExpenseUpdate = async (drafts: ExpenseBulkEditDraft[]) => {
    setIsBulkIntegrationSaving(true);
    try {
      const results = await Promise.allSettled(drafts.map(async draft => {
        const source = expenses.find(expense => expense.id === draft.id);
        if (!source || source.purchaseOrderId || source.budgetLineId || source.type === 'budget' || !isBackendId(source.id) || !canEditExpense(source)) {
          throw new Error('El gasto está protegido y no se puede editar de forma masiva.');
        }
        const saved = await expensesService.updateExpense({
          ...source,
          providerId: draft.providerId,
          providerName: providers.find(provider => provider.id === draft.providerId)?.name,
          concept: draft.concept,
          description: source.description || draft.concept,
          total: draft.total,
          amount: draft.total,
          taxes: 0,
          date: new Date(`${draft.date}T00:00:00`),
          updatedAt: new Date(),
        }, providers);
        return saved;
      }));
      const saved = results.flatMap(result => result.status === 'fulfilled' ? [result.value] : []);
      const failed = results.length - saved.length;
      if (!saved.length) throw new Error('No se pudo actualizar ningún gasto. Revisa los registros e inténtalo de nuevo.');
      const savedById = new Map(saved.map(expense => [expense.id, expense]));
      setExpenses(current => current.map(expense => savedById.get(expense.id) ?? expense));
      onFinanceDataChanged?.();
      setSuccessToastMessage(`${saved.length} gasto${saved.length === 1 ? '' : 's'} actualizado${saved.length === 1 ? '' : 's'} correctamente.`);
      if (failed) setFailureToastMessage(`${failed} cambio${failed === 1 ? '' : 's'} no se pudieron guardar y requieren revisión.`);
    } finally {
      setIsBulkIntegrationSaving(false);
    }
  };

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
        amountPaid: 0,
        currency,
        dueDate: now,
        paymentDate: undefined,
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
      const paidExpense = await expensesService.createExpense(draftExpense, providers);
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
    if (!canEditExpense(expense)) return;
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
    const effectiveStatus = editingExpense?.status ?? 'pending';
    const paymentDate = inputPaymentDate ?? sourceExpense?.paymentDate;
    const inputExpenseDate = values.expenseDate ? new Date(`${values.expenseDate}T00:00:00`) : undefined;
    const recordDate = inputExpenseDate ?? sourceExpense?.date ?? inputPaymentDate ?? now;
    const dueDate = inputDueDate ?? sourceExpense?.dueDate ?? now;
    const previousAmountPaid = sourceExpense?.amountPaid ?? 0;
    const amountPaid = effectiveStatus === 'paid' || effectiveStatus === 'audited'
      ? values.total
      : effectiveStatus === 'partial' || effectiveStatus === 'overdue'
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
      status: effectiveStatus,
      attachments: values.attachments ?? sourceExpense?.attachments ?? [],
      type: sourceExpense?.type ?? 'real',
      createdAt: sourceExpense?.createdAt ?? now,
      updatedAt: now,
    };

    try {
      let savedExpense = editingExpense?.type === 'budget'
        ? await budgetLinesService.updateBudgetLineFromExpense(draftExpense)
        : editingExpense && isBackendId(editingExpense.id)
          ? await expensesService.updateExpense(draftExpense, providers)
          : draftExpense.type === 'payable'
            ? await createPayableExpense(draftExpense)
            : await expensesService.createExpense(draftExpense, providers);

      const attachmentOwner = resolveExpenseAttachmentOwner(savedExpense.id);
      const attachmentResults = attachmentOwner
        ? await Promise.allSettled(
          values.attachmentFiles.map(file => attachmentOwner.service.upload(attachmentOwner.id, file)),
        )
        : [];
      const uploadedAttachments = attachmentResults.flatMap(result => (
        result.status === 'fulfilled' ? [result.value] : []
      ));
      const attachmentUploadFailed = values.attachmentFiles.length > 0 && (
        !attachmentOwner || attachmentResults.some(result => result.status === 'rejected')
      );
      let attachmentRefreshFailed = false;

      if (attachmentOwner && values.attachmentFiles.length > 0) {
        try {
          savedExpense = attachmentOwner.kind === 'budget-line'
            ? await budgetLinesService.getBudgetExpense(savedExpense.id)
            : await expensesService.getExpenseById(savedExpense.id, providers) ?? savedExpense;
        } catch {
          attachmentRefreshFailed = true;
          const existingAttachmentNames = savedExpense.attachments ?? [];
          savedExpense = {
            ...savedExpense,
            attachments: [
              ...existingAttachmentNames,
              ...uploadedAttachments.map(attachment => attachment.originalFilename),
            ],
            attachmentCount: Math.max(
              savedExpense.attachmentCount ?? 0,
              existingAttachmentNames.length,
            ) + uploadedAttachments.length,
          };
        }
      }

      const updatedBudgetExpense = await getUpdatedBudgetExpense(savedExpense.budgetLineId);

      setExpenses(currentExpenses => (
        editingExpense
          ? replaceBudgetExpense(currentExpenses.map(item => (item.id === editingExpense.id ? savedExpense : item)), updatedBudgetExpense)
          : [savedExpense, ...replaceBudgetExpense(currentExpenses, updatedBudgetExpense)]
      ));
      closeExpenseModal();
      if (attachmentUploadFailed || attachmentRefreshFailed) {
        setFailureToastMessage(
          `${editingExpense ? t.expenses.messages.saved : t.expenses.messages.created} ${t.expenses.attachments.operationFailed}`,
        );
      } else {
        setSuccessToastMessage(editingExpense ? t.expenses.messages.saved : t.expenses.messages.created);
      }
    } catch (error) {
      setFailureToastMessage(toFinanceApiErrorMessage(error, editingExpense ? t.expenses.messages.updateFailed : t.expenses.messages.createFailed));
      throw error;
    }
  };

  const handlePayableAccountSubmit = async (values: PayableAccountValues) => {
    const provider = providers.find(item => item.id === values.providerId);
    const now = new Date();
    const expenseDate = new Date(`${values.expenseDate}T00:00:00`);
    const dueDate = new Date(`${values.dueDate}T00:00:00`);
    const payableExpense: Expense = {
      id: `payable-${Date.now()}`,
      folio: AUTO_PAYABLE_FOLIO,
      businessUnit: values.businessUnit,
      business: values.business,
      concept: values.concept,
      description: values.notes,
      category: mockExpenses[0].category,
      providerId: values.providerId,
      providerName: provider?.name,
      reference: values.reference,
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
      date: expenseDate,
      paymentMethod: 'transfer',
      accountingAccount: values.accountingAccount,
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
    if (!canDeleteExpense(expense)) {
      setFailureToastMessage(t.expenses.messages.deleteDraftOnly);
      return;
    }

    // Budget-line rows are synthetic and always carry this prefixed id. Some
    // historical expense records also carry entryType="budget", but their
    // numeric id must still be deleted through the expenses API.
    if (expense.id.startsWith('budget-line-')) {
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
    const expense = expenses.find(item => item.id === id);
    if (!expense || !canDeleteExpense(expense)) {
      setFailureToastMessage(t.expenses.messages.deleteDraftOnly);
      return;
    }
    setPendingDeleteExpenseIds([id]);
  };

  const requestDeleteExpenses = (ids: string[]) => {
    const selectedExpenses = ids
      .map(id => expenses.find(expense => expense.id === id))
      .filter((expense): expense is Expense => Boolean(expense));
    if (selectedExpenses.length !== ids.length || !selectedExpenses.every(canDeleteExpense)) {
      setFailureToastMessage(t.expenses.messages.deleteDraftOnly);
      return;
    }
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

  const handleRecordExpensePayment = async (expense: Expense, amount: number, paymentAccountId: string, paymentDate: Date, attachmentFiles: File[]) => {
    try {
      const payableExpense = await ensureExpensePayable(expense);
      const savedExpense = payableExpense.type === 'budget'
        ? await budgetLinesService.updateBudgetLineFromExpense(applyExpensePayment(payableExpense, amount, paymentDate))
        : isBackendId(payableExpense.id)
          ? await expensesService.recordExpensePayment(payableExpense.id, amount, paymentAccountId, paymentDate, providers)
          : { ...applyExpensePayment(payableExpense, amount, paymentDate), paymentAccountId };
      const updatedBudgetExpense = await getUpdatedBudgetExpense(savedExpense.budgetLineId);

      let savedExpenseWithAttachments = savedExpense;
      if (attachmentFiles.length > 0 && isBackendId(payableExpense.id) && payableExpense.type !== 'budget') {
        const paymentContext = {
          paymentAmount: amount,
          paymentDate: paymentDate.toISOString().slice(0, 10),
          paymentAccountId,
        };
        const uploadResults = await Promise.allSettled(
          attachmentFiles.map(file => expenseAttachmentsService.upload(payableExpense.id, file, paymentContext)),
        );
        const uploaded = uploadResults.flatMap(result => result.status === 'fulfilled' ? [result.value] : []);
        savedExpenseWithAttachments = {
          ...savedExpense,
          attachments: [...(savedExpense.attachments ?? []), ...uploaded.map(file => file.originalFilename)],
          attachmentCount: (savedExpense.attachmentCount ?? 0) + uploaded.length,
        };
        if (uploadResults.some(result => result.status === 'rejected')) {
          setFailureToastMessage(detailCopy.paymentEvidenceUploadFailed);
        }
      }

      setPaymentAccounts(currentAccounts => currentAccounts.map(account => (
        account.id === paymentAccountId ? { ...account, balance: account.balance - amount } : account
      )));
      if (updatedBudgetExpense) {
        setExpenses(currentExpenses => replaceBudgetExpense(currentExpenses, updatedBudgetExpense));
      }
      onFinanceDataChanged?.();
      setSuccessToastMessage(t.expenses.messages.saved);
      return savedExpenseWithAttachments;
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
      amountPaid: 0,
      paymentAccountId: undefined,
      paymentDate: undefined,
      status: 'pending' as const,
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
        onBulkIntegration={() => setIsBulkIntegrationOpen(true)}
        onConfigureColumns={() => setIsColumnModalOpen(true)}
        onCreatePayableAccount={openPayableAccountModal}
        onCreateExpense={openCreateExpenseModal}
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
        expenses={summaryExpenses}
        preferredCurrency={preferredCurrency}
        statusFilter={filters.statusFilter}
        totals={totals}
        onStatusChange={(statusFilter) => setFilters(current => ({ ...current, statusFilter }))}
      />

      <ExpenseTable
        actionVisibility={{ showAudit: false, showMarkPaid: false, showStatusChange: false }}
        accountingAccountOptions={accountingAccountOptions}
        columns={translatedColumns}
        deletingExpenseIds={deletingExpenseIds}
        expenses={filteredExpenses}
        getAttachments={getExpenseAttachments}
        onDeleteExpense={requestDeleteExpense}
        onDeleteExpenses={requestDeleteExpenses}
        onDuplicateExpense={handleDuplicate}
        onEditExpense={(expense) => {
          if (!canEditExpense(expense)) return;
          setEditingExpense(expense);
          setInitialExpense(null);
          setIsAddExpenseModalOpen(true);
        }}
        onExpensesChange={setExpenses}
        onOpenAttachments={openAttachmentsModal}
        onViewExpense={setDetailExpense}
        onPersistExpenseUpdate={persistExpenseUpdate}
        paymentAccounts={paymentAccounts}
        onRecordExpensePayment={handleRecordExpensePayment}
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

      <ExpenseBulkIntegrationModal
        editableExpenses={bulkEditableExpenses}
        isSaving={isBulkIntegrationSaving}
        lockedExpenseCount={expenses.length - bulkEditableExpenses.length}
        onCreate={handleBulkExpenseCreate}
        onOpenChange={setIsBulkIntegrationOpen}
        onUpdate={handleBulkExpenseUpdate}
        open={isBulkIntegrationOpen}
        preferredCurrency={preferredCurrency}
        providers={providers}
      />

      {detailExpense && (
        <ExpenseDetailModal
          expense={detailExpense}
          onClose={() => setDetailExpense(null)}
          onEdit={() => {
            if (!canEditExpense(detailExpense)) return;
            setDetailExpense(null);
            setEditingExpense(detailExpense);
            setInitialExpense(null);
            setIsAddExpenseModalOpen(true);
          }}
          onOpenAttachments={() => {
            setDetailExpense(null);
            openAttachmentsModal(detailExpense);
          }}
          onRecordPayment={() => {
            setDetailExpense(null);
            setDetailPaymentExpense(detailExpense);
          }}
          paymentAccounts={paymentAccounts}
        />
      )}

      {detailPaymentExpense && (
        <ExpensePaymentModal
          expense={detailPaymentExpense}
          onClose={() => setDetailPaymentExpense(null)}
          onSubmit={async (_expenseId, amount, paymentAccountId, paymentDate, attachmentFiles) => {
            const savedExpense = await handleRecordExpensePayment(detailPaymentExpense, amount, paymentAccountId, paymentDate, attachmentFiles);
            if (!savedExpense) return;
            setExpenses(currentExpenses => currentExpenses.map(expense => expense.id === savedExpense.id ? savedExpense : expense));
            setDetailPaymentExpense(null);
            setDetailExpense(savedExpense);
          }}
          paymentAccounts={paymentAccounts}
        />
      )}

      {attachmentsExpense && (
        <AttachmentsModal
          isOpen
          onClose={closeAttachmentsModal}
          expenseId={attachmentsExpense.id}
          expenseFolio={attachmentsExpense.folio}
          expenseConcept={attachmentsExpense.concept}
          expenseCurrency={attachmentsExpense.currency}
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
          onCreateProvider={onProvidersChange ? handleQuickProviderCreate : undefined}
          preferredCurrency={preferredCurrency}
          providers={providers}
          unitOptions={unitOptions}
          onSubmitExpense={handleExpenseSubmit}
        />
      )}

      <PayableAccountDialog
        accountingAccountOptions={accountingAccountOptions}
        businessOptions={businessOptions}
        currency={preferredCurrency}
        isSubmitting={isPayableAccountSubmitting}
        onOpenChange={setIsPayableAccountModalOpen}
        onCreateProvider={onProvidersChange ? handleQuickProviderCreate : undefined}
        onSubmit={handlePayableAccountSubmit}
        open={isPayableAccountModalOpen}
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
