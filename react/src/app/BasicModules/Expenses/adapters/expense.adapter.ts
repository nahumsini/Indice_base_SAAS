import { ExpenseStatus as CanonicalExpenseStatus, PaymentStatus } from '../types/finance-status.types';
import { DEFAULT_FINANCE_CURRENCY } from '../constants/financeCurrencyOptions';
import type { FinanceExpense } from '../types/finance-domain.types';
import type { Expense, ExpenseStatus as LegacyExpenseStatus } from '../types/expenses.types';
import { expenseCategories } from '../data/categories.data';
import {
  asNumber,
  asObject,
  asString,
  asStringArray,
  compactObject,
  numericId,
  toDate,
  toDateInputValue,
} from './adapter.utils';
import type {
  BackendExpenseStatus,
  BackendPaymentStatus,
  ExpenseApiDto,
  ExpenseApiRequest,
} from '../types/finance-api.types';

const toIsoDate = (date?: Date) => (date ? new Date(date).toISOString().slice(0, 10) : undefined);
const defaultCategory = expenseCategories.find(category => category.id === 'other') ?? expenseCategories[0];

const legacyExpenseStatusMap: Record<LegacyExpenseStatus, CanonicalExpenseStatus> = {
  pending: CanonicalExpenseStatus.APPROVED,
  partial: CanonicalExpenseStatus.PARTIALLY_PAID,
  paid: CanonicalExpenseStatus.PAID,
  overdue: CanonicalExpenseStatus.APPROVED,
  audited: CanonicalExpenseStatus.CLOSED,
};

const legacyPaymentStatusMap: Record<LegacyExpenseStatus, PaymentStatus> = {
  pending: PaymentStatus.UNPAID,
  partial: PaymentStatus.PARTIALLY_PAID,
  paid: PaymentStatus.PAID,
  overdue: PaymentStatus.OVERDUE,
  audited: PaymentStatus.PAID,
};

const legacyStatusValues: LegacyExpenseStatus[] = ['paid', 'pending', 'partial', 'overdue', 'audited'];

const isLegacyExpenseStatus = (value: unknown): value is LegacyExpenseStatus => (
  typeof value === 'string' && legacyStatusValues.includes(value as LegacyExpenseStatus)
);

const canonicalToLegacyStatus = (
  status: BackendExpenseStatus,
  paymentStatus: BackendPaymentStatus,
  customFields: Record<string, unknown>,
): LegacyExpenseStatus => {
  const customStatus = customFields.legacyStatus;
  if (isLegacyExpenseStatus(customStatus) && ['DRAFT', 'PENDING_APPROVAL', 'APPROVED'].includes(status)) {
    return customStatus;
  }
  if (paymentStatus === 'OVERDUE') return 'overdue';
  if (status === 'PARTIALLY_PAID' || paymentStatus === 'PARTIALLY_PAID') return 'partial';
  if (status === 'CLOSED') return 'audited';
  if (status === 'PAID' || paymentStatus === 'PAID') return 'paid';
  return 'pending';
};

const providerNameFrom = (providerId: string | undefined, providers: Array<{ id: string; name: string }>) => (
  providers.find(provider => provider.id === providerId)?.name
);

export const toFinanceExpenseFromApi = (expense: ExpenseApiDto): FinanceExpense => {
  const customFields = asObject(expense.customFields);
  const attachments = asStringArray(customFields.attachments);
  const total = asNumber(expense.totalAmount);
  const paidAmount = asNumber(expense.paidAmount);

  return {
    id: String(expense.id),
    companyId: String(expense.companyId),
    unitId: expense.unitId ? String(expense.unitId) : undefined,
    businessId: expense.businessId ? String(expense.businessId) : undefined,
    providerId: expense.providerId ? String(expense.providerId) : undefined,
    categoryId: asString(customFields.categoryId, undefined),
    budgetLineId: expense.budgetLineId ? String(expense.budgetLineId) : undefined,
    purchaseOrderId: expense.purchaseOrderId ? String(expense.purchaseOrderId) : undefined,
    accountingAccountId: expense.accountingAccountId ? String(expense.accountingAccountId) : undefined,
    paymentAccountId: expense.paymentAccountId ? String(expense.paymentAccountId) : undefined,
    folio: expense.folio,
    concept: expense.concept,
    description: expense.description ?? asString(customFields.description, expense.concept),
    reference: asString(customFields.reference, expense.folio),
    expenseType: expense.expenseType,
    subtotal: asNumber(expense.subtotalAmount),
    tax: asNumber(expense.taxAmount),
    total,
    paidAmount,
    balance: asNumber(expense.balanceAmount, Math.max(total - paidAmount, 0)),
    currency: expense.currencyCode,
    expenseDate: expense.expenseDate,
    dueDate: expense.dueDate ?? undefined,
    paidDate: expense.paymentDate ?? undefined,
    closeDate: expense.closeDate ?? undefined,
    requestedByUserId: expense.requestedByUserId ? String(expense.requestedByUserId) : undefined,
    approvedByUserId: expense.approvedByUserId ? String(expense.approvedByUserId) : undefined,
    performedByUserId: expense.performedByUserId ? String(expense.performedByUserId) : undefined,
    status: expense.status as CanonicalExpenseStatus,
    paymentStatus: expense.paymentStatus as PaymentStatus,
    createdBy: expense.createdByUserId ? String(expense.createdByUserId) : undefined,
    approvedBy: expense.approvedByUserId ? String(expense.approvedByUserId) : undefined,
    attachments: attachments.length > 0 ? attachments : Array.from({ length: expense.attachmentCount ?? 0 }, (_, index) => `Archivo ${index + 1}`),
    auditStatus: expense.auditStatus ?? undefined,
    createdAt: expense.createdAt ?? undefined,
    updatedAt: expense.updatedAt ?? undefined,
  };
};

