import { useMemo } from 'react';
import { usePreferredBusinessCurrency } from '../../../shared/BusinessCurrencyContext';
import { getFinanceBulkCopy } from '../../../shared/financeBulkActions.copy';
import { useKpiMonetaryAggregates, type KpiMonetaryBatchQuery } from '../../../shared/kpiMonetaryApi';
import { useBudgetsResolvedLocale, useBudgetsTranslations } from '../hooks/useBudgetsTranslations';
import { getBudgetWorkspaceCopy } from '../budgetWorkspace.copy';
import { formatBudgetCurrency } from '../budgetFormatting';
import type { BudgetLineTableRow } from '../types/budgetLineTable.types';

const metrics = ['BUDGET_PLANNED', 'BUDGET_COMMITTED', 'BUDGET_ACTUAL', 'BUDGET_AVAILABLE'] as const;

export function BudgetTableTotals({ rows, selectedRows }: { rows: BudgetLineTableRow[]; selectedRows: BudgetLineTableRow[] }) {
  const locale = useBudgetsResolvedLocale();
  const t = useBudgetsTranslations();
  const copy = getFinanceBulkCopy(locale);
  const workspaceCopy = getBudgetWorkspaceCopy(locale);
  const { preferredCurrency } = usePreferredBusinessCurrency();
  const queries = useMemo<KpiMonetaryBatchQuery[]>(() => [
    ...metrics.map(metric => ({ key: `filtered-${metric}`, metric, preferredCurrency, ids: rows.map(row => row.id.replace('budget-line-', '')) })),
    ...selectedRows.length ? metrics.map(metric => ({ key: `selected-${metric}`, metric, preferredCurrency, ids: selectedRows.map(row => row.id.replace('budget-line-', '')) })) : [],
  ], [rows, selectedRows, preferredCurrency]);
  const aggregates = useKpiMonetaryAggregates(queries);
  const labels = [t.budgets.planned, t.budgets.committed, t.budgets.actual, t.budgets.available];
  const strip = (kind: 'filtered' | 'selected', label: string) => (
    <div className={`flex flex-col gap-2 px-4 py-3 lg:flex-row lg:items-center lg:justify-between ${kind === 'selected' ? 'bg-[#147514]/5 dark:bg-emerald-400/10' : ''}`}>
      <span className={`text-xs font-medium ${kind === 'selected' ? 'text-[#147514] dark:text-emerald-300' : 'text-slate-500 dark:text-slate-400'}`}>{label}</span>
      <div className="flex flex-wrap gap-2">
        {metrics.map((metric, index) => {
          const totals = aggregates.data[`${kind}-${metric}`];
          const amount = aggregates.loading || aggregates.error || !totals ? '—'
            : totals.nativeTotals.length ? totals.nativeTotals.map(total => `${formatBudgetCurrency(total.amount, total.currency, locale)} ${total.currency}`).join(' / ')
              : formatBudgetCurrency(0, preferredCurrency, locale);
          return <span key={metric} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-700 shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200">
            <span className="font-medium text-slate-500 dark:text-slate-400">{labels[index]}</span><span className="tabular-nums">{amount}</span>
          </span>;
        })}
      </div>
    </div>
  );
  return <div className="border-t border-slate-200 dark:border-slate-700" aria-busy={aggregates.loading}>
    {strip('filtered', copy.filtered)}
    {selectedRows.length > 0 && strip('selected', t.budgets.summary.selectedRows(selectedRows.length))}
    {aggregates.loading && <p role="status" className="px-4 pb-2 text-xs text-slate-500">{workspaceCopy.loading}</p>}
    {aggregates.error && <p role="alert" className="px-4 pb-2 text-sm text-rose-600">{workspaceCopy.totalsError} <button type="button" className="underline" onClick={aggregates.refresh}>{workspaceCopy.retry}</button></p>}
  </div>;
}
