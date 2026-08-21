import { useEffect, useId, useState, type Dispatch, type FormEvent, type SetStateAction } from 'react';
import {
  CalendarDays,
  CalendarPlus,
  Check,
  ChevronLeft,
  ChevronRight,
  Info,
  Plus,
  Save,
  Trash2,
} from 'lucide-react';
import { Button } from '../../../../components/ui/button';
import {
  IndiceModalFrame,
  IndiceModalSummary,
  IndiceModalValidation,
  IndiceModalWizardStepper,
  type IndiceModalWizardStep,
} from '../../../../components/indice-modal';
import { Input } from '../../../../components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../../../components/ui/select';
import { Switch } from '../../../../components/ui/switch';
import { Textarea } from '../../../../components/ui/textarea';
import { cn } from '../../../../components/ui/utils';
import {
  accentButtonClass,
  frequencyOptions,
  isRecurrenceConfigValid,
  monthDayOptions,
  normalizeRecurrenceConfig,
  priorityOptions,
  weekdayOptions,
} from '../processesData';
import { defaultProcessesTranslations, type ProcessesTranslations } from '../translations';
import { collaboratorCanReceiveAssignment as canCollaboratorReceiveAssignment } from '../../shared/assignmentScope';
import type {
  ProcessBusinessOption,
  ProcessCollaboratorOption,
  ProcessFormState,
  ProcessUnitOption,
  Weekday,
} from '../types';

interface ProcessFormDialogProps {
  businessOptions: ProcessBusinessOption[];
  collaboratorOptions: ProcessCollaboratorOption[];
  copy?: ProcessesTranslations;
  error?: string | null;
  form: ProcessFormState;
  isSubmitting?: boolean;
  locale?: string;
  mode: 'create' | 'edit';
  onOpenChange: (open: boolean) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  open: boolean;
  setForm: Dispatch<SetStateAction<ProcessFormState>>;
  unitOptions: ProcessUnitOption[];
}

type ProcessWizardStep = 'identity' | 'template' | 'schedule' | 'review';

interface SelectFieldProps<T extends string> {
  label: string;
  onChange: (value: T) => void;
  options: Array<{ label: string; value: T }>;
  value: T;
}

function SelectField<T extends string>({
  label,
  onChange,
  options,
  value,
}: SelectFieldProps<T>) {
  const fieldId = useId();

  return (
    <div className="space-y-2">
      <label id={`${fieldId}-label`} className="text-sm font-medium text-slate-700 dark:text-slate-200">{label}</label>
      <Select value={value} onValueChange={(nextValue) => onChange(nextValue as T)}>
        <SelectTrigger aria-labelledby={`${fieldId}-label`} className="h-10 rounded-xl border-slate-200 bg-white text-slate-900 shadow-none dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function RecurrenceChip({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        'inline-flex items-center justify-center rounded-xl border px-3 py-2 text-sm font-medium transition-colors',
        active
          ? 'border-[#F4C84A] bg-[#F4C84A]/15 text-[#9A6B05] dark:border-[#F4C84A]/70 dark:bg-[#F4C84A]/20 dark:text-amber-200'
          : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600',
      )}
    >
      {active ? <Check className="mr-2 h-3.5 w-3.5" /> : null}
      {label}
    </button>
  );
}

function formatConfiguredDate(date: string, locale: string) {
  return new Intl.DateTimeFormat(locale, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(`${date}T00:00:00`));
}

const NONE_VALUE = '__none__';

function entityValue(prefix: string, id: number) {
  return `${prefix}:${id}`;
}

function legacyValue(prefix: string, label: string) {
  return `${prefix}:legacy:${label}`;
}

function normalizeText(value?: string | null) {
  return value?.trim().toLowerCase() ?? '';
}

