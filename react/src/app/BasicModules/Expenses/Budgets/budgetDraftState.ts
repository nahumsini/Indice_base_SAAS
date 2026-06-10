import type { BudgetMasterDraft } from '../adapters/budget.adapter';
import type { Expense, ExpenseFrequency } from '../types/expenses.types';
import type { BudgetDraft } from './budgetUtils';
import { getBudgetTaxProfile, getDefaultBudgetTaxProfile, inferTaxCountryFromCurrency, taxRateToPercentInput, type BudgetTaxCountry, type BudgetTaxMode } from './budgetTaxCatalog';

export const createInitialBudgetDraftState = (budgetId = '') => ({
  accountingAccount: '',
  amount: '',
  budgetCurrencyCode: 'USD',
  budgetDescription: '',
  budgetId,
  budgetName: '',
  budgetPeriodEnd: '',
  budgetPeriodStart: '',
  businessUnit: '',
  business: '',
  concept: '',
  description: '',
  duration: 1,
  frequency: 'monthly' as ExpenseFrequency,
  providerId: '',
  taxes: '',
  taxCountry: 'US',
  taxEnabled: false,
  taxIncluded: false,
  taxMode: 'none' as BudgetTaxMode,
  taxProfileId: 'us_manual_sales_tax',
  taxRate: '',
  taxSpecialAmount: '',
  startDate: '',
});

export type BudgetDraftState = ReturnType<typeof createInitialBudgetDraftState>;

export function createBudgetDraftStateFromExpense(expense: Expense): BudgetDraftState {
  const dueDate = formatDateInputValue(expense.dueDate);
  const taxCountry = normalizeTaxCountry(expense.taxCountry || inferTaxCountryFromCurrency(expense.currency || 'USD'));
  const defaultTaxProfile = getDefaultBudgetTaxProfile(taxCountry);
  const hasTaxMetadata = Boolean(expense.taxMode || expense.taxProfileId || expense.taxRate || expense.taxSpecialAmount);
  const hasTaxAmount = (expense.taxes ?? 0) > 0;

  return {
    accountingAccount: expense.accountingAccount ?? '',
    amount: String(expense.taxIncluded ? expense.total : expense.amount ?? 0),
    budgetCurrencyCode: expense.currency || 'USD',
    budgetDescription: expense.description ?? '',
    budgetId: expense.budgetId ?? '',
    budgetName: expense.concept,
    budgetPeriodEnd: dueDate,
    budgetPeriodStart: dueDate,
    businessUnit: expense.businessUnit,
    business: expense.business,
    concept: expense.concept,
    description: expense.description ?? '',
    duration: expense.duration ?? 1,
    frequency: expense.frequency ?? 'monthly',
    providerId: expense.providerId ?? '',
    taxes: String(expense.taxes ?? 0),
    taxCountry,
    taxEnabled: hasTaxMetadata || hasTaxAmount,
    taxIncluded: Boolean(expense.taxIncluded),
    taxMode: expense.taxMode ?? (hasTaxAmount ? 'manual' : 'none'),
    taxProfileId: expense.taxProfileId ?? defaultTaxProfile?.id ?? '',
    taxRate: taxRateToPercentInput(expense.taxRate ?? defaultTaxProfile?.rate ?? 0),
    taxSpecialAmount: String(expense.taxSpecialAmount ?? ''),
    startDate: dueDate,
  };
}

export function buildBudgetMasterDraft(draft: BudgetDraftState): BudgetMasterDraft {
  return {
    businessId: draft.business,
    currencyCode: draft.budgetCurrencyCode,
    description: draft.budgetDescription,
    name: draft.budgetName || draft.concept,
    periodEnd: draft.budgetPeriodEnd,
    periodStart: draft.budgetPeriodStart,
    unitId: draft.businessUnit,
  };
}

export function buildBudgetLineDraft(draft: BudgetDraftState, providerName?: string): BudgetDraft {
  const enteredAmount = toMoneyNumber(draft.amount);
  const taxes = toMoneyNumber(draft.taxes);
  const amount = draft.taxIncluded ? Math.max(enteredAmount - taxes, 0) : enteredAmount;
  const total = draft.taxIncluded ? enteredAmount : amount + taxes;
  const taxProfile = getBudgetTaxProfile(draft.taxProfileId, draft.taxCountry);

  return {
    accountingAccount: draft.accountingAccount,
    amount,
    business: draft.business,
    businessUnit: draft.businessUnit,
    concept: draft.concept,
    currency: draft.budgetCurrencyCode,
    description: draft.description || draft.budgetDescription,
    duration: draft.duration,
    frequency: draft.frequency,
    periodEnd: toDateValue(draft.budgetPeriodEnd),
    providerId: draft.providerId || undefined,
    providerName,
    startDate: toDateValue(draft.budgetPeriodStart),
    taxes,
    taxCountry: draft.taxCountry,
    taxIncluded: draft.taxIncluded,
    taxMode: draft.taxMode,
    taxName: draft.taxEnabled ? taxProfile?.shortName ?? taxProfile?.label : undefined,
    taxProfileId: draft.taxProfileId,
    taxRate: toPercentNumber(draft.taxRate),
    taxRegion: taxProfile?.region,
    taxSpecialAmount: toMoneyNumber(draft.taxSpecialAmount),
    total,
  };
}

function toMoneyNumber(value: string) {
  const normalizedValue = value.replace(/,/g, '').trim();
  const parsedValue = Number(normalizedValue);
  return Number.isFinite(parsedValue) ? parsedValue : 0;
}

function toPercentNumber(value: string) {
  const parsedValue = Number(value.replace('%', '').replace(',', '.').trim());
  return Number.isFinite(parsedValue) ? parsedValue / 100 : 0;
}

function toDateValue(value: string) {
  return value ? new Date(`${value}T00:00:00`) : new Date();
}

function formatDateInputValue(value?: Date) {
  if (!value || Number.isNaN(value.getTime())) return '';
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, '0');
  const day = String(value.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function normalizeTaxCountry(value: string): BudgetTaxCountry {
  return ['MX', 'US', 'CA', 'CO', 'BR', 'INTL'].includes(value) ? value as BudgetTaxCountry : 'INTL';
}
