import { CalendarDays, Check, ChevronLeft, ChevronRight, FileText, Plus, ScanSearch } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react';
import { IndiceModalFrame, IndiceModalSummary, IndiceModalValidation, IndiceModalWizardStepper } from '../../../../components/indice-modal';
import { getDefaultBudgetTaxProfile, inferTaxCountryFromCurrency, taxRateToPercentInput } from '../../Budgets/budgetTaxCatalog';
import { budgetFrequencyOptions, getBudgetScheduleDates } from '../../Budgets/budgetUtils';
import { financeCurrencySelectOptions } from '../../constants/financeCurrencyOptions';
import type { BudgetDraftState } from '../../Budgets/budgetDraftState';
import type { FinanceReferenceOption } from '../../types/finance-reference.types';
import type { Provider } from '../../types/expenses.types';
import { formatCurrency } from '../../utils/expenses.utils';
import { BudgetTaxControls } from './BudgetTaxControls';
import { useBudgetsTranslations } from '../../Budgets/hooks/useBudgetsTranslations';
import type { FinanceTranslations } from '../../translations';
import { QuickProviderField } from './QuickProviderField';
import { financeModalPrimaryButtonClass, financeModalSecondaryButtonClass } from './FinanceModalPrimitives';

type BudgetCreateModalProps = {
  accountingAccountOptions: FinanceReferenceOption[];
  businessOptions: FinanceReferenceOption[];
  draft: BudgetDraftState;
  mode?: 'create' | 'edit';
  providers: Provider[];
  unitOptions: FinanceReferenceOption[];
  onClose: () => void;
  onCreateProvider?: (name: string) => Promise<Provider>;
  onDraftChange: (updates: Partial<BudgetDraftState>) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void | Promise<void>;
};

type BudgetStepId = 'cost' | 'schedule' | 'review';

const inputClass = 'h-11 w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm font-medium text-slate-900 shadow-none placeholder:text-slate-400 transition-colors focus:border-[#147514] focus:outline-none focus:ring-2 focus:ring-[#147514]/15 dark:border-slate-600 dark:bg-slate-900/70 dark:text-slate-100';

