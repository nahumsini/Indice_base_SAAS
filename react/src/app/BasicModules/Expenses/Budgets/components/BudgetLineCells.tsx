import { Pencil, Trash2 } from 'lucide-react';
import { IndiceTableActionGroup } from '../../../../components/table/IndiceTableEngine';
import type { BudgetsTranslations } from '../translations';
import type { BudgetLineTableRow } from '../types/budgetLineTable.types';
import { formatBudgetCurrency, formatBudgetDate } from '../budgetFormatting';
import type { BudgetLineColumnId } from './budgetLineTableConfig';

export function BudgetLineCell({
  budgetLine,
  columnId,
  locale,
  t,
}: {
  budgetLine: BudgetLineTableRow;
  columnId: BudgetLineColumnId;
  locale: string;
  t: BudgetsTranslations;
}) {
  switch (columnId) {
    case 'folio':
      return (
        <div className="min-w-0">
          <p className="truncate font-mono text-slate-950 dark:text-white">{budgetLine.folio}</p>
          <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">{formatBudgetDate(budgetLine.createdAt, locale)}</p>
        </div>
      );
    case 'concept':
      return (
        <div className="min-w-0">
          <p className="line-clamp-2 leading-5 text-slate-900 dark:text-slate-100">{budgetLine.concept}</p>
          {budgetLine.description ? <p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-500 dark:text-slate-400">{budgetLine.description}</p> : null}
        </div>
      );
    case 'businessUnit':
      return <StackedText primary={budgetLine.businessUnit || '—'} secondary={budgetLine.business || undefined} />;
    case 'providerName':
      return <span className="line-clamp-2 whitespace-normal">{budgetLine.providerName || '—'}</span>;
    case 'accountingAccount':
      return <span className="line-clamp-2 whitespace-normal">{budgetLine.accountingAccount || '—'}</span>;
    case 'plannedAmount':
      return <MoneyCell amount={budgetLine.plannedAmount} currency={budgetLine.currency} locale={locale} tone="base" />;
    case 'committedAmount':
      return <MoneyCell amount={budgetLine.committedAmount} currency={budgetLine.currency} locale={locale} tone="amber" />;
    case 'actualExpenseAmount':
      return <MoneyCell amount={budgetLine.actualExpenseAmount} currency={budgetLine.currency} locale={locale} tone="blue" />;
    case 'availableAmount':
      return <MoneyCell amount={budgetLine.availableAmount} currency={budgetLine.currency} locale={locale} tone={budgetLine.availableAmount < 0 ? 'red' : 'green'} />;
    case 'health':
      return <HealthBadge status={budgetLine.healthStatus} t={t} />;
    case 'status':
      return <StatusBadge status={budgetLine.status} t={t} />;
    case 'dueDate':
      return <span className="tabular-nums text-slate-700 dark:text-slate-200">{formatBudgetDate(budgetLine.dueDate, locale)}</span>;
  }
}

export function BudgetLineActions({
  budgetLineId,
  onDelete,
  onEdit,
  t,
}: {
  budgetLineId: string;
  onDelete: (budgetLineId: string) => void;
  onEdit: (budgetLineId: string) => void;
  t: BudgetsTranslations;
}) {
  return (
    <IndiceTableActionGroup>
      <button type="button" onClick={() => onEdit(budgetLineId)} className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-amber-200 bg-amber-50 text-amber-700 transition hover:bg-amber-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/30 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-300" aria-label={t.budgets.rowActions.editLine} title={t.budgets.rowActions.editLine}>
        <Pencil aria-hidden="true" className="h-4 w-4" />
      </button>
      <button type="button" onClick={() => onDelete(budgetLineId)} className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-rose-200 bg-rose-50 text-rose-600 transition hover:bg-rose-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500/30 dark:border-rose-900/60 dark:bg-rose-950/30 dark:text-rose-300" aria-label={t.budgets.rowActions.deleteLine} title={t.budgets.rowActions.deleteLine}>
        <Trash2 aria-hidden="true" className="h-4 w-4" />
      </button>
    </IndiceTableActionGroup>
  );
}

function StackedText({ primary, secondary }: { primary: string; secondary?: string }) {
  return (
    <div className="min-w-0">
      <p className="line-clamp-2 whitespace-normal text-slate-800 dark:text-slate-100">{primary}</p>
      {secondary ? <p className="mt-1 line-clamp-2 whitespace-normal text-xs text-slate-500 dark:text-slate-400">{secondary}</p> : null}
    </div>
  );
}

function MoneyCell({ amount, currency, locale, tone }: { amount: number; currency: string; locale: string; tone: 'amber' | 'base' | 'blue' | 'green' | 'red' }) {
  const toneClass = {
    amber: 'border-amber-100 bg-amber-50 text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-300',
    base: 'border-slate-200 bg-slate-50 text-slate-950 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100',
    blue: 'border-blue-100 bg-blue-50 text-blue-700 dark:border-blue-900/60 dark:bg-blue-950/30 dark:text-blue-300',
    green: 'border-[#147514]/15 bg-[#147514]/10 text-[#147514] dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-300',
    red: 'border-red-100 bg-red-50 text-red-700 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-300',
  }[tone];

  return <span className={`inline-flex min-w-[112px] justify-end rounded-xl border px-3 py-2 tabular-nums ${toneClass}`}>{formatBudgetCurrency(amount, currency, locale)}</span>;
}

function HealthBadge({ status, t }: { status?: string; t: BudgetsTranslations }) {
  const normalizedStatus = status ?? 'ON_TRACK';
  const className = normalizedStatus === 'EXCEEDED'
    ? 'border-red-200 bg-red-50 text-red-700 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-300'
    : normalizedStatus === 'WARNING'
      ? 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-300'
      : 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-300';

  return <span className={`inline-flex rounded-full border px-3 py-1 text-xs ${className}`}>{t.budgets.healthLabels[normalizedStatus] ?? toTitleCase(normalizedStatus)}</span>;
}

function StatusBadge({ status, t }: { status: string; t: BudgetsTranslations }) {
  const normalizedStatus = status ?? 'ACTIVE';
  const className = normalizedStatus === 'CLOSED' || normalizedStatus === 'ARCHIVED'
    ? 'border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300'
    : normalizedStatus === 'DRAFT'
      ? 'border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900/60 dark:bg-blue-950/30 dark:text-blue-300'
      : normalizedStatus === 'overdue'
        ? 'border-red-200 bg-red-50 text-red-700 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-300'
        : 'border-[#147514]/20 bg-[#147514]/10 text-[#147514] dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-300';

  return <span className={`inline-flex rounded-full border px-3 py-1 text-xs ${className}`}>{t.budgets.statusLabels[normalizedStatus] ?? toTitleCase(normalizedStatus)}</span>;
}

function toTitleCase(value: string) {
  return value.toLowerCase().split('_').map(part => part.charAt(0).toUpperCase() + part.slice(1)).join(' ');
}
