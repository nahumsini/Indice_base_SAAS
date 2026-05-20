import { useEffect, useState, type Dispatch, type FormEvent, type SetStateAction } from 'react';
import {
  CalendarDays,
  CalendarPlus,
  Check,
  Info,
  Plus,
  Save,
  Trash2,
  X,
} from 'lucide-react';
import { Button } from '../../../../components/ui/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogTitle,
} from '../../../../components/ui/dialog';
import { Input } from '../../../../components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../../../components/ui/select';
import { Textarea } from '../../../../components/ui/textarea';
import { cn } from '../../../../components/ui/utils';
import {
  accentButtonClass,
  frequencyOptions,
  isRecurrenceConfigValid,
  monthDayOptions,
  normalizeRecurrenceConfig,
  priorityOptions,
  weekdayLabels,
  weekdayOptions,
} from '../processesData';
import type { ProcessFormState, Weekday } from '../types';

interface ProcessFormDialogProps {
  businessOptions: string[];
  collaboratorOptions: string[];
  form: ProcessFormState;
  mode: 'create' | 'edit';
  onOpenChange: (open: boolean) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  open: boolean;
  setForm: Dispatch<SetStateAction<ProcessFormState>>;
  unitOptions: string[];
}

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
  return (
    <div className="space-y-2">
      <label className="text-sm font-semibold text-slate-700 dark:text-slate-200">{label}</label>
      <Select value={value} onValueChange={(nextValue) => onChange(nextValue as T)}>
        <SelectTrigger className="h-11 rounded-xl border-slate-200 bg-white text-slate-900 shadow-none dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100">
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
      onClick={onClick}
      className={cn(
        'inline-flex items-center justify-center rounded-xl border px-3 py-2 text-sm font-semibold transition-colors',
        active
          ? 'border-[rgb(235,165,52)] bg-[rgb(235,165,52)]/15 text-[rgb(181,111,10)] dark:border-[rgb(235,165,52)]/70 dark:bg-[rgb(235,165,52)]/20 dark:text-amber-200'
          : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600',
      )}
    >
      {active ? <Check className="mr-2 h-3.5 w-3.5" /> : null}
      {label}
    </button>
  );
}

function formatConfiguredDate(date: string) {
  return new Intl.DateTimeFormat('en-US', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(`${date}T00:00:00`));
}

