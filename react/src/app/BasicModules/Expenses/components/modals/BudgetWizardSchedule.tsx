import { CalendarDays, Pencil } from 'lucide-react';
import { IndiceModalSummary } from '../../../../components/indice-modal';
import type { BudgetDraftState } from '../../Budgets/budgetDraftState';
import { formatBudgetCurrency, formatBudgetDate } from '../../Budgets/budgetFormatting';
import { budgetFrequencyOptions } from '../../Budgets/budgetUtils';
import { formatTaxRate, getBudgetTaxProfile, parsePercentInput } from '../../Budgets/budgetTaxCatalog';
import type { FinanceTranslations } from '../../translations';
import type { FinanceReferenceOption } from '../../types/finance-reference.types';
import type { Provider } from '../../types/expenses.types';
import { budgetWizardInputClass, BudgetWizardSelect } from './BudgetWizardCostStep';

const editButtonClass = 'inline-flex min-h-11 items-center gap-2 rounded-lg px-3 text-sm font-medium text-[#147514] hover:bg-[#147514]/5 focus-visible:outline-2 focus-visible:outline-[#147514] disabled:opacity-50 dark:text-emerald-300';
type ScheduleProps = {
  draft: BudgetDraftState; dates: Date[]; totalPerOrder: number; plannedTotal: number;
  mode: 'create' | 'edit'; locale: string; t: FinanceTranslations;
};

// UI shortcut: fill the existing end-date input through the selected calendar month.
// The domain's getBudgetScheduleDates remains the only recurrence generator.
export function getBudgetQuickPeriodEnd(start: string, months: number): string {
  const date = new Date(`${start}T00:00:00`);
  if (Number.isNaN(date.getTime())) return '';
  const end = new Date(date.getFullYear(), date.getMonth() + months, 0);
  return `${end.getFullYear()}-${String(end.getMonth() + 1).padStart(2, '0')}-${String(end.getDate()).padStart(2, '0')}`;
}

export function BudgetWizardScheduleStep({ draft, dates, totalPerOrder, plannedTotal, mode, locale, t, onDraftChange }: ScheduleProps & {
  onDraftChange: (updates: Partial<BudgetDraftState>) => void;
}) {
  return <div className="space-y-4">
    <p className="text-sm text-slate-500 dark:text-slate-400">{mode === 'edit' ? t.budgets.modal.editLineHelp : t.budgets.modal.scheduleHelp}</p>
    <BudgetWizardSelect label={t.budgets.modal.frequency} value={draft.frequency}
      options={[...budgetFrequencyOptions, ...(draft.frequency === 'once' ? [{ value: 'once', label: t.budgets.frequencies.once }] : [])].map(option => ({ ...option, label: t.budgets.frequencies[option.value] ?? option.label }))}
      onChange={frequency => onDraftChange({ frequency: frequency as BudgetDraftState['frequency'] })} t={t} />
    <div className="grid gap-4 sm:grid-cols-2">
      <label className="min-w-0">
        <span className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-200">{t.budgets.modal.firstDueDate} *</span>
        <input autoFocus type="date" required value={draft.budgetPeriodStart} onChange={event => onDraftChange({ budgetPeriodStart: event.target.value, startDate: event.target.value })} className={budgetWizardInputClass} />
      </label>
      <label className="min-w-0">
        <span className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-200">{t.budgets.modal.periodEnd} *</span>
        <input type="date" required value={draft.budgetPeriodEnd} onChange={event => onDraftChange({ budgetPeriodEnd: event.target.value })} className={budgetWizardInputClass} />
      </label>
    </div>
    {mode === 'create' && <div>
      <div className="flex flex-wrap items-center gap-2">
        <span className="mr-1 text-xs text-slate-500 dark:text-slate-400">{t.budgets.modal.quickPeriod}</span>
        {[3, 6, 12].map(months => <button type="button" key={months} disabled={!draft.budgetPeriodStart} onClick={() => onDraftChange({ budgetPeriodEnd: getBudgetQuickPeriodEnd(draft.budgetPeriodStart, months) })}
          className="min-h-11 rounded-xl border border-slate-200 px-3 text-sm text-slate-700 hover:border-[#147514] focus-visible:outline-2 focus-visible:outline-[#147514] disabled:opacity-50 dark:border-slate-700 dark:text-slate-200">{t.budgets.modal.quickMonths(months)}</button>)}
      </div>
      {!draft.budgetPeriodStart && <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{t.budgets.modal.startDateHelp}</p>}
    </div>}
    {dates.length > 0 && <>
      <BudgetScheduleTotal dates={dates} totalPerOrder={totalPerOrder} plannedTotal={plannedTotal} draft={draft} t={t} locale={locale} />
      <BudgetDatePreview dates={dates} t={t} locale={locale} />
    </>}
  </div>;
}

