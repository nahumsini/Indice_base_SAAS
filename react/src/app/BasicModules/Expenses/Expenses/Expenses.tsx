import { formatExpenseDate } from '../utils/expenseDates';
import { useCallback, useEffect, useMemo, useRef, useState, type Dispatch, type SetStateAction } from 'react';
import { Plus } from 'lucide-react';
import { useSearchParams } from 'react-router';
import { FailureToast } from '../../../components/FailureToast';
import { SuccessToast } from '../../../components/SuccessToast';
import { ExpenseDeleteModal } from '../components/modals/ExpenseDeleteModal';
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
import { canDeleteExpense, canEditExpense, filterExpenses, isExpenseEffectivelyOverdue, splitExpensePeriod } from '../utils/expenseFilters';
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
import { PayablesKioskManagementModal } from '../components/modals/PayablesKioskManagementModal';
import { QuickExpenseDialog, type QuickExpenseValues } from '../components/modals/QuickExpenseDialog';
import type { FinanceReferenceOption } from '../types/finance-reference.types';
import { AttachmentsModal } from './components/AttachmentsModal';
import { ExpenseDetailModal } from './components/ExpenseDetailModal';
import { getExpenseDetailCopy } from './components/expenseDetail.copy';
import { ExpenseTable } from './components/ExpenseTable';
import { expenseGroupPeriodLabel } from '../utils/expenseFundGroups';
import { getExpenseFundGroupCopy } from './components/expenseFundGroup.copy';
import { useWorkspaceNavigationMemory } from '../../../hooks/useWorkspaceNavigationMemory';
import { readKioskAdminNavigationTarget } from '../../../components/kiosk-engine/kioskAdminNavigation';

interface ExpensesProps {
  dataReady?: boolean;
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

export default function Expenses({ dataReady = true, expenses: controlledExpenses, onFinanceDataChanged, onExpensesChange, onProvidersChange, providers: providerRecords }: ExpensesProps = {}) {
  const t = useExpensesTranslations();
  const [searchParams, setSearchParams] = useSearchParams();
  const kioskAdminSearch = searchParams.toString();
  const kioskAdminTarget = useMemo(
    () => readKioskAdminNavigationTarget(kioskAdminSearch),
    [kioskAdminSearch],
  );
  const isPayablesKioskTarget = kioskAdminTarget?.kioskType === 'accounts_payable';
  const locale = useExpensesResolvedLocale();
  const detailCopy = getExpenseDetailCopy(locale);
  const [localExpenses, setLocalExpenses] = useState<Expense[]>(mockExpenses);
  const [filters, setFilters] = useState<ExpenseListFilters>(defaultFilters);
  const [referenceDate, setReferenceDate] = useState(() => new Date());
  useEffect(() => {
    const refreshDay = () => setReferenceDate(previous => {
      const now = new Date();
      return previous.toDateString() === now.toDateString() ? previous : now;
    });
    const timer = window.setInterval(refreshDay, 60_000);
    window.addEventListener('focus', refreshDay);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener('focus', refreshDay);
    };
  }, []);
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
  const [isPayablesKioskOpen, setIsPayablesKioskOpen] = useState(isPayablesKioskTarget);
  const captureRequestKey = useRef(crypto.randomUUID());
  const saveTimeoutsRef = useRef<Record<string, number>>({});
  const expenses = controlledExpenses ?? localExpenses;
  const setExpenses = onExpensesChange ?? setLocalExpenses;
  const { preferredCurrency } = usePreferredBusinessCurrency();
  const { businessOptions: referenceBusinessOptions, currentUser, isLoadingReferenceData, isReferenceDataReady, unitOptions: referenceUnitOptions, userOptions } =
    useFinanceReferenceData(setFailureToastMessage);

  useEffect(() => {
    if (isPayablesKioskTarget) setIsPayablesKioskOpen(true);
  }, [isPayablesKioskTarget, kioskAdminTarget?.engineId]);

