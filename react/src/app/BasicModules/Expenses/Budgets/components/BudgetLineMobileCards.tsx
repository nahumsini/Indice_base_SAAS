import { Checkbox } from '../../../../components/ui/checkbox';
import type { BudgetsTranslations } from '../translations';
import type { BudgetLineTableRow } from '../types/budgetLineTable.types';
import { formatBudgetCurrency, formatBudgetDate } from '../budgetFormatting';
import { BudgetLineActions } from './BudgetLineCells';

export function BudgetLineMobileCards({
  budgetLines,
  isSelected,
  locale,
  onDelete,
  onEdit,
  onSelectionChange,
  t,
}: {
  budgetLines: BudgetLineTableRow[];
  isSelected: (budgetLineId: string) => boolean;
  locale: string;
  onDelete: (budgetLineId: string) => void;
  onEdit: (budgetLineId: string) => void;
  onSelectionChange: (budgetLineId: string, selected: boolean) => void;
  t: BudgetsTranslations;
}) {
  return (
    <div className="divide-y divide-slate-200 md:hidden dark:divide-slate-700">
      {budgetLines.map((budgetLine) => (
        <article key={budgetLine.id} className={`space-y-4 p-4 ${isSelected(budgetLine.id) ? 'bg-[#147514]/5 dark:bg-[#147514]/10' : ''}`}>
          <div className="flex items-start gap-3">
            <Checkbox
              aria-label={t.budgets.table.selectBudgetLine(budgetLine.folio)}
              checked={isSelected(budgetLine.id)}
              className="mt-1 border-slate-300 data-[state=checked]:border-[#147514] data-[state=checked]:bg-[#147514]"
              onCheckedChange={(checked) => onSelectionChange(budgetLine.id, checked === true)}
            />
            <div className="min-w-0 flex-1">
              <p className="font-mono text-sm text-[#147514] dark:text-emerald-300">{budgetLine.folio}</p>
              <h3 className="mt-1 text-base text-slate-950 dark:text-white">{budgetLine.concept}</h3>
              {budgetLine.providerName ? <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{budgetLine.providerName}</p> : null}
            </div>
          </div>

          <dl className="grid grid-cols-2 gap-3 text-sm">
            <Value label={t.budgets.planned} value={formatBudgetCurrency(budgetLine.plannedAmount, budgetLine.currency, locale)} />
            <Value label={t.budgets.actual} value={formatBudgetCurrency(budgetLine.actualExpenseAmount, budgetLine.currency, locale)} />
            <Value label={t.budgets.available} value={formatBudgetCurrency(budgetLine.availableAmount, budgetLine.currency, locale)} valueClassName={budgetLine.availableAmount < 0 ? 'text-rose-600 dark:text-rose-300' : 'text-[#147514] dark:text-emerald-300'} />
            <Value label={t.budgets.columns.dueDate.label} value={formatBudgetDate(budgetLine.dueDate, locale)} />
          </dl>

          <div className="flex justify-end">
            <BudgetLineActions budgetLineId={budgetLine.id} onDelete={onDelete} onEdit={onEdit} t={t} />
          </div>
        </article>
      ))}
    </div>
  );
}

function Value({ label, value, valueClassName = 'text-slate-900 dark:text-slate-100' }: { label: string; value: string; valueClassName?: string }) {
  return (
    <div className="min-w-0 rounded-xl bg-slate-50 px-3 py-2 dark:bg-slate-800">
      <dt className="text-xs text-slate-500 dark:text-slate-400">{label}</dt>
      <dd className={`mt-1 truncate tabular-nums ${valueClassName}`}>{value}</dd>
    </div>
  );
}
