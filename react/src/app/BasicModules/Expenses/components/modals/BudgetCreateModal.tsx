import { Check, ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { useEffect, useMemo, useState, useRef, type FormEvent } from 'react';
import { IndiceModalFrame, IndiceModalValidation, IndiceModalWizardStepper } from '../../../../components/indice-modal';
import { getBudgetScheduleDates } from '../../Budgets/budgetUtils';
import type { BudgetDraftState } from '../../Budgets/budgetDraftState';
import type { FinanceReferenceOption } from '../../types/finance-reference.types';
import type { Provider } from '../../types/expenses.types';
import { formatBudgetCurrency } from '../../Budgets/budgetFormatting';
import { BudgetWizardCostStep } from './BudgetWizardCostStep';
import { BudgetWizardScheduleStep, BudgetWizardReview } from './BudgetWizardSchedule';
import { useBudgetsResolvedLocale, useBudgetsTranslations } from '../../Budgets/hooks/useBudgetsTranslations';
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
  const locale = useBudgetsResolvedLocale();
  const [activeStepId, setActiveStepId] = useState<BudgetStepId>('cost');
  const [errorMessage, setErrorMessage] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const bodyRef = useRef<HTMLDivElement>(null);
  const savingRef = useRef(false);
  const steps = useMemo<Array<{ id: BudgetStepId; label: string }>>(() => [
    { id: 'cost', label: t.budgets.modal.stepCost },
    { id: 'schedule', label: t.budgets.modal.stepSchedule },
    { id: 'review', label: t.budgets.modal.reviewStep },
  ], [t]);
  const stepIndex = steps.findIndex(step => step.id === activeStepId);
  useEffect(() => {
    if (bodyRef.current) bodyRef.current.scrollTop = 0;
    if (activeStepId === 'review') bodyRef.current?.querySelector<HTMLElement>('h3[tabindex]')?.focus();
  }, [activeStepId]);
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
    if (!canContinue || savingRef.current) return;
    if (!isLastStep) {
      setActiveStepId(activeStepId === 'cost' ? 'schedule' : 'review');
      return;
    }
    savingRef.current = true;
    setIsSaving(true);
    setErrorMessage('');
    try {
      await onSubmit(event);
    } catch {
      setErrorMessage(isEditMode ? t.budgets.messages.lineSaveFailed : t.budgets.messages.createFailed);
    } finally {
      savingRef.current = false;
      setIsSaving(false);
    }
  };

  const missingCostFields = [
    !draft.concept.trim() && t.budgets.modal.concept,
    !(amount > 0) && t.budgets.modal.totalAmount,
    !draft.budgetCurrencyCode.trim() && t.expenses.modal.currency,
    !draft.accountingAccount.trim() && t.budgets.modal.account,
    !draft.businessUnit.trim() && t.budgets.modal.unit,
    !draft.business.trim() && t.budgets.modal.business,
  ].filter(Boolean).join(', ');
  const stepHelp = activeStepId === 'cost' && !hasCostDetails
    ? t.budgets.modal.completeFields(missingCostFields)
    : activeStepId === 'schedule' && !hasSchedule ? t.budgets.modal.scheduleEmpty : '';
  const visibleDates = isEditMode ? scheduleDates.slice(0, 1) : scheduleDates;
  const visibleTotal = isEditMode ? totalPerOrder : plannedTotal;
  const footerSummary = activeStepId === 'cost'
    ? `${t.budgets.modal.perOccurrence} · ${formatBudgetCurrency(totalPerOrder, draft.budgetCurrencyCode, locale)}`
    : `${t.budgets.modal.scheduleDates(visibleDates.length)} · ${formatBudgetCurrency(visibleTotal, draft.budgetCurrencyCode, locale)}`;
  const formId = `budget-form-${mode}`;
  const maxUnlockedIndex = !hasCostDetails ? 0 : !hasSchedule ? 1 : 2;
  return (
    <IndiceModalFrame
      busy={isSaving}
      bodyRef={bodyRef}
      closeLabel={t.columnModal.close}
      description={isEditMode ? t.budgets.modal.editSubtitle : t.budgets.modal.subtitle}
      footerLeading={<button type="button" onClick={onClose} disabled={isSaving} className={financeModalSecondaryButtonClass}>{t.common.cancel}</button>}
      footer={(
        <>
          {activeStepId !== 'cost' && <button
            type="button"
            onClick={() => setActiveStepId(activeStepId === 'review' ? 'schedule' : 'cost')}
            disabled={isSaving}
            className={financeModalSecondaryButtonClass}
          >
            <ChevronLeft className="mr-2 inline h-4 w-4" />
            {t.budgets.modal.back}
          </button>}
          <button type="submit" form={formId} aria-describedby={stepHelp ? 'budget-step-help' : undefined} disabled={!canContinue || isSaving} className={financeModalPrimaryButtonClass}>
            {isLastStep ? <Check className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            {isSaving ? t.budgets.modal.saving : isLastStep ? (isEditMode ? t.budgets.modal.finishEdit : t.budgets.modal.finishCreate) : t.common.continue}
          </button>
        </>
      )}
      footerSummary={footerSummary}
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
        <IndiceModalValidation messages={errorMessage ? [errorMessage] : []} title={t.budgets.modal.validationTitle} />
        <fieldset disabled={isSaving} className="min-w-0 space-y-4 rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 dark:border-slate-700 dark:bg-slate-800/50">
          <legend className="sr-only">{steps[stepIndex].label}</legend>
          {activeStepId === 'cost' ? (
            <BudgetWizardCostStep
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
            <BudgetWizardScheduleStep
              draft={draft}
              plannedTotal={visibleTotal}
              dates={visibleDates}
              locale={locale}
              totalPerOrder={totalPerOrder}
              mode={mode}
              onDraftChange={onDraftChange}
              t={t}
            />
          ) : null}
          {activeStepId === 'review' ? (
            <BudgetWizardReview draft={draft} dates={visibleDates} totalPerOrder={totalPerOrder} plannedTotal={visibleTotal}
              mode={mode} locale={locale} t={t} accountingAccountOptions={accountingAccountOptions}
              businessOptions={businessOptions} unitOptions={unitOptions} providers={providers} onEdit={setActiveStepId} />
          ) : null}
          {stepHelp && <p id="budget-step-help" role="status" className="text-sm text-slate-500 dark:text-slate-400">{stepHelp}</p>}
        </fieldset>
      </form>
    </IndiceModalFrame>
  );
}

function toMoneyNumber(value: string) {
  const parsedValue = Number(value.replace(/,/g, '').trim());
  return Number.isFinite(parsedValue) ? parsedValue : 0;
}

function toDateValue(value: string) {
  return value ? new Date(`${value}T00:00:00`) : new Date('');
}
