import { CalendarDays, Check, ChevronLeft, ChevronRight, FileText, Plus, X } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react';
import { getDefaultBudgetTaxProfile, inferTaxCountryFromCurrency, taxRateToPercentInput } from '../../Budgets/budgetTaxCatalog';
import { budgetFrequencyOptions, getBudgetScheduleDates } from '../../Budgets/budgetUtils';
import { financeCurrencySelectOptions } from '../../constants/financeCurrencyOptions';
import type { BudgetDraftState } from '../../Budgets/budgetDraftState';
import type { FinanceReferenceOption } from '../../types/finance-reference.types';
import type { Provider } from '../../types/expenses.types';
import { formatCurrency } from '../../utils/expenses.utils';
import { BudgetTaxControls } from './BudgetTaxControls';
import { useFinanceTranslations } from '../../hooks/useFinanceTranslations';
import type { FinanceTranslations } from '../../translations';

type BudgetCreateModalProps = {
  accountingAccountOptions: FinanceReferenceOption[];
  businessOptions: FinanceReferenceOption[];
  draft: BudgetDraftState;
  mode?: 'create' | 'edit';
  providers: Provider[];
  unitOptions: FinanceReferenceOption[];
  onClose: () => void;
  onDraftChange: (updates: Partial<BudgetDraftState>) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
};

const inputClass = 'h-11 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-medium text-slate-900 shadow-none placeholder:text-slate-400 transition-colors focus:border-[#147514] focus:outline-none focus:ring-2 focus:ring-[#147514]/15 dark:border-slate-600 dark:bg-slate-900/70 dark:text-slate-100';

