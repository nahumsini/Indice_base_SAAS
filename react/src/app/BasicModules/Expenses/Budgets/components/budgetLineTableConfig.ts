import type { IndiceTableAlignment } from '../../../../components/table/IndiceTableEngine';
import type { BudgetsTranslations } from '../translations';
import type { BudgetLineTableRow } from '../types/budgetLineTable.types';

export const budgetLineColumnIds = [
  'folio',
  'concept',
  'businessUnit',
  'providerName',
  'accountingAccount',
  'plannedAmount',
  'committedAmount',
  'actualExpenseAmount',
  'availableAmount',
  'health',
  'status',
  'dueDate',
] as const;

export type BudgetLineColumnId = (typeof budgetLineColumnIds)[number];
export type BudgetSortDirection = 'asc' | 'desc';

export const budgetLineDefaultWidths: Record<BudgetLineColumnId, number> = {
  folio: 165,
  concept: 260,
  businessUnit: 190,
  providerName: 190,
  accountingAccount: 220,
  plannedAmount: 165,
  committedAmount: 175,
  actualExpenseAmount: 165,
  availableAmount: 165,
  health: 155,
  status: 145,
  dueDate: 190,
};

export const budgetLineMinimumWidths: Record<BudgetLineColumnId, number> = {
  folio: 135,
  concept: 190,
  businessUnit: 155,
  providerName: 155,
  accountingAccount: 170,
  plannedAmount: 140,
  committedAmount: 150,
  actualExpenseAmount: 140,
  availableAmount: 140,
  health: 130,
  status: 120,
  dueDate: 160,
};

export const budgetLineActionsWidth = 132;
export const budgetLineSelectionWidth = 60;

export function isBudgetLineColumnId(value: string): value is BudgetLineColumnId {
  return budgetLineColumnIds.includes(value as BudgetLineColumnId);
}

export function getBudgetLineColumnLabel(columnId: BudgetLineColumnId, t: BudgetsTranslations) {
  const labels: Record<BudgetLineColumnId, string> = {
    accountingAccount: t.budgets.columns.accountingAccount.label,
    actualExpenseAmount: t.budgets.actual,
    availableAmount: t.budgets.available,
    businessUnit: t.budgets.columns.businessUnit.label,
    committedAmount: t.budgets.committed,
    concept: t.budgets.columns.concept.label,
    dueDate: t.budgets.columns.dueDate.label,
    folio: t.budgets.columns.folio.label,
    health: t.budgets.health,
    plannedAmount: t.budgets.planned,
    providerName: t.budgets.columns.providerName.label,
    status: t.filters.status,
  };
  return labels[columnId];
}

export function getBudgetLineColumnAlignment(columnId: BudgetLineColumnId): IndiceTableAlignment {
  return ['plannedAmount', 'committedAmount', 'actualExpenseAmount', 'availableAmount'].includes(columnId)
    ? 'right'
    : columnId === 'health' || columnId === 'status'
      ? 'center'
      : 'left';
}

export function sortBudgetLines(
  budgetLines: BudgetLineTableRow[],
  field: BudgetLineColumnId,
  direction: BudgetSortDirection,
  locale: string,
) {
  const multiplier = direction === 'asc' ? 1 : -1;
  const collator = new Intl.Collator(locale, { numeric: true, sensitivity: 'base' });

  return [...budgetLines].sort((left, right) => {
    const leftValue = getBudgetSortValue(left, field);
    const rightValue = getBudgetSortValue(right, field);
    const comparison = typeof leftValue === 'number' && typeof rightValue === 'number'
      ? leftValue - rightValue
      : collator.compare(String(leftValue), String(rightValue));

    return comparison === 0 ? collator.compare(left.folio, right.folio) : comparison * multiplier;
  });
}

function getBudgetSortValue(budgetLine: BudgetLineTableRow, field: BudgetLineColumnId): number | string {
  switch (field) {
    case 'folio': return budgetLine.folio;
    case 'concept': return budgetLine.concept;
    case 'businessUnit': return `${budgetLine.businessUnit} ${budgetLine.business}`;
    case 'providerName': return budgetLine.providerName ?? '';
    case 'accountingAccount': return budgetLine.accountingAccount ?? '';
    case 'plannedAmount': return budgetLine.plannedAmount;
    case 'committedAmount': return budgetLine.committedAmount;
    case 'actualExpenseAmount': return budgetLine.actualExpenseAmount;
    case 'availableAmount': return budgetLine.availableAmount;
    case 'health': return budgetLine.healthStatus ?? 'ON_TRACK';
    case 'status': return budgetLine.status;
    case 'dueDate': return budgetLine.dueDate?.getTime() ?? 0;
  }
}