export function ProcessFormDialog({
  businessOptions,
  collaboratorOptions,
  copy = defaultProcessesTranslations,
  error,
  form,
  isSubmitting = false,
  locale = 'en-CA',
  mode,
  onOpenChange,
  onSubmit,
  open,
  setForm,
  unitOptions,
}: ProcessFormDialogProps) {
  const [activeStep, setActiveStep] = useState<ProcessWizardStep>('identity');
  const [specificDateDraft, setSpecificDateDraft] = useState('');

  useEffect(() => {
    setActiveStep('identity');
    setSpecificDateDraft('');
  }, [open]);

  const selectedUnitValue =
    form.unitId != null
      ? entityValue('unit', form.unitId)
      : form.unit
        ? legacyValue('unit', form.unit)
        : NONE_VALUE;
  const unitSelectOptions = [
    { value: NONE_VALUE, label: copy.common.noUnit },
    ...unitOptions.map((option) => ({
      value: entityValue('unit', option.id),
      label: option.name,
    })),
  ];
  if (form.unitId != null && !unitOptions.some((option) => option.id === form.unitId)) {
    unitSelectOptions.push({
      value: entityValue('unit', form.unitId),
      label: `${form.unit || `${copy.form.labels.unit} #${form.unitId}`} (${copy.common.backup})`,
    });
  }
  if (
    form.unit &&
    form.unitId == null &&
    !unitOptions.some((option) => normalizeText(option.name) === normalizeText(form.unit))
  ) {
    unitSelectOptions.push({ value: legacyValue('unit', form.unit), label: `${form.unit} (${copy.common.backup})` });
  }

  const selectedBusinessValue =
    form.businessId != null
      ? entityValue('business', form.businessId)
      : form.business
        ? legacyValue('business', form.business)
        : NONE_VALUE;
  const filteredBusinessOptions =
    form.unitId != null
      ? businessOptions.filter((option) => option.unitId == null || option.unitId === form.unitId)
      : businessOptions;
  const businessSelectOptions = [
    { value: NONE_VALUE, label: copy.common.noBusiness },
    ...filteredBusinessOptions.map((option) => ({
      value: entityValue('business', option.id),
      label: option.name,
    })),
  ];
  if (form.businessId != null && !filteredBusinessOptions.some((option) => option.id === form.businessId)) {
    businessSelectOptions.push({
      value: entityValue('business', form.businessId),
      label: `${form.business || `${copy.form.labels.business} #${form.businessId}`} (${copy.common.backup})`,
    });
  }
  if (
    form.business &&
    form.businessId == null &&
    !businessOptions.some((option) => normalizeText(option.name) === normalizeText(form.business))
  ) {
    businessSelectOptions.push({
      value: legacyValue('business', form.business),
      label: `${form.business} (${copy.common.backup})`,
    });
  }

  const selectedResponsibleValue =
    form.responsibleUserCompanyId != null
      ? entityValue('user-company', form.responsibleUserCompanyId)
      : form.responsible
        ? legacyValue('responsible', form.responsible)
        : NONE_VALUE;
  const scopedCollaboratorOptions = collaboratorOptions.filter((option) =>
    canCollaboratorReceiveAssignment(option, form.unitId, form.businessId, businessOptions),
  );
  const collaboratorSelectOptions = [
    { value: NONE_VALUE, label: copy.common.unassigned },
    ...scopedCollaboratorOptions.map((option) => ({
      value: entityValue('user-company', option.userCompanyId),
      label: option.email ? `${option.name} · ${option.email}` : option.name,
    })),
  ];
  if (
    form.responsibleUserCompanyId != null &&
    !scopedCollaboratorOptions.some((option) => option.userCompanyId === form.responsibleUserCompanyId)
  ) {
    collaboratorSelectOptions.push({
      value: entityValue('user-company', form.responsibleUserCompanyId),
      label: `${form.responsible || `${copy.form.labels.responsible} #${form.responsibleUserCompanyId}`} (${copy.common.backup})`,
    });
  }
  if (
    form.responsible &&
    form.responsibleUserCompanyId == null &&
    !scopedCollaboratorOptions.some((option) => normalizeText(option.name) === normalizeText(form.responsible))
  ) {
    collaboratorSelectOptions.push({
      value: legacyValue('responsible', form.responsible),
      label: `${form.responsible} (${copy.common.backup})`,
    });
  }

  const updateUnit = (value: string) => {
    setForm((currentForm) => {
      if (value === NONE_VALUE) {
        return {
          ...currentForm,
          unitId: null,
          unit: '',
          businessId: null,
          business: '',
        };
      }

      const unitId = Number(value.replace('unit:', ''));
      const selectedUnit = unitOptions.find((option) => option.id === unitId);
      if (!selectedUnit) {
        return currentForm;
      }

      const currentBusiness = businessOptions.find((option) => option.id === currentForm.businessId);
      const businessBelongsToUnit =
        !currentBusiness || currentBusiness.unitId == null || currentBusiness.unitId === selectedUnit.id;
      const nextBusinessId = businessBelongsToUnit ? currentForm.businessId : null;
      const currentResponsible = collaboratorOptions.find(
        (option) => option.userCompanyId === currentForm.responsibleUserCompanyId,
      );
      const responsibleBelongsToScope =
        !currentResponsible ||
        canCollaboratorReceiveAssignment(currentResponsible, selectedUnit.id, nextBusinessId, businessOptions);

      return {
        ...currentForm,
        unitId: selectedUnit.id,
        unit: selectedUnit.name,
        businessId: nextBusinessId,
        business: businessBelongsToUnit ? currentForm.business : '',
        responsibleUserCompanyId: responsibleBelongsToScope ? currentForm.responsibleUserCompanyId : null,
        responsible: responsibleBelongsToScope ? currentForm.responsible : '',
      };
    });
  };

  const updateBusiness = (value: string) => {
    setForm((currentForm) => {
      if (value === NONE_VALUE) {
        return {
          ...currentForm,
          businessId: null,
          business: '',
        };
      }

      const businessId = Number(value.replace('business:', ''));
      const selectedBusiness = businessOptions.find((option) => option.id === businessId);
      if (!selectedBusiness) {
        return currentForm;
      }

      const owningUnit = selectedBusiness.unitId
        ? unitOptions.find((option) => option.id === selectedBusiness.unitId)
        : null;
      const nextUnitId = owningUnit?.id ?? currentForm.unitId ?? null;
      const currentResponsible = collaboratorOptions.find(
        (option) => option.userCompanyId === currentForm.responsibleUserCompanyId,
      );
      const responsibleBelongsToScope =
        !currentResponsible ||
        canCollaboratorReceiveAssignment(
          currentResponsible,
          nextUnitId,
          selectedBusiness.id,
          businessOptions,
        );

      return {
        ...currentForm,
        businessId: selectedBusiness.id,
        business: selectedBusiness.name,
        unitId: nextUnitId,
        unit: owningUnit?.name ?? currentForm.unit,
        responsibleUserCompanyId: responsibleBelongsToScope ? currentForm.responsibleUserCompanyId : null,
        responsible: responsibleBelongsToScope ? currentForm.responsible : '',
      };
    });
  };

  const updateResponsible = (value: string) => {
    setForm((currentForm) => {
      if (value === NONE_VALUE) {
        return {
          ...currentForm,
          responsibleUserCompanyId: null,
          responsible: '',
        };
      }

      const userCompanyId = Number(value.replace('user-company:', ''));
      const selectedCollaborator = collaboratorOptions.find(
        (option) => option.userCompanyId === userCompanyId,
      );
      if (!selectedCollaborator) {
        return currentForm;
      }

      return {
        ...currentForm,
        responsibleUserCompanyId: selectedCollaborator.userCompanyId,
        responsible: selectedCollaborator.name,
      };
    });
  };

  const title = copy.form.titles[mode];
  const description = copy.form.descriptions[mode];
  const submitLabel = copy.form.submit[mode];
  const localizedFrequencyOptions = frequencyOptions.map((option) => ({
    value: option.value,
    label: copy.frequencies[option.value],
  }));
  const localizedPriorityOptions = priorityOptions.map((option) => ({
    value: option.value,
    label: copy.priorities[option.value],
  }));
  const localizedWeekdayOptions = weekdayOptions.map((option) => ({
    value: option.value,
    label: copy.weekdays[option.value],
  }));
  const isIdentityValid = Boolean(form.title.trim()) && Boolean(form.description.trim());
  const hasValidDateRange = !form.startDate || !form.endDate || form.startDate <= form.endDate;
  const isScheduleValid =
    hasValidDateRange &&
    isRecurrenceConfigValid(form.frequency, form.recurrence);
  const isFormValid =
    Boolean(form.title.trim()) &&
    Boolean(form.description.trim()) &&
    isScheduleValid;
  const wizardSteps: readonly IndiceModalWizardStep<ProcessWizardStep>[] = [
    { id: 'identity', label: copy.form.labels.title },
    { id: 'template', label: copy.form.sections.taskTemplate },
    { id: 'schedule', label: copy.form.sections.schedule },
    { id: 'review', label: submitLabel },
  ];
  const activeStepIndex = wizardSteps.findIndex((step) => step.id === activeStep);
  const canContinue = activeStep === 'identity' ? isIdentityValid : activeStep === 'schedule' ? isScheduleValid : true;
  const previousLabel = copy.common.previous;
  const continueLabel = copy.common.continue;

  const updateFrequency = (frequency: ProcessFormState['frequency']) => {
    setForm((currentForm) => ({
      ...currentForm,
      frequency,
      recurrence: normalizeRecurrenceConfig(frequency, currentForm.recurrence),
    }));
  };

  const toggleBiWeeklyDay = (day: Weekday) => {
    setForm((currentForm) => {
      const biWeeklyDays = currentForm.recurrence.biWeeklyDays.includes(day)
        ? currentForm.recurrence.biWeeklyDays.filter((currentDay) => currentDay !== day)
        : [...currentForm.recurrence.biWeeklyDays, day];

      return {
        ...currentForm,
        recurrence: normalizeRecurrenceConfig(currentForm.frequency, {
          ...currentForm.recurrence,
          biWeeklyDays,
        }),
      };
    });
  };

  const toggleMonthlyDay = (day: number) => {
    setForm((currentForm) => {
      const monthlyDays = currentForm.recurrence.monthlyDays.includes(day)
        ? currentForm.recurrence.monthlyDays.filter((currentDay) => currentDay !== day)
        : [...currentForm.recurrence.monthlyDays, day];

      return {
        ...currentForm,
        recurrence: normalizeRecurrenceConfig(currentForm.frequency, {
          ...currentForm.recurrence,
          monthlyDays,
        }),
      };
    });
  };

  const addSpecificDate = () => {
    if (!specificDateDraft) {
      return;
    }

    setForm((currentForm) => ({
      ...currentForm,
      recurrence: normalizeRecurrenceConfig(currentForm.frequency, {
        ...currentForm.recurrence,
        specificDates: [...currentForm.recurrence.specificDates, specificDateDraft],
      }),
    }));
    setSpecificDateDraft('');
  };

  const removeSpecificDate = (date: string) => {
    setForm((currentForm) => ({
      ...currentForm,
      recurrence: normalizeRecurrenceConfig(currentForm.frequency, {
        ...currentForm.recurrence,
        specificDates: currentForm.recurrence.specificDates.filter((currentDate) => currentDate !== date),
      }),
    }));
  };

  const renderRecurrenceConfiguration = () => {
    switch (form.frequency) {
      case 'daily':
        return (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm leading-6 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/50 dark:text-emerald-300">
            {copy.form.recurrence.daily}
          </div>
        );
      case 'weekly':
        return (
          <div className="space-y-4">
            <div className="space-y-1">
              <h4 className="text-sm font-medium text-slate-900 dark:text-white">{copy.form.recurrence.weeklyTitle}</h4>
              <p className="text-sm text-slate-600 dark:text-slate-300">
                {copy.form.recurrence.weeklyDescription}
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 xl:grid-cols-7">
              {localizedWeekdayOptions.map((option) => (
                <RecurrenceChip
                  key={option.value}
                  label={option.label}
                  active={form.recurrence.weeklyDay === option.value}
                  onClick={() =>
                    setForm((currentForm) => ({
                      ...currentForm,
                      recurrence: {
                        ...currentForm.recurrence,
                        weeklyDay: option.value,
                      },
                    }))
                  }
                />
              ))}
            </div>
          </div>
        );
      case 'bi-weekly':
        return (
          <div className="space-y-5">
            <div className="space-y-1">
              <h4 className="text-sm font-medium text-slate-900 dark:text-white">{copy.form.recurrence.biWeeklyTitle}</h4>
              <p className="text-sm text-slate-600 dark:text-slate-300">
                {copy.form.recurrence.biWeeklyDescription}
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 xl:grid-cols-7">
              {localizedWeekdayOptions.map((option) => (
                <RecurrenceChip
                  key={option.value}
                  label={option.label}
                  active={form.recurrence.biWeeklyDays.includes(option.value)}
                  onClick={() => toggleBiWeeklyDay(option.value)}
                />
              ))}
            </div>
            <div className="max-w-xs space-y-2">
              <label htmlFor="process-biweekly-reference" className="text-sm font-medium text-slate-700 dark:text-slate-200">
                {copy.form.labels.referenceDate}
              </label>
              <Input
                id="process-biweekly-reference"
                type="date"
                value={form.recurrence.biWeeklyAnchorDate}
                onChange={(event) =>
                  setForm((currentForm) => ({
                    ...currentForm,
                    recurrence: {
                      ...currentForm.recurrence,
                      biWeeklyAnchorDate: event.target.value,
                    },
                  }))
                }
                className="h-10 rounded-xl border-slate-200 bg-white text-slate-900 shadow-none dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100"
              />
            </div>
          </div>
        );
      case 'monthly':
        return (
          <div className="space-y-4">
            <div className="space-y-1">
              <h4 className="text-sm font-medium text-slate-900 dark:text-white">{copy.form.recurrence.monthlyTitle}</h4>
              <p className="text-sm text-slate-600 dark:text-slate-300">
                {copy.form.recurrence.monthlyDescription}
              </p>
            </div>
            <div className="grid grid-cols-4 gap-2 sm:grid-cols-7 xl:grid-cols-8">
              {monthDayOptions.map((day) => (
                <RecurrenceChip
                  key={day}
                  label={String(day)}
                  active={form.recurrence.monthlyDays.includes(day)}
                  onClick={() => toggleMonthlyDay(day)}
                />
              ))}
            </div>
          </div>
        );
      case 'specific-dates':
        return (
          <div className="space-y-4">
            <div className="space-y-1">
              <h4 className="text-sm font-medium text-slate-900 dark:text-white">{copy.form.recurrence.specificDatesTitle}</h4>
              <p className="text-sm text-slate-600 dark:text-slate-300">
                {copy.form.recurrence.specificDatesDescription}
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Input
                type="date"
                value={specificDateDraft}
                onChange={(event) => setSpecificDateDraft(event.target.value)}
                className="h-10 rounded-xl border-slate-200 bg-white text-slate-900 shadow-none dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100"
              />
              <Button
                type="button"
                onClick={addSpecificDate}
                disabled={!specificDateDraft}
                className={`h-10 rounded-xl px-4 text-sm font-medium ${accentButtonClass}`}
              >
                <CalendarPlus className="mr-2 h-4 w-4" />
                {copy.form.recurrence.addDate}
              </Button>
            </div>
            {form.recurrence.specificDates.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {form.recurrence.specificDates.map((date) => (
                  <div
                    key={date}
                    className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm font-medium text-slate-700 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100"
                  >
                    <span>{formatConfiguredDate(date, locale)}</span>
                    <button
                      type="button"
                      onClick={() => removeSpecificDate(date)}
                      className="rounded-full p-1 text-slate-500 transition-colors hover:bg-slate-200 hover:text-red-600 dark:text-slate-300 dark:hover:bg-slate-600 dark:hover:text-red-300"
                      aria-label={copy.form.recurrence.removeDate(date)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-500 dark:border-slate-600 dark:bg-slate-900/60 dark:text-slate-400">
                {copy.form.recurrence.emptyDates}
              </div>
            )}
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <IndiceModalFrame
      busy={isSubmitting}
      closeLabel={copy.common.close}
      description={description}
      footer={(
        <>
          <Button type="button" variant="outline" disabled={isSubmitting} onClick={() => onOpenChange(false)}>
            {copy.common.cancel}
          </Button>
          {activeStepIndex > 0 ? (
            <Button type="button" variant="outline" disabled={isSubmitting} onClick={() => setActiveStep(wizardSteps[activeStepIndex - 1].id)}>
              <ChevronLeft className="h-4 w-4" />
              {previousLabel}
            </Button>
          ) : null}
          {activeStep !== 'review' ? (
            <Button
              type="button"
              disabled={!canContinue || isSubmitting}
              onClick={() => setActiveStep(wizardSteps[activeStepIndex + 1].id)}
            >
              {continueLabel}
              <ChevronRight className="h-4 w-4" />
            </Button>
          ) : (
            <Button
              type="submit"
              form="process-wizard-form"
              disabled={!isFormValid || isSubmitting}
            >
              {mode === 'create' ? <Plus className="h-4 w-4" /> : <Save className="h-4 w-4" />}
              {isSubmitting ? copy.common.saving : submitLabel}
            </Button>
          )}
        </>
      )}
      footerSummary={`${activeStepIndex + 1} / ${wizardSteps.length}`}
      icon={mode === 'create' ? <Plus className="h-5 w-5" /> : <Save className="h-5 w-5" />}
      modalType="wizard"
      onOpenChange={onOpenChange}
      open={open}
      title={title}
      tone="yellow"
    >
      <form id="process-wizard-form" onSubmit={onSubmit} className="space-y-6">
            <IndiceModalWizardStepper
              accent="yellow"
              activeStepId={activeStep}
              progressLabel={title}
              steps={wizardSteps}
            />
            <IndiceModalValidation messages={error ? [error] : []} />
            {activeStep === 'schedule' && !hasValidDateRange ? (
              <IndiceModalValidation messages={[`${copy.form.labels.end}: ${copy.form.labels.start}`]} />
            ) : null}
            {activeStep === 'identity' ? (
            <div className="space-y-3">
              <div className="inline-flex items-center gap-2 rounded-full bg-amber-50 px-3 py-1.5 text-xs font-medium text-amber-700 dark:bg-amber-950/50 dark:text-amber-300">
                <Info className="h-3.5 w-3.5" />
                {copy.common.requiredFields}
              </div>
            </div>
            ) : null}

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className={cn('space-y-2', activeStep !== 'identity' && 'hidden')}>
                <label id="process-unit-label" className="text-sm font-medium text-slate-700 dark:text-slate-200">{copy.form.labels.unit}</label>
                <Select value={selectedUnitValue} onValueChange={updateUnit}>
                  <SelectTrigger aria-labelledby="process-unit-label" className="h-10 rounded-xl border-slate-200 bg-white text-slate-900 shadow-none dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100">
                    <SelectValue placeholder={copy.form.placeholders.unit} />
                  </SelectTrigger>
                  <SelectContent>
                    {unitSelectOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className={cn('space-y-2', activeStep !== 'identity' && 'hidden')}>
                <label id="process-business-label" className="text-sm font-medium text-slate-700 dark:text-slate-200">{copy.form.labels.business}</label>
                <Select value={selectedBusinessValue} onValueChange={updateBusiness}>
                  <SelectTrigger aria-labelledby="process-business-label" className="h-10 rounded-xl border-slate-200 bg-white text-slate-900 shadow-none dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100">
                    <SelectValue placeholder={copy.form.placeholders.business} />
                  </SelectTrigger>
                  <SelectContent>
                    {businessSelectOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className={cn('space-y-2 md:col-span-2', activeStep !== 'identity' && 'hidden')}>
                <label htmlFor="process-title" className="text-sm font-medium text-slate-700 dark:text-slate-200">{copy.form.labels.title}</label>
                <Input
                  id="process-title"
                  value={form.title}
                  onChange={(event) =>
                    setForm((currentForm) => ({
                      ...currentForm,
                      title: event.target.value,
                    }))
                  }
                  placeholder={copy.form.placeholders.title}
                  className="h-10 rounded-xl border-slate-200 bg-white text-slate-900 shadow-none dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 dark:placeholder:text-slate-400"
                />
              </div>
              <div className={cn('space-y-2 md:col-span-2', activeStep !== 'identity' && 'hidden')}>
                <label htmlFor="process-description" className="text-sm font-medium text-slate-700 dark:text-slate-200">{copy.form.labels.description}</label>
                <Textarea
                  id="process-description"
                  value={form.description}
                  onChange={(event) =>
                    setForm((currentForm) => ({
                      ...currentForm,
                      description: event.target.value,
                    }))
                  }
                  placeholder={copy.form.placeholders.description}
                  className="min-h-[140px] rounded-2xl border-slate-200 bg-white px-4 py-3 text-base leading-6 text-slate-700 shadow-none dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 dark:placeholder:text-slate-400"
                />
              </div>

              <div className={cn('space-y-4 rounded-[24px] border border-slate-200 bg-slate-50/70 px-4 py-4 dark:border-slate-700 dark:bg-slate-900/40 md:col-span-2', activeStep !== 'template' && 'hidden')}>
                <div>
                  <h3 className="text-sm font-medium text-slate-900 dark:text-white">{copy.form.sections.taskTemplate}</h3>
                  <p className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-300">
                    {copy.form.sections.taskTemplateDescription}
                  </p>
                </div>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="space-y-2 md:col-span-2">
                    <label htmlFor="process-task-title" className="text-sm font-medium text-slate-700 dark:text-slate-200">
                      {copy.form.labels.taskTitle}
                    </label>
                    <Input
                      id="process-task-title"
                      value={form.taskTitleTemplate}
                      onChange={(event) =>
                        setForm((currentForm) => ({
                          ...currentForm,
                          taskTitleTemplate: event.target.value,
                        }))
                      }
                      placeholder={copy.form.placeholders.taskTitle}
                      className="h-10 rounded-xl border-slate-200 bg-white text-slate-900 shadow-none dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 dark:placeholder:text-slate-400"
                    />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <label htmlFor="process-task-description" className="text-sm font-medium text-slate-700 dark:text-slate-200">
                      {copy.form.labels.taskDescription}
                    </label>
                    <Textarea
                      id="process-task-description"
                      value={form.taskDescriptionTemplate}
                      onChange={(event) =>
                        setForm((currentForm) => ({
                          ...currentForm,
                          taskDescriptionTemplate: event.target.value,
                        }))
                      }
                      placeholder={copy.form.placeholders.taskDescription}
                      className="min-h-[96px] rounded-2xl border-slate-200 bg-white px-4 py-3 text-base leading-6 text-slate-700 shadow-none dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 dark:placeholder:text-slate-400"
                    />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <label htmlFor="process-task-notes" className="text-sm font-medium text-slate-700 dark:text-slate-200">
                      {copy.form.labels.taskNotes}
                    </label>
                    <Textarea
                      id="process-task-notes"
                      value={form.taskNotesTemplate}
                      onChange={(event) =>
                        setForm((currentForm) => ({
                          ...currentForm,
                          taskNotesTemplate: event.target.value,
                        }))
                      }
                      placeholder={copy.form.placeholders.taskNotes}
                      className="min-h-[80px] rounded-2xl border-slate-200 bg-white px-4 py-3 text-base leading-6 text-slate-700 shadow-none dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 dark:placeholder:text-slate-400"
                    />
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-white px-4 py-4 dark:border-slate-700 dark:bg-slate-800 md:col-span-2">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="text-sm font-medium text-slate-800 dark:text-slate-100">
                          {copy.form.sections.evidenceRequired}
                        </p>
                        <p className="mt-1 text-sm leading-6 text-slate-500 dark:text-slate-400">
                          {copy.form.sections.evidenceDescription}
                        </p>
                      </div>
                      <Switch
                        aria-label={copy.form.sections.evidenceRequired}
                        checked={form.evidenceRequired}
                        onCheckedChange={(checked) =>
                          setForm((currentForm) => ({
                            ...currentForm,
                            evidenceRequired: checked,
                          }))
                        }
                        className="data-[state=checked]:bg-[#F4C84A]"
                      />
                    </div>
                  </div>
                </div>
              </div>
              <div className={activeStep !== 'schedule' ? 'hidden' : undefined}>
                <SelectField
                  label={copy.form.labels.frequency}
                  value={form.frequency}
                  onChange={updateFrequency}
                  options={localizedFrequencyOptions}
                />
              </div>
              <div className={cn('space-y-2', activeStep !== 'identity' && 'hidden')}>
                <label id="process-responsible-label" className="text-sm font-medium text-slate-700 dark:text-slate-200">{copy.form.labels.responsible}</label>
                <Select value={selectedResponsibleValue} onValueChange={updateResponsible}>
                  <SelectTrigger aria-labelledby="process-responsible-label" className="h-10 rounded-xl border-slate-200 bg-white text-slate-900 shadow-none dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100">
                    <SelectValue placeholder={copy.form.placeholders.responsible} />
                  </SelectTrigger>
                  <SelectContent>
                    {collaboratorSelectOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className={activeStep !== 'identity' ? 'hidden' : undefined}>
                <SelectField
                  label={copy.form.labels.priority}
                  value={form.priority}
                  onChange={(value) => setForm((currentForm) => ({ ...currentForm, priority: value }))}
                  options={localizedPriorityOptions}
                />
              </div>

              <div className={cn('space-y-4 rounded-[24px] border border-slate-200 bg-slate-50/70 px-4 py-4 dark:border-slate-700 dark:bg-slate-900/40 md:col-span-2', activeStep !== 'schedule' && 'hidden')}>
                <div>
                  <h3 className="text-sm font-medium text-slate-900 dark:text-white">{copy.form.sections.engineControl}</h3>
                  <p className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-300">
                    {copy.form.sections.engineDescription}
                  </p>
                </div>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <label htmlFor="process-start" className="text-sm font-medium text-slate-700 dark:text-slate-200">{copy.form.labels.start}</label>
                    <Input
                      id="process-start"
                      type="date"
                      value={form.startDate}
                      max={form.endDate || undefined}
                      onChange={(event) =>
                        setForm((currentForm) => ({
                          ...currentForm,
                          startDate: event.target.value,
                          endDate:
                            currentForm.endDate && event.target.value && currentForm.endDate < event.target.value
                              ? event.target.value
                              : currentForm.endDate,
                        }))
                      }
                      className="h-10 rounded-xl border-slate-200 bg-white text-slate-900 shadow-none dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100"
                    />
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="process-end" className="text-sm font-medium text-slate-700 dark:text-slate-200">{copy.form.labels.end}</label>
                    <Input
                      id="process-end"
                      type="date"
                      value={form.endDate}
                      min={form.startDate || undefined}
                      onChange={(event) =>
                        setForm((currentForm) => ({
                          ...currentForm,
                          endDate: event.target.value,
                        }))
                      }
                      className="h-10 rounded-xl border-slate-200 bg-white text-slate-900 shadow-none dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className={cn('space-y-4 rounded-[28px] border border-slate-200 bg-slate-50/70 px-5 py-5 dark:border-slate-700 dark:bg-slate-900/40', activeStep !== 'schedule' && 'hidden')}>
              <div className="flex items-start gap-3">
                <div className="mt-0.5 rounded-2xl bg-[#F4C84A]/15 p-2 text-[#9A6B05] dark:bg-[#F4C84A]/20 dark:text-amber-200">
                  <CalendarDays className="h-4 w-4" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-sm font-medium text-slate-900 dark:text-white">{copy.form.sections.schedule}</h3>
                  <p className="text-sm leading-6 text-slate-600 dark:text-slate-300">
                    {copy.form.sections.scheduleDescription(copy.frequencies[form.frequency])}
                  </p>
                </div>
              </div>
              {renderRecurrenceConfiguration()}
              {form.frequency === 'weekly' ? (
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                  {copy.form.recurrence.selectedDay(copy.weekdays[form.recurrence.weeklyDay])}
                </p>
              ) : null}
            </div>

            {activeStep === 'review' ? (
              <div className="space-y-5">
                <IndiceModalSummary
                  columns={2}
                  title={title}
                  description={form.description}
                  items={[
                    { label: copy.form.labels.title, value: form.title, emphasized: true },
                    { label: copy.form.labels.frequency, value: copy.frequencies[form.frequency] },
                    { label: copy.form.labels.unit, value: form.unit || copy.common.noUnit },
                    { label: copy.form.labels.business, value: form.business || copy.common.noBusiness },
                    { label: copy.form.labels.responsible, value: form.responsible || copy.common.unassigned },
                    { label: copy.form.labels.priority, value: copy.priorities[form.priority] },
                    { label: copy.form.labels.start, value: form.startDate || copy.common.noDate },
                    { label: copy.form.labels.end, value: form.endDate || copy.common.noDate },
                  ]}
                  variant="accent"
                />
                <IndiceModalSummary
                  columns={2}
                  title={copy.form.sections.taskTemplate}
                  items={[
                    { label: copy.form.labels.taskTitle, value: form.taskTitleTemplate || form.title },
                    { label: copy.form.sections.evidenceRequired, value: form.evidenceRequired ? 'Sí' : 'No' },
                  ]}
                />
              </div>
            ) : null}
      </form>
    </IndiceModalFrame>
  );
}
