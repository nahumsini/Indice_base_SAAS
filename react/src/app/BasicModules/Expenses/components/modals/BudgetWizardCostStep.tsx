import { ChevronDown, MapPin, NotebookPen } from 'lucide-react';
import type { BudgetDraftState } from '../../Budgets/budgetDraftState';
import { getDefaultBudgetTaxProfile, inferTaxCountryFromCurrency, taxRateToPercentInput } from '../../Budgets/budgetTaxCatalog';
import { financeCurrencySelectOptions } from '../../constants/financeCurrencyOptions';
import type { FinanceReferenceOption } from '../../types/finance-reference.types';
import type { Provider } from '../../types/expenses.types';
import type { FinanceTranslations } from '../../translations';
import { ExpenseAccountSelect } from '../table/ExpenseAccountSelect';
import { BudgetTaxControls } from './BudgetTaxControls';
import { QuickProviderField } from './QuickProviderField';

export const budgetWizardInputClass = 'min-h-11 w-full min-w-0 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-[#147514] focus:outline-none focus:ring-2 focus:ring-[#147514]/15 dark:border-slate-600 dark:bg-slate-900/70 dark:text-slate-100 dark:[color-scheme:dark]';
const labelClass = 'mb-2 block text-sm font-medium text-slate-700 dark:text-slate-200';

export function BudgetWizardCostStep({ draft, accountingAccountOptions, businessOptions, unitOptions, providers, onCreateProvider, onDraftChange, t }: {
  draft: BudgetDraftState;
  accountingAccountOptions: FinanceReferenceOption[];
  businessOptions: FinanceReferenceOption[];
  unitOptions: FinanceReferenceOption[];
  providers: Provider[];
  onCreateProvider?: (name: string) => Promise<Provider>;
  onDraftChange: (updates: Partial<BudgetDraftState>) => void;
  t: FinanceTranslations;
}) {
  const updateCurrency = (budgetCurrencyCode: string) => {
    const taxCountry = inferTaxCountryFromCurrency(budgetCurrencyCode);
    const defaultTaxProfile = getDefaultBudgetTaxProfile(taxCountry);
    onDraftChange({ budgetCurrencyCode, taxCountry, taxProfileId: defaultTaxProfile?.id ?? '', taxRate: defaultTaxProfile ? taxRateToPercentInput(defaultTaxProfile.rate) : '' });
  };
  const unitLabel = unitOptions.find(option => option.value === draft.businessUnit)?.label ?? t.common.unassigned;
  const businessLabel = businessOptions.find(option => option.value === draft.business)?.label ?? t.common.unassigned;

  return <div className="space-y-4">
    <p className="text-sm text-slate-500 dark:text-slate-400">{t.budgets.modal.costHelp}</p>
    <div className="grid gap-4 sm:grid-cols-2">
      <label className="min-w-0">
        <span className={labelClass}>{t.budgets.modal.concept} *</span>
        <input autoFocus required value={draft.concept} onChange={event => onDraftChange({ concept: event.target.value, budgetName: event.target.value })} placeholder={t.expenses.modal.placeholderConcept} className={budgetWizardInputClass} />
      </label>
      <QuickProviderField label={t.budgets.modal.provider} emptyLabel={t.expenses.payableAccount.unassignedProvider} providers={providers} value={draft.providerId} onCreateProvider={onCreateProvider} onChange={providerId => onDraftChange({ providerId })} />
      <label className="min-w-0">
        <span className={labelClass}>{draft.taxEnabled && !draft.taxIncluded ? t.budgets.modal.beforeTaxAmount : t.budgets.modal.totalAmount} *</span>
        <input required type="number" min="0.01" step="0.01" inputMode="decimal" value={draft.amount} onChange={event => onDraftChange({ amount: event.target.value })} placeholder="0.00" className={budgetWizardInputClass} />
      </label>
      <BudgetWizardSelect label={t.expenses.modal.currency} value={draft.budgetCurrencyCode} options={financeCurrencySelectOptions} onChange={updateCurrency} t={t} />
    </div>
    <BudgetTaxControls presentation="choice" draft={draft} onDraftChange={onDraftChange} />
    <div>
      <span className={labelClass}>{t.budgets.modal.account} *</span>
      <ExpenseAccountSelect label={t.budgets.modal.account} value={draft.accountingAccount} options={accountingAccountOptions} onChange={accountingAccount => onDraftChange({ accountingAccount })} allowEmpty={false} />
    </div>
    <details className="group rounded-xl border border-slate-200 bg-slate-50/70 dark:border-slate-700 dark:bg-slate-900/40">
      <summary className="flex min-h-11 cursor-pointer list-none items-center gap-3 rounded-xl p-3 focus-visible:outline-2 focus-visible:outline-[#147514] [&::-webkit-details-marker]:hidden">
        <MapPin aria-hidden="true" className="h-5 w-5 shrink-0 text-[#147514] dark:text-emerald-300" />
        <span className="min-w-0 flex-1 text-sm text-slate-700 dark:text-slate-200"><span className="block text-xs text-slate-500 dark:text-slate-400">{t.budgets.modal.assignment}</span>{unitLabel} · {businessLabel}</span>
        <span className="text-sm font-medium text-[#147514] dark:text-emerald-300">{t.budgets.modal.changeAssignment}</span>
        <ChevronDown aria-hidden="true" className="h-4 w-4 shrink-0 text-slate-500 group-open:rotate-180" />
      </summary>
      <div className="grid gap-4 border-t border-slate-200 p-3 sm:grid-cols-2 dark:border-slate-700">
        <BudgetWizardSelect label={t.budgets.modal.unit} value={draft.businessUnit} options={unitOptions} onChange={businessUnit => onDraftChange({ businessUnit, business: '' })} t={t} />
        <BudgetWizardSelect label={t.budgets.modal.business} value={draft.business} options={businessOptions} onChange={business => onDraftChange({ business })} t={t} />
      </div>
    </details>
    <details open={draft.description ? true : undefined} className="group">
      <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 rounded-lg text-sm font-medium text-[#147514] focus-visible:outline-2 focus-visible:outline-[#147514] dark:text-emerald-300 [&::-webkit-details-marker]:hidden">
        <NotebookPen aria-hidden="true" className="h-4 w-4" />{t.budgets.modal.addNote}<ChevronDown aria-hidden="true" className="h-4 w-4 group-open:rotate-180" />
      </summary>
      <label>
        <span className="sr-only">{t.budgets.modal.description}</span>
        <textarea rows={2} value={draft.description} onChange={event => onDraftChange({ description: event.target.value, budgetDescription: event.target.value })} placeholder={t.budgets.modal.description} className={budgetWizardInputClass} />
      </label>
    </details>
  </div>;
}

export function BudgetWizardSelect({ label, value, options, onChange, t }: {
  label: string; value: string; options: Array<{ value: string; label: string }>;
  onChange: (value: string) => void; t: FinanceTranslations;
}) {
  return <label className="block min-w-0">
    <span className={labelClass}>{label} *</span>
    <select required value={value} onChange={event => onChange(event.target.value)} className={budgetWizardInputClass}>
      {(!value || !options.length) && <option value="">{options.length ? t.common.select : t.common.noOptions}</option>}
      {options.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
    </select>
  </label>;
}