export const toFinanceExpense = (expense: Expense, companyId = 'mock-company'): FinanceExpense => {
  const paidAmount = expense.amountPaid ?? (expense.status === 'paid' || expense.status === 'audited' ? expense.total : 0);

  return {
    id: expense.id,
    companyId,
    unitId: expense.businessUnit,
    businessId: expense.business,
    providerId: expense.providerId,
    categoryId: expense.category?.id ?? defaultCategory.id,
    accountingAccountId: expense.accountingAccount,
    paymentAccountId: expense.paymentAccountId,
    folio: expense.folio,
    concept: expense.concept,
    description: expense.description ?? expense.concept,
    reference: expense.folio,
    expenseType: 'VARIABLE',
    subtotal: expense.amount,
    tax: expense.taxes,
    total: expense.total,
    paidAmount,
    balance: Math.max(expense.total - paidAmount, 0),
    currency: expense.currency,
    expenseDate: toIsoDate(expense.date) ?? '',
	    dueDate: toIsoDate(expense.dueDate),
	    paidDate: toIsoDate(expense.paymentDate),
	    requestedByUserId: expense.requestedByUserId,
	    approvedByUserId: expense.approvedByUserId,
	    performedByUserId: expense.performedByUserId,
	    status: legacyExpenseStatusMap[expense.status],
    paymentStatus: legacyPaymentStatusMap[expense.status],
    createdAt: toIsoDate(expense.createdAt),
    updatedAt: toIsoDate(expense.updatedAt),
    createdBy: undefined,
    approvedBy: expense.approver,
    attachments: expense.attachments ?? [],
    auditStatus: expense.status === 'audited' ? 'AUDITED' : undefined,
  };
};