export function ProcessFormDialog({
  businessOptions,
  collaboratorOptions,
  form,
  mode,
  onOpenChange,
  onSubmit,
  open,
  setForm,
  unitOptions,
}: ProcessFormDialogProps) {
  const [specificDateDraft, setSpecificDateDraft] = useState('');

  useEffect(() => {
    if (!open) {
      setSpecificDateDraft('');
    }
  }, [open]);

  const title = mode === 'create' ? 'Add recurring process' : 'Edit recurring process';
  const description =
    mode === 'create'
      ? 'Create a recurring process so tasks can be generated and assigned into each collaborator calendar.'
      : 'Update the process configuration, owner, and frequency without changing the module shell.';
  const submitLabel = mode === 'create' ? 'Create process' : 'Save changes';
  const isFormValid =
    Boolean(form.title.trim()) &&
    Boolean(form.description.trim()) &&
    isRecurrenceConfigValid(form.frequency, form.recurrence);

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
            The process will create tasks every day for the assigned collaborator.
          </div>
        );
      case 'weekly':
        return (
          <div className="space-y-4">
            <div className="space-y-1">
              <h4 className="text-sm font-semibold text-slate-900 dark:text-white">Weekly setup</h4>
              <p className="text-sm text-slate-600 dark:text-slate-300">
                Choose the weekday when the recurring process should appear in the collaborator calendar.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 xl:grid-cols-7">
              {weekdayOptions.map((option) => (
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
              <h4 className="text-sm font-semibold text-slate-900 dark:text-white">Bi-weekly setup</h4>
              <p className="text-sm text-slate-600 dark:text-slate-300">
                Choose the weekday or weekdays and the reference date used to repeat the process every two weeks.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 xl:grid-cols-7">
              {weekdayOptions.map((option) => (
                <RecurrenceChip
                  key={option.value}
                  label={option.label}
                  active={form.recurrence.biWeeklyDays.includes(option.value)}
                  onClick={() => toggleBiWeeklyDay(option.value)}
                />
              ))}
            </div>
            <div className="max-w-xs space-y-2">
              <label className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                Reference start date
              </label>
              <Input
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
                className="h-11 rounded-xl border-slate-200 bg-white text-slate-900 shadow-none dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100"
              />
            </div>
          </div>
        );
      case 'monthly':
        return (
          <div className="space-y-4">
            <div className="space-y-1">
              <h4 className="text-sm font-semibold text-slate-900 dark:text-white">Monthly setup</h4>
              <p className="text-sm text-slate-600 dark:text-slate-300">
                Choose the day or days of the month when the process should be generated.
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
              <h4 className="text-sm font-semibold text-slate-900 dark:text-white">Specific dates setup</h4>
              <p className="text-sm text-slate-600 dark:text-slate-300">
                Add the exact dates when the process should create tasks in the collaborator calendar.
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Input
                type="date"
                value={specificDateDraft}
                onChange={(event) => setSpecificDateDraft(event.target.value)}
                className="h-11 rounded-xl border-slate-200 bg-white text-slate-900 shadow-none dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100"
              />
              <Button
                type="button"
                onClick={addSpecificDate}
                disabled={!specificDateDraft}
                className={`h-11 rounded-xl px-4 text-sm font-semibold ${accentButtonClass}`}
              >
                <CalendarPlus className="mr-2 h-4 w-4" />
                Add date
              </Button>
            </div>
            {form.recurrence.specificDates.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {form.recurrence.specificDates.map((date) => (
                  <div
                    key={date}
                    className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm font-medium text-slate-700 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100"
                  >
                    <span>{formatConfiguredDate(date)}</span>
                    <button
                      type="button"
                      onClick={() => removeSpecificDate(date)}
                      className="rounded-full p-1 text-slate-500 transition-colors hover:bg-slate-200 hover:text-red-600 dark:text-slate-300 dark:hover:bg-slate-600 dark:hover:text-red-300"
                      aria-label={`Remove ${date}`}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-500 dark:border-slate-600 dark:bg-slate-900/60 dark:text-slate-400">
                Add at least one date to enable this process schedule.
              </div>
            )}
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="!flex h-[min(88vh,860px)] max-h-[calc(100vh-3rem)] max-w-[860px] flex-col gap-0 overflow-hidden rounded-[32px] border border-slate-200/80 bg-white p-0 shadow-[0_30px_80px_rgba(15,23,42,0.22)] dark:border-slate-700 dark:bg-slate-800 [&>button]:hidden">
        <div className="shrink-0 bg-[rgb(235,165,52)] px-6 py-4">
          <div className="flex items-center justify-between gap-4">
            <div className="pr-4">
              <DialogTitle className="flex items-center gap-2 text-[1.2rem] font-bold leading-tight text-white sm:text-[1.4rem]">
                {mode === 'create' ? <Plus className="h-5 w-5" /> : <Save className="h-5 w-5" />}
                {title}
              </DialogTitle>
            </div>
            <DialogClose asChild>
              <button
                type="button"
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl border border-white/70 bg-white/10 text-white shadow-sm transition-colors hover:bg-white/20"
              >
                <X className="h-4 w-4" />
              </button>
            </DialogClose>
          </div>
        </div>

        <form onSubmit={onSubmit} className="flex min-h-0 flex-1 flex-col">
          <div className="space-y-6 overflow-y-auto px-6 py-5">
            <div className="space-y-3">
              <DialogDescription className="max-w-3xl text-sm leading-6 text-slate-600 dark:text-slate-400">
                {description}
              </DialogDescription>
              <div className="inline-flex items-center gap-2 rounded-full bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-700 dark:bg-amber-950/50 dark:text-amber-300">
                <Info className="h-3.5 w-3.5" />
                Fields marked with * are required.
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <SelectField
                label="Unit"
                value={form.unit}
                onChange={(value) => setForm((currentForm) => ({ ...currentForm, unit: value }))}
                options={unitOptions.map((option) => ({
                  label: option,
                  value: option,
                }))}
              />
              <SelectField
                label="Business"
                value={form.business}
                onChange={(value) => setForm((currentForm) => ({ ...currentForm, business: value }))}
                options={businessOptions.map((option) => ({
                  label: option,
                  value: option,
                }))}
              />
              <div className="space-y-2 md:col-span-2">
                <label className="text-sm font-semibold text-slate-700 dark:text-slate-200">Title *</label>
                <Input
                  value={form.title}
                  onChange={(event) =>
                    setForm((currentForm) => ({
                      ...currentForm,
                      title: event.target.value,
                    }))
                  }
                  placeholder="Enter the recurring process title"
                  className="h-11 rounded-xl border-slate-200 bg-white text-slate-900 shadow-none dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 dark:placeholder:text-slate-400"
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <label className="text-sm font-semibold text-slate-700 dark:text-slate-200">Description *</label>
                <Textarea
                  value={form.description}
                  onChange={(event) =>
                    setForm((currentForm) => ({
                      ...currentForm,
                      description: event.target.value,
                    }))
                  }
                  placeholder="Describe how the recurring work should appear in each collaborator calendar"
                  className="min-h-[140px] rounded-2xl border-slate-200 bg-white px-4 py-3 text-base leading-6 text-slate-700 shadow-none dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 dark:placeholder:text-slate-400"
                />
              </div>
              <SelectField
                label="Frequency"
                value={form.frequency}
                onChange={updateFrequency}
                options={frequencyOptions}
              />
              <SelectField
                label="Responsible"
                value={form.responsible}
                onChange={(value) => setForm((currentForm) => ({ ...currentForm, responsible: value }))}
                options={collaboratorOptions.map((option) => ({
                  label: option,
                  value: option,
                }))}
              />
              <SelectField
                label="Priority"
                value={form.priority}
                onChange={(value) => setForm((currentForm) => ({ ...currentForm, priority: value }))}
                options={priorityOptions}
              />
            </div>

            <div className="space-y-4 rounded-[28px] border border-slate-200 bg-slate-50/70 px-5 py-5 dark:border-slate-700 dark:bg-slate-900/40">
              <div className="flex items-start gap-3">
                <div className="mt-0.5 rounded-2xl bg-[rgb(235,165,52)]/15 p-2 text-[rgb(181,111,10)] dark:bg-[rgb(235,165,52)]/20 dark:text-amber-200">
                  <CalendarDays className="h-4 w-4" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Process schedule</h3>
                  <p className="text-sm leading-6 text-slate-600 dark:text-slate-300">
                    Configure how the recurring process should be generated when{' '}
                    <span className="font-semibold">{form.frequency.replace('-', ' ')}</span> is selected.
                  </p>
                </div>
              </div>
              {renderRecurrenceConfiguration()}
              {form.frequency === 'weekly' ? (
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                  Selected day: {weekdayLabels[form.recurrence.weeklyDay]}
                </p>
              ) : null}
            </div>
          </div>

          <DialogFooter className="sticky bottom-0 z-10 shrink-0 border-t border-slate-200/80 bg-white px-6 py-4 dark:border-slate-700 dark:bg-slate-800">
            <DialogClose asChild>
              <Button
                type="button"
                variant="outline"
                className="h-10 rounded-xl border-slate-200 bg-white px-4 text-sm font-semibold shadow-none dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100"
              >
                Cancel
              </Button>
            </DialogClose>
            <Button
              type="submit"
              className={`h-10 rounded-xl px-4 text-sm font-semibold ${accentButtonClass}`}
              disabled={!isFormValid}
            >
              {mode === 'create' ? <Plus className="mr-2 h-4 w-4" /> : <Save className="mr-2 h-4 w-4" />}
              {submitLabel}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
