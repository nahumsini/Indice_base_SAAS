import { expenseCategories } from '../data/categories.data';
import type { Expense } from '../types/expenses.types';
import { BudgetHealthStatus, BudgetStatus } from '../types/finance-status.types';
import type { FinanceBudgetLine } from '../types/finance-domain.types';
import {
  asNumber,
  asObject,
  asString,
  compactObject,
  numericId,
  optionalString,
  toDate,
  toDateInputValue,
} from './adapter.utils';
import type { BudgetLineApiDto, BudgetLineApiRequest } from '../types/finance-api.types';

const defaultCategory = expenseCategories[0];
const getDefaultBudgetDate = () => {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth() + 1, 1);
};

const toLocalBudgetDate = (value?: string | Date | null, fallback = getDefaultBudgetDate()) => {
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return new Date(`${value}T00:00:00`);
  }
  return toDate(value, fallback);
};

export const getBudgetLineApiId = (budgetLineId: string) => {
  const prefixedId = budgetLineId.startsWith('budget-line-')
    ? budgetLineId.replace('budget-line-', '')
    : budgetLineId;
  return numericId(prefixedId);
};

const getRequiredBudgetId = (expense: Expense) => {
  const budgetId = numericId(expense.budgetId);
  if (!budgetId) {
    throw new Error('budgetId is required to save budget lines.');
  }
  return budgetId;
};

const toBudgetLineName = (expense: Expense) => {
  const concept = expense.concept.trim();
  const uniqueSuffix = expense.folio?.trim() ? ` · ${expense.folio.trim()}` : ` · ${Date.now()}`;
  return `${concept}${uniqueSuffix}`.slice(0, 160);
};

export const toFinanceBudgetLine = (budgetLine: BudgetLineApiDto): FinanceBudgetLine => ({
  id: String(budgetLine.id),
  companyId: String(budgetLine.companyId),
  unitId: budgetLine.unitId ? String(budgetLine.unitId) : undefined,
  businessId: budgetLine.businessId ? String(budgetLine.businessId) : undefined,
  budgetId: String(budgetLine.budgetId),
  name: budgetLine.name,
  categoryKey: budgetLine.categoryKey ?? undefined,
  description: budgetLine.description ?? undefined,
  period: asString(asObject(budgetLine.customFields).period, ''),
  plannedAmount: asNumber(budgetLine.plannedAmount),
  committedAmount: asNumber(budgetLine.committedAmount),
  actualExpenseAmount: asNumber(budgetLine.actualExpenseAmount),
  pettyCashIssuedAmount: asNumber(budgetLine.pettyCashIssuedAmount),
  pettyCashSettledAmount: asNumber(budgetLine.pettyCashSettledAmount),
  availableAmount: asNumber(budgetLine.availableAmount),
  currencyCode: budgetLine.currencyCode,
  healthStatus: (budgetLine.healthStatus ?? BudgetHealthStatus.ON_TRACK) as BudgetHealthStatus,
  status: (budgetLine.status ?? BudgetStatus.ACTIVE) as BudgetStatus,
  createdAt: budgetLine.createdAt ?? undefined,
  updatedAt: budgetLine.updatedAt ?? undefined,
});

export const toBudgetExpense = (budgetLine: BudgetLineApiDto): Expense => {
  const customFields = asObject(budgetLine.customFields);
  const scheduledDate = toLocalBudgetDate(asString(customFields.dueDate, customFields.startDate as string | undefined), getDefaultBudgetDate());
  const plannedAmount = asNumber(budgetLine.plannedAmount);

  return {
    id: `budget-line-${budgetLine.id}`,
    folio: asString(customFields.folio, `BUD-${budgetLine.id}`),
    businessUnit: budgetLine.unitId ? String(budgetLine.unitId) : '',
    business: budgetLine.businessId ? String(budgetLine.businessId) : '',
    budgetId: String(budgetLine.budgetId),
    concept: asString(customFields.concept, budgetLine.name),
    description: budgetLine.description ?? '',
    category: defaultCategory,
    providerId: asString(customFields.providerId, undefined),
    providerName: asString(customFields.providerName, undefined),
    total: plannedAmount,
    taxes: asNumber(customFields.taxes),
    taxCountry: asString(customFields.taxCountry, undefined),
    taxIncluded: customFields.taxIncluded === true,
    taxMode: asString(customFields.taxMode, undefined) as Expense['taxMode'],
    taxName: asString(customFields.taxName, undefined),
    taxProfileId: asString(customFields.taxProfileId, undefined),
    taxRate: asNumber(customFields.taxRate, undefined),
    taxRegion: asString(customFields.taxRegion, undefined),
    taxSpecialAmount: asNumber(customFields.taxSpecialAmount, undefined),
    amount: plannedAmount - asNumber(customFields.taxes),
    amountPaid: asNumber(budgetLine.actualExpenseAmount),
    currency: budgetLine.currencyCode,
    dueDate: scheduledDate,
    date: scheduledDate,
    paymentMethod: 'transfer',
    accountingAccount: asString(customFields.accountingAccount, 'Gastos Operativos'),
    status: budgetLine.status === 'CLOSED' ? 'paid' : 'pending',
    attachments: [],
    costCenter: undefined,
    type: 'budget',
    frequency: asString(customFields.frequency, 'once') as Expense['frequency'],
    duration: asNumber(customFields.duration, 1),
    startDate: customFields.startDate ? toLocalBudgetDate(asString(customFields.startDate)) : scheduledDate,
    projected: true,
    createdAt: toDate(budgetLine.createdAt, scheduledDate),
    updatedAt: toDate(budgetLine.updatedAt ?? budgetLine.createdAt, scheduledDate),
  };
};

export const toBudgetLineApiRequest = (expense: Expense): BudgetLineApiRequest => ({
  unitId: numericId(expense.businessUnit) ?? null,
  businessId: numericId(expense.business) ?? null,
  budgetId: getRequiredBudgetId(expense),
  name: toBudgetLineName(expense),
  categoryKey: expense.category.id,
  plannedAmount: expense.total || expense.amount,
  currencyCode: (expense.currency || 'USD').slice(0, 3).toUpperCase(),
  status: expense.status === 'paid' || expense.status === 'audited' ? 'CLOSED' : 'ACTIVE',
  description: optionalString(expense.description),
  customFields: compactObject({
    accountingAccount: expense.accountingAccount,
    concept: expense.concept,
    dueDate: toDateInputValue(expense.dueDate),
    duration: expense.duration,
    folio: expense.folio,
    frequency: expense.frequency,
    providerId: expense.providerId,
    providerName: expense.providerName,
    startDate: toDateInputValue(expense.startDate),
    taxes: expense.taxes,
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