export const toExpense = (
  expense: ExpenseApiDto,
  providers: Array<{ id: string; name: string }> = [],
): Expense => {
  const customFields = asObject(expense.customFields);
	  const providerId = expense.providerId ? String(expense.providerId) : asString(customFields.providerId, undefined);
	  const attachments = asStringArray(customFields.attachments);
	  const status = canonicalToLegacyStatus(expense.status, expense.paymentStatus, customFields);
	  const amountPaid = asNumber(customFields.amountPaid, asNumber(expense.paidAmount));
	  const paymentDate = asString(customFields.paymentDate, expense.paymentDate ?? undefined);
	  const expenseDate = toDate(expense.expenseDate);
	  const dueDate = toDate(expense.dueDate, expenseDate);
	  const requestedByUserId = expense.requestedByUserId ? String(expense.requestedByUserId) : undefined;
	  const approvedByUserId = expense.approvedByUserId ? String(expense.approvedByUserId) : undefined;
	  const performedByUserId = expense.performedByUserId ? String(expense.performedByUserId) : undefined;

	  return {
	    id: String(expense.id),
	    folio: expense.folio,
	    businessUnit: expense.unitId ? String(expense.unitId) : '',
	    business: expense.businessId ? String(expense.businessId) : '',
    concept: expense.concept,
    description: expense.description ?? asString(customFields.description, ''),
    category: defaultCategory,
    providerId,
    providerName: asString(customFields.providerName, providerNameFrom(providerId, providers) ?? ''),
    total: asNumber(expense.totalAmount),
    taxes: asNumber(expense.taxAmount),
    taxCountry: asString(customFields.taxCountry, undefined),
    taxIncluded: Boolean(customFields.taxIncluded),
    taxMode: asString(customFields.taxMode, undefined) as Expense['taxMode'],
    taxName: asString(customFields.taxName, undefined),
    taxProfileId: asString(customFields.taxProfileId, undefined),
    taxRate: asNumber(customFields.taxRate, undefined),
    taxRegion: asString(customFields.taxRegion, undefined),
    taxSpecialAmount: asNumber(customFields.taxSpecialAmount, undefined),
    amount: asNumber(expense.subtotalAmount),
    amountPaid,
    currency: expense.currencyCode,
    dueDate,
    paymentDate: paymentDate ? toDate(paymentDate) : undefined,
    date: expenseDate,
    paymentMethod: asString(customFields.paymentMethod, 'transfer') as Expense['paymentMethod'],
	    accountingAccount: expense.accountingAccountId ? String(expense.accountingAccountId) : asString(customFields.accountingAccount, undefined),
    paymentAccountId: expense.paymentAccountId ? String(expense.paymentAccountId) : asString(customFields.paymentAccountId, undefined),
	    status,
	    approver: approvedByUserId,
	    requestedByUserId,
	    approvedByUserId,
	    performedByUserId,
	    notes: asString(customFields.notes, undefined),
    attachments: attachments.length > 0 ? attachments : Array.from({ length: expense.attachmentCount ?? 0 }, (_, index) => `Archivo ${index + 1}`),
    costCenter: asString(customFields.costCenter, undefined),
    type: asString(customFields.entryType, 'real') as Expense['type'],
    frequency: asString(customFields.frequency, undefined) as Expense['frequency'],
    duration: asNumber(customFields.duration, undefined),
    startDate: customFields.startDate ? toDate(asString(customFields.startDate)) : undefined,
    projected: Boolean(customFields.projected),
    createdAt: toDate(expense.createdAt, expenseDate),
    updatedAt: toDate(expense.updatedAt, expenseDate),
  };
};

export const toExpenseApiRequest = (expense: Expense): ExpenseApiRequest => ({
  unitId: numericId(expense.businessUnit) ?? null,
  businessId: numericId(expense.business) ?? null,
  providerId: numericId(expense.providerId) ?? null,
  budgetLineId: numericId(expense.id.startsWith('budget-line-') ? expense.id : undefined) ?? null,
  accountingAccountId: numericId(expense.accountingAccount) ?? null,
  paymentAccountId: numericId(expense.paymentAccountId) ?? null,
  folio: expense.folio.trim(),
  concept: expense.concept.trim(),
  description: expense.description?.trim() || null,
  expenseType: expense.frequency && expense.frequency !== 'once' ? 'FIXED' : 'VARIABLE',
  subtotalAmount: expense.amount,
  taxAmount: expense.taxes,
  totalAmount: expense.total,
  currencyCode: (expense.currency || DEFAULT_FINANCE_CURRENCY).slice(0, 3).toUpperCase(),
  expenseDate: toDateInputValue(expense.date) ?? toDateInputValue(new Date()) ?? '',
  dueDate: toDateInputValue(expense.dueDate) ?? null,
  requestedByUserId: numericId(expense.requestedByUserId) ?? null,
  approvedByUserId: numericId(expense.approvedByUserId) ?? null,
  performedByUserId: numericId(expense.performedByUserId) ?? null,
	  customFields: compactObject({
	    accountingAccount: expense.accountingAccount,
	    amountPaid: expense.amountPaid,
	    attachments: expense.attachments,
	    costCenter: expense.costCenter,
	    duration: expense.duration,
	    entryType: expense.type ?? 'real',
    frequency: expense.frequency,
    legacyStatus: expense.status,
    notes: expense.notes,
    paymentDate: toDateInputValue(expense.paymentDate),
    paymentAccountId: expense.paymentAccountId,
    paymentMethod: expense.paymentMethod,
    projected: expense.projected,
    providerId: expense.providerId,
    providerName: expense.providerName,
    startDate: toDateInputValue(expense.startDate),
    taxCountry: expense.taxCountry,
    taxIncluded: expense.taxIncluded,
    taxMode: expense.taxMode,
    taxName: expense.taxName,
    taxProfileId: expense.taxProfileId,
    taxRate: expense.taxRate,
    taxRegion: expense.taxRegion,
    taxSpecialAmount: expense.taxSpecialAmount,
  }),
  metadata: { source: 'expenses-frontend' },
});
