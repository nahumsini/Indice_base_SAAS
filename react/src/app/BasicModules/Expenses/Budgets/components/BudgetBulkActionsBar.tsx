import { FinanceBulkActions, type FinanceBulkActionConfig } from '../../../shared/FinanceBulkActions';
import { getFinanceBulkCopy, type FinanceBulkAction } from '../../../shared/financeBulkActions.copy';
import { toFinanceApiErrorMessage } from '../../services';
import type { FinanceReferenceOption } from '../../types/finance-reference.types';
import type { BudgetLineTableRow } from '../types/budgetLineTable.types';
import { getBudgetWorkspaceCopy } from '../budgetWorkspace.copy';

export type BudgetBulkOptions = {
  units: FinanceReferenceOption[];
  businesses: FinanceReferenceOption[];
  providers: FinanceReferenceOption[];
  accounts: FinanceReferenceOption[];
};

export function BudgetBulkActionsBar({ rows, options, locale, onClearSelection, onApply }: {
  rows: BudgetLineTableRow[]; options: BudgetBulkOptions; locale: string;
  onClearSelection: () => void;
  onApply: (action: FinanceBulkAction, rows: BudgetLineTableRow[], targetId: string, reason: string) => Promise<void>;
}) {
  const copy = getBudgetWorkspaceCopy(locale);
  const common = getFinanceBulkCopy(locale);
  const protectedReason = rows.some(row => row.version === undefined || !/^budget-line-\d+$/.test(row.id)
    || ['CLOSED', 'ARCHIVED'].includes(row.status)) ? copy.protected : undefined;
  const units = new Set(rows.map(row => row.unitId));
  const actions: FinanceBulkActionConfig[] = [
    { action: 'DELETE', blockedReason: protectedReason, hint: copy.delete },
    { action: 'UNIT', options: options.units, blockedReason: protectedReason, hint: copy.unit },
    { action: 'BUSINESS', options: options.businesses.filter(option => option.unitId === rows[0]?.unitId), blockedReason: protectedReason || (units.size !== 1 ? copy.business : undefined), hint: copy.business },
    { action: 'PROVIDER', options: options.providers, blockedReason: protectedReason, hint: copy.classification },
    { action: 'ACCOUNTING_ACCOUNT', options: options.accounts, blockedReason: protectedReason, hint: copy.classification },
    { action: 'PAYMENT_ACCOUNT', blockedReason: copy.payment },
  ];
  return <FinanceBulkActions count={rows.length} locale={locale} actions={actions} onClear={onClearSelection}
    onApply={(action, targetId, reason) => onApply(action, rows, targetId, reason)}
    formatError={error => toFinanceApiErrorMessage(error, common.error)} />;
}