export function BudgetWizardReview({ draft, dates, totalPerOrder, plannedTotal, mode, locale, t, accountingAccountOptions, unitOptions, businessOptions, providers, onEdit }: ScheduleProps & {
  accountingAccountOptions: FinanceReferenceOption[]; unitOptions: FinanceReferenceOption[];
  businessOptions: FinanceReferenceOption[]; providers: Provider[];
  onEdit: (step: 'cost' | 'schedule') => void;
}) {
  const labelFor = (options: FinanceReferenceOption[], value: string) => options.find(option => option.value === value)?.label || value || t.common.unassigned;
  const money = (value: number) => formatBudgetCurrency(value, draft.budgetCurrencyCode, locale);
  const taxLabel = !draft.taxEnabled ? t.budgets.modal.withoutTax : draft.taxIncluded ? t.budgets.modal.includedTax : t.budgets.modal.addedTax;
  const profile = getBudgetTaxProfile(draft.taxProfileId, draft.taxCountry);
  const taxAmount = Number(draft.taxes.replace(/,/g, '') || 0);
  return <div className="space-y-4">
    <div className="flex flex-wrap items-center justify-between gap-2">
      <h3 tabIndex={-1} className="text-base font-medium text-slate-900 dark:text-white">{t.budgets.modal.reviewSummaryTitle}</h3>
      <button type="button" className={editButtonClass} onClick={() => onEdit('cost')}><Pencil aria-hidden="true" className="h-4 w-4" />{t.budgets.modal.editCost}</button>
    </div>
    <IndiceModalSummary columns={2} variant="plain" className="[&_dd]:whitespace-normal [&_dd]:break-words" items={[
      { label: t.budgets.modal.concept, value: draft.concept },
      { label: t.budgets.modal.provider, value: providers.find(provider => provider.id === draft.providerId)?.name || t.common.unassigned },
      { label: t.budgets.modal.account, value: labelFor(accountingAccountOptions, draft.accountingAccount) },
      { label: t.expenses.modal.currency, value: draft.budgetCurrencyCode },
      { label: t.budgets.modal.unit, value: labelFor(unitOptions, draft.businessUnit) },
      { label: t.budgets.modal.business, value: labelFor(businessOptions, draft.business) },
      { label: t.budgets.modal.beforeTaxAmount, value: money(totalPerOrder - taxAmount) },
      { label: t.tax.consumptionTaxes, value: <>{taxLabel}{draft.taxEnabled && <span className="mt-1 block text-xs text-slate-500 dark:text-slate-400">{profile?.label}{profile?.manualRate && ` · ${formatTaxRate(parsePercentInput(draft.taxRate))}`} · {money(taxAmount)}</span>}</> },
      ...(draft.description ? [{ label: t.budgets.modal.description, value: draft.description }] : []),
    ]} />
    <div className="flex flex-wrap items-center justify-between gap-2">
      <h3 className="text-sm font-medium text-slate-700 dark:text-slate-200">{t.budgets.frequencies[draft.frequency] ?? draft.frequency} · {formatBudgetDate(dates[0], locale)} — {formatBudgetDate(new Date(`${draft.budgetPeriodEnd}T00:00:00`), locale)}</h3>
      <button type="button" className={editButtonClass} onClick={() => onEdit('schedule')}><Pencil aria-hidden="true" className="h-4 w-4" />{t.budgets.modal.editSchedule}</button>
    </div>
    <BudgetDatePreview dates={dates} t={t} locale={locale} />
    <BudgetScheduleTotal dates={dates} totalPerOrder={totalPerOrder} plannedTotal={plannedTotal} draft={draft} t={t} locale={locale} />
    {mode === 'edit' && <p className="text-sm text-slate-500 dark:text-slate-400">{t.budgets.modal.editLineHelp}</p>}
  </div>;
}

function BudgetScheduleTotal({ dates, totalPerOrder, plannedTotal, draft, t, locale }: Omit<ScheduleProps, 'mode'>) {
  return <IndiceModalSummary columns={2} variant="success" className="[&_dd]:whitespace-normal" items={[
    { label: t.budgets.modal.scheduleDates(dates.length), value: `${dates.length} × ${formatBudgetCurrency(totalPerOrder, draft.budgetCurrencyCode, locale)}` },
    { emphasized: true, label: t.budgets.modal.reviewPlannedTotal, value: formatBudgetCurrency(plannedTotal, draft.budgetCurrencyCode, locale) },
  ]} />;
}

function BudgetDatePreview({ dates, t, locale }: { dates: Date[]; t: FinanceTranslations; locale: string }) {
  const dateChips = (values: Date[]) => values.map(date => <li key={date.getTime()} className="flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-700 dark:bg-slate-900/60 dark:text-slate-200"><CalendarDays aria-hidden="true" className="h-4 w-4 shrink-0 text-slate-400" /><span>{formatBudgetDate(date, locale)}</span></li>);
  return <section aria-label={t.budgets.modal.datePreview} className="space-y-2">
    <h4 className="text-xs font-medium text-slate-500 dark:text-slate-400">{t.budgets.modal.datePreview}</h4>
    <ul className="grid gap-2 sm:grid-cols-3">{dateChips(dates.slice(0, 6))}</ul>
    {dates.length > 6 && <details>
      <summary className="min-h-11 cursor-pointer py-3 text-sm font-medium text-[#147514] dark:text-emerald-300">{t.budgets.modal.showAllDates} ({dates.length})</summary>
      <ul className="grid gap-2 sm:grid-cols-3">{dateChips(dates.slice(6))}</ul>
    </details>}
  </section>;
}