export function BudgetCreateModal({
  accountingAccountOptions,
  businessOptions,
  draft,
  mode = 'create',
  providers,
  unitOptions,
  onClose,
  onDraftChange,
  onSubmit,
}: BudgetCreateModalProps) {
  const t = useFinanceTranslations();
  const [stepIndex, setStepIndex] = useState(0);
  const steps = useMemo<Array<{ id: number; label: string; icon: LucideIcon; title: string; description: string }>>(() => [
    { id: 0, label: t.budgets.modal.stepCost, icon: FileText, title: t.budgets.modal.titleCost, description: t.budgets.modal.subtitle },
    { id: 1, label: t.budgets.modal.stepSchedule, icon: CalendarDays, title: t.budgets.modal.scheduleTitle, description: t.budgets.modal.scheduleDescription },
  ], [t]);
  const currentStep = steps[stepIndex];
  const isEditMode = mode === 'edit';
  const isLastStep = stepIndex === steps.length - 1;
  const progressPercentage = `${((stepIndex + 1) / steps.length) * 100}%`;
  const providerOptions = useMemo(() => providers.map(provider => ({ value: provider.id, label: provider.name })), [providers]);
  const scopedBusinessOptions = useMemo(() => (
    businessOptions.filter(option => !option.unitId || !draft.businessUnit || option.unitId === draft.businessUnit)
  ), [businessOptions, draft.businessUnit]);
  const scheduleDates = useMemo(() => (
    getBudgetScheduleDates(toDateValue(draft.budgetPeriodStart), toDateValue(draft.budgetPeriodEnd), draft.frequency)
  ), [draft.budgetPeriodEnd, draft.budgetPeriodStart, draft.frequency]);
  const amount = toMoneyNumber(draft.amount);
  const taxes = toMoneyNumber(draft.taxes);
  const totalPerOrder = draft.taxIncluded ? amount : amount + taxes;
  const plannedTotal = totalPerOrder * scheduleDates.length;
  const hasCostDetails = (
    draft.concept.trim().length > 0 &&
    amount > 0 &&
    draft.budgetCurrencyCode.trim().length > 0 &&
    draft.accountingAccount.trim().length > 0 &&
    draft.businessUnit.trim().length > 0 &&
    draft.business.trim().length > 0
  );
  const hasSchedule = (
    draft.budgetPeriodStart.trim().length > 0 &&
    draft.budgetPeriodEnd.trim().length > 0 &&
    draft.frequency.trim().length > 0 &&
    scheduleDates.length > 0
  );
  const canContinue = stepIndex === 0 ? hasCostDetails : hasSchedule;

  useEffect(() => {
    const updates: Partial<BudgetDraftState> = {};
    const hasValidUnit = unitOptions.some(option => option.value === draft.businessUnit);
    const hasValidBusiness = scopedBusinessOptions.some(option => option.value === draft.business);
    const hasValidAccount = accountingAccountOptions.some(option => option.value === draft.accountingAccount);

    if ((!draft.businessUnit || !hasValidUnit) && unitOptions[0]?.value) {
      updates.businessUnit = unitOptions[0].value;
    }
    if ((!draft.business || !hasValidBusiness) && scopedBusinessOptions[0]?.value) {
      updates.business = scopedBusinessOptions[0].value;
    }
    if ((!draft.accountingAccount || !hasValidAccount) && accountingAccountOptions[0]?.value) {
      updates.accountingAccount = accountingAccountOptions[0].value;
    }

    if (Object.keys(updates).length > 0) {
      onDraftChange(updates);
    }
  }, [accountingAccountOptions, draft.accountingAccount, draft.business, draft.businessUnit, onDraftChange, scopedBusinessOptions, unitOptions]);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canContinue) return;
    if (!isLastStep) {
      setStepIndex(current => current + 1);
      return;
    }
    onSubmit(event);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 px-4 py-6 backdrop-blur-sm" onClick={onClose}>
      <form onSubmit={handleSubmit} onClick={(event) => event.stopPropagation()} className="flex max-h-[calc(100vh-3rem)] w-full max-w-[900px] flex-col overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900">
        <div className="flex shrink-0 items-start justify-between gap-4 bg-[#147514] px-6 py-4 text-white dark:bg-[#0b3f1b]">
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white/15 text-white shadow-sm">
              <Plus className="h-5 w-5" />
            </span>
            <div>
              <div className="mb-1 inline-flex items-center rounded-full border border-white/25 bg-white px-3 py-1 text-xs font-semibold text-[#147514] shadow-sm">{t.budgets.modal.stepOf(stepIndex + 1, steps.length)}</div>
              <h3 className="text-xl font-bold text-white">{isEditMode ? t.budgets.modal.editTitle : t.budgets.modal.createTitle}</h3>
              <p className="mt-1 max-w-2xl text-sm leading-5 text-white/80">{isEditMode ? t.budgets.modal.editSubtitle : t.budgets.modal.subtitle}</p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/25 bg-white/10 text-white transition-colors hover:bg-white/20" aria-label={t.columnModal.close}>
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="shrink-0 border-b border-slate-200 bg-white px-6 py-4 dark:border-slate-700 dark:bg-slate-900">
          <p className="mb-3 text-xs font-semibold uppercase text-slate-500 dark:text-slate-400">{t.budgets.modal.stepOf(stepIndex + 1, steps.length)}</p>
          <div className="mb-4 h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
            <div className="h-full rounded-full bg-[#147514] transition-all duration-300 ease-out" style={{ width: progressPercentage }} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            {steps.map(step => {
              const StepIcon = step.icon;
              const isActive = stepIndex === step.id;
              const isCompleted = stepIndex > step.id;
              const canOpenStep = step.id <= stepIndex || (step.id === stepIndex + 1 && canContinue);
              return (
                <button
                  key={step.id}
                  type="button"
                  onClick={() => canOpenStep && setStepIndex(step.id)}
                  disabled={!canOpenStep}
                  className={`flex min-h-16 items-center gap-3 rounded-2xl border px-4 py-3 text-left text-sm font-semibold transition-all disabled:cursor-not-allowed disabled:opacity-60 ${isActive ? 'border-[#147514]/40 bg-[#147514]/10 text-[#147514] shadow-sm' : isCompleted ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-300' : 'border-slate-200 bg-slate-50 text-slate-500 hover:border-[#147514]/25 hover:bg-white hover:text-[#147514] dark:border-slate-700 dark:bg-slate-800/70 dark:text-slate-400'}`}
                >
                  <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold ${isActive ? 'bg-[#147514] text-white' : isCompleted ? 'bg-emerald-600 text-white' : 'border border-slate-300 bg-white text-slate-400 dark:border-slate-600 dark:bg-slate-900'}`}>
                    {isCompleted ? <Check className="h-4 w-4" /> : isActive ? '●' : '○'}
                  </span>
                  <span className="flex min-w-0 items-center gap-2">
                    <StepIcon className="h-4 w-4 shrink-0" />
                    <span className="truncate">{step.label}</span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto bg-slate-50/70 px-6 py-6 dark:bg-slate-950/40">
          <StepCard description={currentStep.description} icon={currentStep.icon} title={currentStep.title}>
            {stepIndex === 0 ? (
              <BudgetCostStep
                accountingAccountOptions={accountingAccountOptions}
                businessOptions={scopedBusinessOptions}
                draft={draft}
                providerOptions={providerOptions}
                unitOptions={unitOptions}
                onDraftChange={onDraftChange}
                t={t}
              />
            ) : null}
            {stepIndex === 1 ? (
              <BudgetScheduleStep
                draft={draft}
                plannedTotal={plannedTotal}
                scheduleCount={scheduleDates.length}
                totalPerOrder={totalPerOrder}
                currency={draft.budgetCurrencyCode}
                mode={mode}
                onDraftChange={onDraftChange}
                t={t}
              />
            ) : null}
          </StepCard>
        </div>

        <div className="flex shrink-0 flex-col gap-3 bg-[#147514] px-6 py-3 sm:flex-row sm:items-center sm:justify-between dark:bg-[#0b3f1b]">
          <button type="button" onClick={onClose} className="h-10 rounded-xl border border-white/30 bg-white/10 px-5 text-sm font-semibold text-white shadow-none transition hover:bg-white/20 hover:text-white">{t.common.cancel}</button>
          <div className="flex flex-wrap items-center gap-3 sm:justify-end">
            <button type="button" onClick={() => setStepIndex(current => Math.max(0, current - 1))} disabled={stepIndex === 0} className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-white/30 bg-white/10 px-5 text-sm font-semibold text-white shadow-none transition hover:bg-white/20 hover:text-white disabled:border-white/20 disabled:bg-white/5 disabled:text-white/50">
              <ChevronLeft className="h-4 w-4" />
              {t.budgets.modal.back}
            </button>
            <button type="submit" disabled={!canContinue} className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-white px-5 text-sm font-semibold text-[#147514] shadow-sm transition hover:bg-slate-100 hover:text-[#147514] disabled:cursor-not-allowed disabled:bg-white/40 disabled:text-[#147514]/50">
              {isLastStep ? <Check className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              {isLastStep ? (isEditMode ? t.budgets.modal.finishEdit : t.budgets.modal.finishCreate) : t.common.continue}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}

function BudgetCostStep({
  accountingAccountOptions,
  businessOptions,
  draft,
  providerOptions,
  unitOptions,
  onDraftChange,
  t,
}: {
  accountingAccountOptions: FinanceReferenceOption[];
  businessOptions: FinanceReferenceOption[];
  draft: BudgetDraftState;
  providerOptions: FinanceReferenceOption[];
  unitOptions: FinanceReferenceOption[];
  onDraftChange: (updates: Partial<BudgetDraftState>) => void;
  t: FinanceTranslations;
}) {
  const updateConcept = (concept: string) => onDraftChange({ budgetName: concept, concept });
  const updateCurrency = (budgetCurrencyCode: string) => {
    const taxCountry = inferTaxCountryFromCurrency(budgetCurrencyCode);
    const defaultTaxProfile = getDefaultBudgetTaxProfile(taxCountry);
    onDraftChange({
      budgetCurrencyCode,
      taxCountry,
      taxProfileId: defaultTaxProfile?.id ?? '',
      taxRate: defaultTaxProfile ? taxRateToPercentInput(defaultTaxProfile.rate) : '',
    });
  };

  return (
    <div className="space-y-4">
      <FieldGroup title={t.budgets.modal.fieldGroupCost}>
        <BudgetTextInput label={t.budgets.modal.concept} required value={draft.concept} onChange={updateConcept} placeholder={t.expenses.modal.placeholderConcept} />
        <BudgetSelect label={t.budgets.modal.provider} includeEmpty value={draft.providerId} onChange={(providerId) => onDraftChange({ providerId })} options={providerOptions} t={t} />
        <BudgetSelect label={t.budgets.modal.account} required value={draft.accountingAccount} onChange={(accountingAccount) => onDraftChange({ accountingAccount })} options={accountingAccountOptions} t={t} />
        <BudgetSelect label={t.expenses.modal.currency} required value={draft.budgetCurrencyCode} onChange={updateCurrency} options={financeCurrencySelectOptions} t={t} />
        <BudgetMoneyInput label={t.budgets.modal.amount} required value={draft.amount} onChange={(amount) => onDraftChange({ amount })} placeholder="0.00" />
        <BudgetTaxControls draft={draft} onDraftChange={onDraftChange} />
        <div className="md:col-span-2">
          <BudgetTextInput label={t.budgets.modal.description} value={draft.description} onChange={(description) => onDraftChange({ budgetDescription: description, description })} placeholder={t.budgets.modal.description} />
        </div>
      </FieldGroup>
      <FieldGroup title={t.budgets.modal.unit}>
        <BudgetSelect label={t.budgets.modal.unit} required value={draft.businessUnit} onChange={(businessUnit) => onDraftChange({ businessUnit, business: '' })} options={unitOptions} t={t} />
        <BudgetSelect label={t.budgets.modal.business} required value={draft.business} onChange={(business) => onDraftChange({ business })} options={businessOptions} t={t} />
      </FieldGroup>
    </div>
  );
}

function BudgetScheduleStep({
  currency,
  draft,
  mode,
  plannedTotal,
  scheduleCount,
  totalPerOrder,
  onDraftChange,
  t,
}: {
  currency: string;
  draft: BudgetDraftState;
  mode: 'create' | 'edit';
  plannedTotal: number;
  scheduleCount: number;
  totalPerOrder: number;
  onDraftChange: (updates: Partial<BudgetDraftState>) => void;
  t: FinanceTranslations;
}) {
  return (
    <div className="space-y-4">
      <FieldGroup title={t.budgets.modal.fieldGroupPeriod}>
        <BudgetDateInput label={t.budgets.modal.periodStart} required value={draft.budgetPeriodStart} onChange={(budgetPeriodStart) => onDraftChange({ budgetPeriodStart, startDate: budgetPeriodStart })} />
        <BudgetDateInput label={t.budgets.modal.periodEnd} required value={draft.budgetPeriodEnd} onChange={(budgetPeriodEnd) => onDraftChange({ budgetPeriodEnd })} />
        <BudgetSelect
          label={t.budgets.modal.frequency}
          required
          value={draft.frequency}
          onChange={(frequency) => onDraftChange({ frequency: frequency as BudgetDraftState['frequency'] })}
          options={budgetFrequencyOptions.map(option => ({ ...option, label: t.budgets.frequencies[option.value] ?? option.label }))}
          t={t}
        />
      </FieldGroup>
      <div className="rounded-[22px] border border-[#147514]/20 bg-[#147514]/5 p-4">
        <p className="text-sm font-extrabold text-slate-900">{t.budgets.modal.scheduleSummary}</p>
        <div className="mt-3 grid gap-3 md:grid-cols-3">
          <SummaryMetric label={t.budgets.budgetLine} value={String(scheduleCount)} />
          <SummaryMetric label={t.budgets.columns.total.label} value={formatCurrency(totalPerOrder, currency)} />
          <SummaryMetric label={t.budgets.period} value={formatCurrency(plannedTotal, currency)} />
        </div>
        <p className="mt-3 text-xs font-semibold text-slate-500">
          {scheduleCount > 0
            ? (mode === 'edit' ? t.budgets.modal.editSubtitle : t.budgets.modal.scheduleDescription)
            : t.budgets.modal.scheduleEmpty}
        </p>
      </div>
    </div>
  );
}

function StepCard({ children, description, icon: Icon, title }: { children: ReactNode; description: string; icon: LucideIcon; title: string }) {
  return (
    <div className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800">
      <div className="mb-6 flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#147514]/10 text-[#147514]">
          <Icon className="h-5 w-5" />
        </span>
        <div>
          <h3 className="text-base font-bold text-slate-950 dark:text-white">{title}</h3>
          <p className="mt-1 text-sm leading-6 text-slate-500 dark:text-slate-400">{description}</p>
        </div>
      </div>
      {children}
    </div>
  );
}

function FieldGroup({ children, title }: { children: ReactNode; title: string }) {
  return (
    <section className="rounded-[22px] border border-slate-200 bg-slate-50/70 p-4 dark:border-slate-700 dark:bg-slate-900/45">
      <h4 className="mb-4 text-sm font-bold text-slate-950 dark:text-white">{title}</h4>
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">{children}</div>
    </section>
  );
}

function FieldLabel({ label, required }: { label: string; required?: boolean }) {
  return <span className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-200">{label}{required ? ' *' : ''}</span>;
}

function BudgetTextInput({ label, onChange, placeholder, required, value }: { label: string; onChange: (value: string) => void; placeholder?: string; required?: boolean; value: string }) {
  return (
    <label>
      <FieldLabel label={label} required={required} />
      <input required={required} value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} className={inputClass} />
    </label>
  );
}

function BudgetMoneyInput({ label, onChange, placeholder, required, value }: { label: string; onChange: (value: string) => void; placeholder?: string; required?: boolean; value: string }) {
  return (
    <label>
      <FieldLabel label={label} required={required} />
      <input required={required} min={required ? 0.01 : 0} step="0.01" type="number" value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} className={inputClass} />
    </label>
  );
}

function BudgetDateInput({ label, onChange, required, value }: { label: string; onChange: (value: string) => void; required?: boolean; value: string }) {
  return (
    <label>
      <FieldLabel label={label} required={required} />
      <input required={required} type="date" value={value} onChange={(event) => onChange(event.target.value)} className={inputClass} />
    </label>
  );
}

function BudgetSelect({
  includeEmpty,
  label,
  onChange,
  options,
  required,
  t,
  value,
}: {
  includeEmpty?: boolean;
  label: string;
  onChange: (value: string) => void;
  options: Array<string | { value: string; label: string }>;
  required?: boolean;
  value: string;
  t: FinanceTranslations;
}) {
  return (
    <label>
      <FieldLabel label={label} required={required} />
      <select required={required} value={value} onChange={(event) => onChange(event.target.value)} className={inputClass}>
        {(includeEmpty || !required || value === '' || options.length === 0) && <option value="">{options.length === 0 ? t.common.noOptions : t.common.select}</option>}
        {options.map(option => {
          const optionValue = typeof option === 'string' ? option : option.value;
          const labelText = typeof option === 'string' ? option : option.label;
          return <option key={optionValue} value={optionValue}>{labelText}</option>;
        })}
      </select>
    </label>
  );
}

function SummaryMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white bg-white px-4 py-3 shadow-sm">
      <p className="text-xs font-bold uppercase text-slate-500">{label}</p>
      <p className="mt-1 text-base font-extrabold text-[#147514]">{value}</p>
    </div>
  );
}

function toMoneyNumber(value: string) {
  const parsedValue = Number(value.replace(/,/g, '').trim());
  return Number.isFinite(parsedValue) ? parsedValue : 0;
}

function toDateValue(value: string) {
  return value ? new Date(`${value}T00:00:00`) : new Date('');
}