  const closePayablesKiosk = () => {
    setIsPayablesKioskOpen(false);
    const nextSearchParams = new URLSearchParams(searchParams);
    nextSearchParams.delete('kioskAdminSource');
    nextSearchParams.delete('kioskEngineId');
    nextSearchParams.delete('kioskReferenceId');
    nextSearchParams.delete('kioskType');
    setSearchParams(nextSearchParams, { replace: true });
  };

  const filtersRestored = useWorkspaceNavigationMemory<ExpenseListFilters>({
    moduleKey: 'expenses',
    tabKey: 'expenses',
    state: filters,
    defaults: defaultFilters,
    urlFields: expenseWorkspaceUrlFields,
    enabled: dataReady && isReferenceDataReady,
    onRestore: restored => {
      const unit = referenceUnitOptions.some(option => option.value === restored.businessUnitFilter) ? restored.businessUnitFilter : 'all';
      setFilters({
        searchTerm: typeof restored.searchTerm === 'string' ? restored.searchTerm : '',
        periodFilter: ['this_month', 'last_month', 'two_months_ago', 'this_year', 'last_year', 'custom'].includes(restored.periodFilter) ? restored.periodFilter : 'this_month',
        statusFilter: ['all', 'paid', 'pending', 'partial', 'overdue', 'audited', 'pending_and_overdue'].includes(restored.statusFilter) ? restored.statusFilter : 'all',
        businessUnitFilter: unit,
        businessFilter: referenceBusinessOptions.some(option => option.value === restored.businessFilter && (unit === 'all' || option.unitId === unit)) ? restored.businessFilter : 'all',
        providerFilter: providerRecords?.some(provider => provider.id === restored.providerFilter) ? restored.providerFilter : 'all',
      });
    },
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
    () => filterExpenses(operationalExpenses, filters, referenceDate),
    [filters, operationalExpenses, referenceDate],
  );
  const summaryExpenses = useMemo(
    () => filterExpenses(operationalExpenses, { ...filters, statusFilter: 'all' }, referenceDate),
    [filters, operationalExpenses, referenceDate],
  );
  const summaryPeriod = useMemo(
    () => splitExpensePeriod(summaryExpenses, filters.periodFilter, referenceDate),
    [summaryExpenses, filters.periodFilter, referenceDate],
  );
  const carryoverExpenseIds = useMemo(
    () => new Set(summaryPeriod.carryoverExpenses.map(expense => expense.id)),
    [summaryPeriod.carryoverExpenses],
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
    overdueCount: summaryExpenses.filter((expense) => isExpenseEffectivelyOverdue(expense, referenceDate)).length,
  }), [summaryExpenses, referenceDate]);

  const handleBulkExpenseCreate = async (drafts: ExpenseBulkDraft[], requestKey: string) => {
    setIsBulkIntegrationSaving(true);
    try {
      const now = new Date();
      const defaultUnit = filters.businessUnitFilter !== 'all' ? filters.businessUnitFilter : referenceUnitOptions[0]?.value ?? '';
      const defaultBusiness = filters.businessFilter !== 'all' ? filters.businessFilter
        : referenceBusinessOptions.find(option => option.unitId === defaultUnit)?.value ?? '';
      const batch: Expense[] = drafts.map((draft, index) => {
        const expenseDate = new Date(`${draft.date}T00:00:00`);
        return {
          id: `bulk-expense-${index}`,
          folio: AUTO_EXPENSE_FOLIO,
          businessUnit: defaultUnit,
          business: defaultBusiness,
          concept: draft.concept,
          description: draft.concept,
          category: mockExpenses[0].category,
          providerId: draft.providerId,
          providerName: providers.find(provider => provider.id === draft.providerId)?.name,
          accountingAccount: draft.accountingAccountId,
          paymentAccountId: draft.paymentAccountId,
          total: draft.total,
          taxes: 0, // The import owner computes the included-tax split with decimal arithmetic.
          amount: draft.total,
          taxIncluded: draft.taxIncluded, taxRate: draft.taxRate, taxName: draft.taxName,
          taxCountry: draft.taxCountry, taxProfileId: draft.taxProfileId, taxMode: draft.taxIncluded ? 'auto' : 'none',
          amountPaid: 0,
          currency: draft.currency,
          dueDate: draft.paid ? expenseDate : new Date(`${draft.dueDate}T00:00:00`),
          date: expenseDate,
          paymentMethod: 'transfer',
          status: draft.paid ? 'paid' : 'pending',
          type: 'real',
          requestedByUserId: currentUser?.id,
          createdAt: now,
          updatedAt: now,
        };
      });
      const saved = await expensesService.importExpenses(batch, requestKey, providers);
      const savedIds = new Set(saved.map(expense => expense.id));
      setExpenses(current => [...saved, ...current.filter(expense => !savedIds.has(expense.id))]);
      onFinanceDataChanged?.();
      void paymentAccountsService.getPaymentAccounts().then(accounts => setPaymentAccounts(accounts.filter(account => account.isActive))).catch(() => {});
      setSuccessToastMessage(`${saved.length} gasto${saved.length === 1 ? '' : 's'} creado${saved.length === 1 ? '' : 's'} correctamente.`);
    } catch (error) {
      throw new Error(toFinanceApiErrorMessage(error, 'No se pudo guardar el lote. La captura se conserva para reintentar.'));
    } finally {
      setIsBulkIntegrationSaving(false);
    }
  };

  const handleBulkExpenseUpdate = async (drafts: ExpenseBulkEditDraft[]) => {
    setIsBulkIntegrationSaving(true);
    try {
      const batch = drafts.map(draft => {
        const source = expenses.find(expense => expense.id === draft.id);
        if (!source || source.purchaseOrderId || source.budgetLineId || source.type === 'budget' || !isBackendId(source.id) || !canEditExpense(source)) {
          throw new Error('El gasto está protegido y no se puede editar de forma masiva.');
        }
        if (draft.total < source.taxes) throw new Error('El monto total no puede ser menor que los impuestos registrados.');
        return {
          ...source,
          providerId: draft.providerId,
          providerName: providers.find(provider => provider.id === draft.providerId)?.name,
          concept: draft.concept,
          description: source.description || draft.concept,
          accountingAccount: draft.accountingAccountId,
          paymentAccountId: draft.paymentAccountId,
          total: draft.total,
          amount: Number((draft.total - source.taxes).toFixed(4)),
          taxes: source.taxes,
          date: new Date(`${draft.date}T00:00:00`),
          updatedAt: new Date(),
        };
      });
      const saved = await expensesService.updateExpensesBatch(batch, providers);
      const savedById = new Map(saved.map(expense => [expense.id, expense]));
      setExpenses(current => current.map(expense => savedById.get(expense.id) ?? expense));
      onFinanceDataChanged?.();
      setSuccessToastMessage(`${saved.length} gasto${saved.length === 1 ? '' : 's'} actualizado${saved.length === 1 ? '' : 's'} correctamente.`);
    } catch (error) {
      throw new Error(toFinanceApiErrorMessage(error, 'No se pudo actualizar el lote. La captura se conserva para reintentar.'));
    } finally {
      setIsBulkIntegrationSaving(false);
    }
  };

  const reclassifyExpense = async (expense: Expense, accountingAccountId: string) => {
    try {
      const saved = await expensesService.reclassifyExpense(expense, accountingAccountId, providers);
      setExpenses(current => current.map(item => item.id === saved.id ? saved : item));
      onFinanceDataChanged?.();
    } catch (error) {
      setFailureToastMessage(toFinanceApiErrorMessage(error, t.expenses.messages.saveFailed));
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
    captureRequestKey.current = crypto.randomUUID();
    setIsAddExpenseModalOpen(true);
  };

  const openQuickExpenseModal = () => {
    if (createExpenseDisabled) {
      setFailureToastMessage(createExpenseDisabledReason);
      return;
    }
    setEditingExpense(null);
    setInitialExpense(null);
    captureRequestKey.current = crypto.randomUUID();
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
        amountPaid: total,
        currency,
        dueDate: now,
        paymentDate: now,
        date: now,
        paymentMethod: 'transfer',
        status: 'paid',
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
      const paidExpense = await expensesService.createExpense(draftExpense, providers, captureRequestKey.current);
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
          if (isBackendId(expense.id)) {
            void expensesService.getExpenseById(expense.id, providers).then(saved => {
              if (saved) setExpenses(rows => rows.map(row => row.id === saved.id ? saved : row));
            }).catch(() => {});
          }
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
    const effectiveStatus = editingExpense?.status ?? (sourceExpense?.type === 'payable' ? 'pending' : 'paid');
    const paymentDate = inputPaymentDate ?? sourceExpense?.paymentDate;
    const inputExpenseDate = values.expenseDate ? new Date(`${values.expenseDate}T00:00:00`) : undefined;
    const recordDate = inputExpenseDate ?? sourceExpense?.date ?? inputPaymentDate ?? now;
    const dueDate = inputDueDate ?? sourceExpense?.dueDate ?? now;
    // Correcting consumption never manufactures or erases a bank payment.
    const amountPaid = editingExpense ? editingExpense.amountPaid ?? 0 : effectiveStatus === 'paid' ? values.total : 0;
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
      paymentAccountId: editingExpense ? editingExpense.paymentAccountId : values.paymentAccountId || undefined,
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
            : await expensesService.createExpense(draftExpense, providers, captureRequestKey.current);

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
      onFinanceDataChanged?.();
      void paymentAccountsService.getPaymentAccounts().then(accounts => setPaymentAccounts(accounts.filter(account => account.isActive))).catch(() => {});
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
      const message = toFinanceApiErrorMessage(error, t.expenses.messages.createFailed);
      setFailureToastMessage(message);
      throw new Error(message);
    } finally {
      setIsPayableAccountSubmitting(false);
    }
  };

  const handleQuickProviderCreate = async (name: string): Promise<Provider> => {
    const normalizedName = name.trim();
    const existingProvider = providers.find(provider => provider.status !== 'inactive' && isBackendId(provider.id) && provider.name.trim().toLocaleLowerCase() === normalizedName.toLocaleLowerCase());
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

  const confirmPendingDelete = async (reason: string) => {
    const rows = pendingDeleteExpenseIds.map(id => expenses.find(expense => expense.id === id)).filter((row): row is Expense => Boolean(row));
    if (!rows.length || rows.length !== pendingDeleteExpenseIds.length || rows.some(row => !canDeleteExpense(row))) throw new Error(t.expenses.messages.deleteDraftOnly);
    setDeletingExpenseIds(new Set(rows.map(row => row.id)));
    try {
      if (rows.length === 1 && rows[0].id.startsWith('budget-line-')) {
        await budgetLinesService.deleteBudgetLine(rows[0].id);
      } else if (rows.some(row => isBackendId(row.id))) {
        await expensesService.applyBulkAction(rows, 'DELETE', '', reason, providers);
      }
      const deleted = new Set(rows.map(row => row.id));
      setExpenses(current => current.filter(row => !deleted.has(row.id)));
      setPendingDeleteExpenseIds([]);
      onFinanceDataChanged?.();
      void paymentAccountsService.getPaymentAccounts().then(accounts => setPaymentAccounts(accounts.filter(account => account.isActive))).catch(() => {});
      setSuccessToastMessage(t.expenses.messages.deleted);
    } finally { setDeletingExpenseIds(new Set()); }
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

  const handleMarkExpensePaid = async (expense: Expense, idempotencyKey: string) => {
    const saved = isBackendId(expense.id)
      ? await expensesService.settleExpensePayment(expense.id, expense.paymentAccountId ?? '', idempotencyKey, providers)
      : applyExpensePayment(expense, Math.max(expense.total - (expense.amountPaid ?? 0), 0), new Date());
    // Refresh from the owner: retries must never subtract an optimistic bank balance twice.
    void paymentAccountsService.getPaymentAccounts().then(accounts => setPaymentAccounts(accounts.filter(account => account.isActive))).catch(() => {});
    void getUpdatedBudgetExpense(saved.budgetLineId).then(budget => {
      if (budget) setExpenses(current => replaceBudgetExpense(current, budget));
    }).catch(() => {});
    onFinanceDataChanged?.();
    setSuccessToastMessage(t.expenses.payment.settled);
    return saved;
  };

  const handleRecordExpensePayment = async (expense: Expense, amount: number, paymentAccountId: string, paymentDate: Date, attachmentFiles: File[], idempotencyKey?: string) => {
    try {
      const payableExpense = expense;
      const savedExpense = payableExpense.type === 'budget'
        ? await budgetLinesService.updateBudgetLineFromExpense(applyExpensePayment(payableExpense, amount, paymentDate))
        : isBackendId(payableExpense.id)
          ? await expensesService.recordExpensePayment(payableExpense.id, amount, paymentAccountId, paymentDate, providers, idempotencyKey)
          : { ...applyExpensePayment(payableExpense, amount, paymentDate), paymentAccountId };
      // The payment is already committed. A failed secondary refresh must not offer another payment.
      const updatedBudgetExpense = await getUpdatedBudgetExpense(savedExpense.budgetLineId).catch(() => null);

      let savedExpenseWithAttachments = savedExpense;
      if (attachmentFiles.length > 0 && isBackendId(payableExpense.id) && payableExpense.type !== 'budget') {
        const paymentContext = {
          paymentAmount: amount,
          paymentDate: formatExpenseDate(paymentDate)!,
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

      void paymentAccountsService.getPaymentAccounts().then(accounts => setPaymentAccounts(accounts.filter(account => account.isActive))).catch(() => {});
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
        periodExpenses={summaryPeriod.periodExpenses}
        carryoverExpenses={summaryPeriod.carryoverExpenses}
        referenceDate={referenceDate}
        preferredCurrency={preferredCurrency}
        statusFilter={filters.statusFilter}
        totals={totals}
        onStatusChange={(statusFilter) => setFilters(current => ({ ...current, statusFilter }))}
      />

      <ExpenseTable
        dataReady={dataReady && filtersRestored}
        fundPeriodLabel={expenseGroupPeriodLabel(filters.periodFilter, referenceDate, locale, getExpenseFundGroupCopy(locale).period)}
        hasFundDetailFilters={Boolean(filters.searchTerm || filters.providerFilter !== 'all' || filters.businessUnitFilter !== 'all' || filters.businessFilter !== 'all' || filters.statusFilter !== 'all')}
        actionVisibility={{ showAudit: false, showMarkPaid: true, showRecordPayment: true, showStatusChange: false }}
        accountingAccountOptions={accountingAccountOptions}
        columns={translatedColumns}
        deletingExpenseIds={deletingExpenseIds}
        expenses={filteredExpenses}
        carryoverExpenseIds={carryoverExpenseIds}
        getAttachments={getExpenseAttachments}
        onDeleteExpense={requestDeleteExpense}
        onDeleteExpenses={requestDeleteExpenses}
        onBulkStatusChange={async (rows, change) => {
          const saved = await expensesService.applyBulkStatus(rows, change, providers);
          const updated = new Map(saved.map(row => [row.id, row]));
          setExpenses(current => current.map(row => updated.get(row.id) ?? row));
          onFinanceDataChanged?.();
          void paymentAccountsService.getPaymentAccounts().then(accounts => setPaymentAccounts(accounts.filter(account => account.isActive))).catch(() => {});
          setSuccessToastMessage(t.expenses.messages.saved);
        }}
        onBulkAction={async (rows, action, targetId, reason) => {
          const saved = await expensesService.applyBulkAction(rows, action, targetId, reason, providers);
          const selectedIds = new Set(rows.map(row => row.id));
          const updated = new Map(saved.map(row => [row.id, row]));
          setExpenses(current => action === 'DELETE' ? current.filter(row => !selectedIds.has(row.id)) : current.map(row => updated.get(row.id) ?? row));
          onFinanceDataChanged?.();
          if (action === 'DELETE') void paymentAccountsService.getPaymentAccounts().then(accounts => setPaymentAccounts(accounts.filter(account => account.isActive))).catch(() => {});
          setSuccessToastMessage(action === 'DELETE' ? t.expenses.messages.deleted : t.expenses.messages.saved);
        }}
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
        onReclassifyExpense={reclassifyExpense}
        paymentAccounts={paymentAccounts}
        onMarkExpensePaid={handleMarkExpensePaid}
        onRecordExpensePayment={handleRecordExpensePayment}
        businessOptions={referenceBusinessOptions}
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
        accountingAccounts={accountingAccountOptions}
        paymentAccounts={paymentAccounts.filter(account => account.isActive && account.backendType !== 'PETTY_CASH' && account.source !== 'petty_cash' && !account.linkedFundId)
          .map(account => ({ value: account.id, label: account.name, currency: account.currency }))}
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
          printContext={{
            businessUnit: unitOptions.find(option => option.value === detailExpense.businessUnit)?.label,
            business: businessOptions.find(option => option.value === detailExpense.business)?.label,
            accountingAccount: accountingAccountOptions.find(option => option.value === detailExpense.accountingAccount)?.label,
            paymentAccount: paymentAccounts.find(account => account.id === detailExpense.paymentAccountId)?.name,
            requestedBy: userOptions.find(option => option.value === detailExpense.requestedByUserId)?.label,
            approvedBy: userOptions.find(option => option.value === detailExpense.approvedByUserId)?.label,
            performedBy: userOptions.find(option => option.value === detailExpense.performedByUserId)?.label,
          }}
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
          onSubmit={async (_expenseId, amount, paymentAccountId, paymentDate, attachmentFiles, idempotencyKey) => {
            const savedExpense = await handleRecordExpensePayment(detailPaymentExpense, amount, paymentAccountId, paymentDate, attachmentFiles, idempotencyKey);
            if (!savedExpense) throw new Error(t.expenses.messages.saveFailed);
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
          paymentAccounts={paymentAccounts}
          accountingAccountOptions={accountingAccountOptions}
          businessOptions={referenceBusinessOptions}
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
        businessOptions={referenceBusinessOptions}
        currency={preferredCurrency}
        isSubmitting={isPayableAccountSubmitting}
        onOpenChange={setIsPayableAccountModalOpen}
        onCreateProvider={onProvidersChange ? handleQuickProviderCreate : undefined}
        onSubmit={handlePayableAccountSubmit}
        open={isPayableAccountModalOpen}
        providers={providers}
        unitOptions={unitOptions}
      />

      <PayablesKioskManagementModal
        businessOptions={referenceBusinessOptions}
        initialKioskId={isPayablesKioskTarget ? kioskAdminTarget.referenceId : null}
        isOpen={isPayablesKioskOpen}
        onClose={closePayablesKiosk}
        onError={setFailureToastMessage}
        onSuccess={setSuccessToastMessage}
        unitOptions={referenceUnitOptions}
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

      {pendingDeleteExpenseIds.length > 0 && <ExpenseDeleteModal expenses={pendingDeleteExpenses}
        onClose={() => setPendingDeleteExpenseIds([])} onDelete={confirmPendingDelete} />}

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