export function BudgetCreateModal({
  accountingAccountOptions,
  businessOptions,
  draft,
  mode = 'create',
  providers,
  unitOptions,
  onClose,
  onCreateProvider,
  onDraftChange,
  onSubmit,
}: BudgetCreateModalProps) {
  const t = useBudgetsTranslations();
  const [activeStepId, setActiveStepId] = useState<BudgetStepId>('cost');
  const [errorMessage, setErrorMessage] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const steps = useMemo<Array<{ id: BudgetStepId; label: string; icon: LucideIcon; title: string; description: string }>>(() => [
    { id: 'cost', label: t.budgets.modal.stepCost, icon: FileText, title: t.budgets.modal.titleCost, description: t.budgets.modal.subtitle },
    { id: 'schedule', label: t.budgets.modal.stepSchedule, icon: CalendarDays, title: t.budgets.modal.scheduleTitle, description: t.budgets.modal.scheduleDescription },
    { id: 'review', label: 'Revisión final', icon: ScanSearch, title: 'Revisa el presupuesto', description: 'Confirma el alcance, la programación y el total antes de guardar.' },
  ], [t]);
  const stepIndex = steps.findIndex(step => step.id === activeStepId);
  const currentStep = steps[Math.max(0, stepIndex)];
  const isEditMode = mode === 'edit';
  const isLastStep = activeStepId === 'review';
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
  const canContinue = activeStepId === 'cost' ? hasCostDetails : activeStepId === 'schedule' ? hasSchedule : hasCostDetails && hasSchedule;

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

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canContinue) return;
    if (!isLastStep) {
      setActiveStepId(activeStepId === 'cost' ? 'schedule' : 'review');
      return;
    }
    setIsSaving(true);
    setErrorMessage('');
    try {
      await onSubmit(event);
    } catch {
      setErrorMessage(isEditMode ? t.budgets.messages.lineSaveFailed : t.budgets.messages.createFailed);
    } finally {
      setIsSaving(false);
    }
  };

  const formId = `budget-form-${mode}`;
  const maxUnlockedIndex = !hasCostDetails ? 0 : !hasSchedule ? 1 : 2;
  return (
    <IndiceModalFrame
      busy={isSaving}
      closeLabel={t.columnModal.close}
      description={isEditMode ? t.budgets.modal.editSubtitle : t.budgets.modal.subtitle}
      footer={(
        <>
          <button type="button" onClick={onClose} disabled={isSaving} className={financeModalSecondaryButtonClass}>{t.common.cancel}</button>
          <button
            type="button"
            onClick={() => setActiveStepId(activeStepId === 'review' ? 'schedule' : 'cost')}
            disabled={activeStepId === 'cost' || isSaving}
            className={financeModalSecondaryButtonClass}
          >
            <ChevronLeft className="mr-2 inline h-4 w-4" />
            {t.budgets.modal.back}
          </button>
          <button type="submit" form={formId} disabled={!canContinue || isSaving} className={financeModalPrimaryButtonClass}>
            {isLastStep ? <Check className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            {isSaving ? 'Guardando…' : isLastStep ? (isEditMode ? t.budgets.modal.finishEdit : t.budgets.modal.finishCreate) : t.common.continue}
          </button>
        </>
      )}
      footerSummary={`${scheduleDates.length} ${scheduleDates.length === 1 ? 'fecha' : 'fechas'} · ${formatCurrency(plannedTotal, draft.budgetCurrencyCode)}`}
      icon={<Plus className="h-5 w-5" />}
      modalType="wizard"
      onOpenChange={(open) => !open && onClose()}
      open
      title={isEditMode ? t.budgets.modal.editTitle : t.budgets.modal.createTitle}
      tone="green"
    >
      <form id={formId} className="space-y-4" onSubmit={handleSubmit}>
        <IndiceModalWizardStepper
          accent="green"
          activeStepId={activeStepId}
          onStepSelect={(nextStepId) => {
            const nextIndex = steps.findIndex(step => step.id === nextStepId);
            if (nextIndex <= maxUnlockedIndex && !isSaving) setActiveStepId(nextStepId);
          }}
          progressLabel={t.budgets.modal.stepOf(stepIndex + 1, steps.length)}
          steps={steps.map(({ id, label }) => ({ id, label }))}
        />
        <IndiceModalValidation messages={errorMessage ? [errorMessage] : []} title="No se pudo guardar" />
        <StepCard description={currentStep.description} icon={currentStep.icon} title={currentStep.title}>
          {activeStepId === 'cost' ? (
            <BudgetCostStep
              accountingAccountOptions={accountingAccountOptions}
              businessOptions={scopedBusinessOptions}
              draft={draft}
              onCreateProvider={onCreateProvider}
              providers={providers}
              unitOptions={unitOptions}
              onDraftChange={onDraftChange}
              t={t}
            />
          ) : null}
          {activeStepId === 'schedule' ? (
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
          {activeStepId === 'review' ? (
            <IndiceModalSummary
              columns={4}
              description="El presupuesto está listo para guardarse. Puedes regresar a cualquier paso para corregirlo."
              items={[
                { label: t.budgets.modal.concept, value: draft.concept },
                { label: t.budgets.modal.frequency, value: t.budgets.frequencies[draft.frequency] ?? draft.frequency },
                { label: 'Fechas programadas', value: String(scheduleDates.length) },
                { emphasized: true, label: 'Total planeado', value: formatCurrency(plannedTotal, draft.budgetCurrencyCode) },
              ]}
              title="Resumen del presupuesto"
              variant="success"
            />
          ) : null}
        </StepCard>
      </form>
    </IndiceModalFrame>
  );
}

function BudgetCostStep({
  accountingAccountOptions,
  businessOptions,
  draft,
  onCreateProvider,
  providers,
  unitOptions,
  onDraftChange,
  t,
}: {
  accountingAccountOptions: FinanceReferenceOption[];
  businessOptions: FinanceReferenceOption[];
  draft: BudgetDraftState;
  onCreateProvider?: (name: string) => Promise<Provider>;
  providers: Provider[];
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
        <QuickProviderField
          emptyLabel={t.expenses.payableAccount.unassignedProvider}
          label={t.budgets.modal.provider}
          onChange={(providerId) => onDraftChange({ providerId })}
          onCreateProvider={onCreateProvider}
          providers={providers}
          value={draft.providerId}
        />
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
      <div className="rounded-lg border border-[#147514]/20 bg-[#147514]/5 p-4 dark:border-emerald-500/25 dark:bg-emerald-500/10">
        <p className="text-sm font-semibold text-slate-900 dark:text-white">{t.budgets.modal.scheduleSummary}</p>
        <div className="mt-3 grid gap-3 md:grid-cols-3">
          <SummaryMetric label={t.budgets.budgetLine} value={String(scheduleCount)} />
          <SummaryMetric label={t.budgets.columns.total.label} value={formatCurrency(totalPerOrder, currency)} />
          <SummaryMetric label={t.budgets.period} value={formatCurrency(plannedTotal, currency)} />
        </div>
        <p className="mt-3 text-xs font-semibold text-slate-500 dark:text-slate-400">
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
    <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800">
      <div className="mb-6 flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#147514]/10 text-[#147514] dark:bg-emerald-400/10 dark:text-emerald-300">
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
    <section className="rounded-lg border border-slate-200 bg-slate-50/70 p-4 dark:border-slate-700 dark:bg-slate-900/45">
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
    <div className="rounded-lg border border-white bg-white px-4 py-3 shadow-sm dark:border-slate-700 dark:bg-slate-900">
      <p className="text-xs font-medium text-slate-500 dark:text-slate-400">{label}</p>
      <p className="mt-1 text-base font-semibold text-[#147514] dark:text-emerald-300">{value}</p>
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
