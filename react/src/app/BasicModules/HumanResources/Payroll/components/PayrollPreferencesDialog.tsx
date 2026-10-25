import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, Check, Globe2, Info, Landmark, LoaderCircle, MapPinned, Pencil, Save, Settings, ShieldCheck } from 'lucide-react';
import type { PayrollPreferences } from '../../../../api/humanResources';
import { IndiceModalFrame, IndiceModalSummary, IndiceModalValidation, IndiceModalWizardStepper } from '../../../../components/indice-modal';
import { Button } from '../../../../components/ui/button';
import type { PayrollTranslations } from '../translations';
import { PayrollPreferencesCalendar } from './PayrollPreferencesCalendar';

type Step = 'organization' | 'calendar' | 'review';
type Props = {
  copy: PayrollTranslations;
  isOpen: boolean;
  isSaving: boolean;
  error?: string;
  form: PayrollPreferences;
  onClose: () => void;
  onChange: (value: PayrollPreferences) => void;
  onSave: () => void;
};

export function PayrollPreferencesDialog({ copy, isOpen, isSaving, error, form, onClose, onChange, onSave }: Props) {
  const text = copy.preferencesDialog;
  const review = text.review;
  const [step, setStep] = useState<Step>('organization');
  const [validation, setValidation] = useState('');
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const initialForm = useRef(form);
  const bodyRef = useRef<HTMLDivElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const options = [
    { id: 'single', Icon: Globe2, ...text.groupingOptions.single },
    { id: 'unit', Icon: MapPinned, ...text.groupingOptions.unit },
    { id: 'business', Icon: Landmark, ...text.groupingOptions.business },
  ] as const;
  const steps = [
    { id: 'organization', label: text.steps.organization },
    { id: 'calendar', label: review.calendarStep },
    { id: 'review', label: review.reviewStep },
  ] as const;
  const index = steps.findIndex(item => item.id === step);
  const selected = options.find(option => option.id === form.grouping_mode);
  const hasChanges = JSON.stringify(initialForm.current) !== JSON.stringify(form);
  const startDay = text.weekDays.find(day => day.value === form.weekly_start_day)?.label ?? '—';
  const endDay = text.weekDays.find(day => day.value === ((form.weekly_start_day + 5) % 7) + 1)?.label ?? '—';

  useEffect(() => {
    if (!isOpen || confirmDiscard) return;
    const frame = requestAnimationFrame(() => {
      bodyRef.current?.scrollTo({ top: 0 });
      headingRef.current?.focus({ preventScroll: true });
    });
    return () => cancelAnimationFrame(frame);
  }, [step, isOpen, confirmDiscard]);

  const validOrganization = () => {
    if (selected) return true;
    setStep('organization');
    setValidation(review.invalidOrganization);
    return false;
  };
  const validCalendar = () => {
    const inRange = (value: number, min: number, max: number) => Number.isInteger(value) && value >= min && value <= max;
    if (inRange(form.weekly_start_day, 1, 7) && inRange(form.biweekly_first_day, 1, 27)
      && inRange(form.biweekly_second_day, 2, 28) && form.biweekly_second_day > form.biweekly_first_day
      && inRange(form.monthly_start_day, 1, 31)) return true;
    setStep('calendar');
    setValidation(review.invalidCalendar);
    return false;
  };
  const navigate = (next: Step) => {
    if (isSaving) return;
    setValidation('');
    if (next !== 'organization' && !validOrganization()) return;
    if (next === 'review' && !validCalendar()) return;
    setStep(next);
  };
  const requestClose = () => {
    if (isSaving) return;
    if (hasChanges) setConfirmDiscard(true);
    else onClose();
  };
  const save = () => {
    if (isSaving || step !== 'review') return;
    setValidation('');
    if (validOrganization() && validCalendar()) onSave();
  };

  if (confirmDiscard) return (
    <IndiceModalFrame open={isOpen} onOpenChange={open => { if (!open) setConfirmDiscard(false); }} modalType="confirmation" tone="aqua"
      icon={<Settings className="h-5 w-5" />} title={review.discardTitle} description={review.discardDescription} closeLabel={copy.labels.close}
      footerLeading={<Button type="button" variant="outline" onClick={() => setConfirmDiscard(false)}>{review.keepEditing}</Button>}
      footer={<Button type="button" data-modal-destructive="true" onClick={onClose}>{review.discard}</Button>}>
      <p className="p-5 text-sm text-slate-600 dark:text-slate-300">{selected?.title} · {startDay} · {form.biweekly_first_day} / {form.biweekly_second_day} · {form.monthly_start_day}</p>
    </IndiceModalFrame>
  );

  return (
    <IndiceModalFrame open={isOpen} onOpenChange={open => { if (!open) requestClose(); }} modalType="wizard" tone="aqua" busy={isSaving}
      icon={<Settings className="h-5 w-5" />} title={copy.labels.preferences} description={text.subtitle} closeLabel={copy.labels.close}
      contentClassName="max-h-[92dvh]" bodyClassName="p-0" bodyRef={bodyRef}
      footerLeading={<Button type="button" variant="outline" onClick={requestClose} disabled={isSaving}>{copy.labels.cancel}</Button>}
      footerSummary={`${index + 1} / ${steps.length} · ${steps[index].label}`}
      footer={<>
        {index > 0 ? <Button type="button" variant="outline" onClick={() => navigate(steps[index - 1].id)} disabled={isSaving}><ArrowLeft className="h-4 w-4" />{text.previous}</Button> : null}
        {step === 'review' ? <Button type="button" aria-label={isSaving ? text.saving : copy.labels.savePreferences} onClick={save} disabled={isSaving}>{isSaving ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}{isSaving ? text.saving : copy.labels.save}</Button>
          : <Button type="button" onClick={() => navigate(steps[index + 1].id)} disabled={isSaving}>{text.next}<ArrowRight className="h-4 w-4" /></Button>}
      </>}>
      <div className="space-y-5 bg-slate-50 p-4 sm:p-5 dark:bg-slate-950">
        <IndiceModalWizardStepper accent="aqua" density="compact" activeStepId={step} steps={steps} progressLabel={`${index + 1} / ${steps.length} · ${steps[index].label}`} onStepSelect={isSaving ? undefined : navigate} />
        <IndiceModalValidation messages={[validation, error].filter((message): message is string => Boolean(message))} />
        <div>
          <h3 ref={headingRef} tabIndex={-1} className="text-lg font-medium text-slate-900 outline-none dark:text-white">{step === 'organization' ? text.organizationTitle : step === 'calendar' ? text.calendarTitle : review.reviewTitle}</h3>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{step === 'organization' ? text.organizationSubtitle : step === 'calendar' ? text.calendarSubtitle : review.reviewSubtitle}</p>
        </div>
        <fieldset disabled={isSaving} className="min-w-0 space-y-4">
          <legend className="sr-only">{steps[index].label}</legend>
          {step === 'organization' ? <>
            <div className="grid gap-3 md:grid-cols-3">
              {options.map(({ id, title, description, Icon }) => (
                <label key={id} className={`relative flex cursor-pointer flex-col gap-3 rounded-2xl border p-4 transition focus-within:ring-2 focus-within:ring-[#269C82] ${form.grouping_mode === id ? 'border-[#59C3A5] bg-[#59C3A5]/10' : 'border-slate-200 bg-white hover:border-[#59C3A5] dark:border-slate-700 dark:bg-slate-900'}`}>
                  <input type="radio" className="absolute inset-0 h-full w-full cursor-pointer opacity-0 disabled:cursor-not-allowed" name="payroll-organization" value={id} checked={form.grouping_mode === id} onChange={() => onChange({ ...form, grouping_mode: id })} aria-label={title} />
                  <span className="flex items-center justify-between gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#59C3A5]/15 text-[#177D66] dark:text-[#B8F2E3]"><Icon className="h-5 w-5" /></span><span aria-hidden="true" className={`flex h-6 w-6 items-center justify-center rounded-full border ${form.grouping_mode === id ? 'border-[#269C82] bg-[#269C82] text-white' : 'border-slate-300 dark:border-slate-600'}`}>{form.grouping_mode === id ? <Check className="h-4 w-4" /> : null}</span></span>
                  <span className="text-base font-medium text-slate-900 dark:text-white">{title}</span>
                  <span className="text-sm leading-6 text-slate-600 dark:text-slate-300">{description}</span>
                </label>
              ))}
            </div>
            {selected ? <div className="rounded-xl border border-[#59C3A5]/25 bg-[#59C3A5]/5 p-3 text-xs text-slate-600 dark:text-slate-300"><p className="mb-2 font-medium text-[#177D66] dark:text-[#B8F2E3]">{review.exampleLabel} · {selected.title}</p><div className="flex flex-wrap gap-2">{selected.examples.map(example => <span key={example} className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 dark:border-slate-700 dark:bg-slate-900">{example}</span>)}</div></div> : null}
          </> : null}
          {step === 'calendar' ? <>
            <PayrollPreferencesCalendar copy={copy} form={form} onChange={onChange} />
            <div className="flex items-start gap-2 rounded-xl border border-[#59C3A5]/25 bg-[#59C3A5]/5 p-3 text-sm text-[#177D66] dark:text-[#B8F2E3]"><Info className="mt-0.5 h-4 w-4 shrink-0" />{review.calendarNotice}</div>
          </> : null}
          {step === 'review' ? <>
            <IndiceModalSummary title={review.savedSettings} variant="plain" columns={2} icon={<ShieldCheck className="h-4 w-4" />} items={[
              { label: text.selectedOrganization, value: selected?.title ?? '—', emphasized: true },
              { label: `${copy.frequencies.weekly} · ${review.weeklyRange}`, value: `${startDay} → ${endDay}` },
              { label: `${copy.frequencies.biweekly} · ${text.dayOfMonthHelper}`, value: `${form.biweekly_first_day} / ${form.biweekly_second_day}` },
              { label: `${copy.frequencies.monthly} · ${text.dayOfMonthHelper}`, value: String(form.monthly_start_day) },
            ]} />
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="outline" onClick={() => navigate('organization')}><Pencil className="h-4 w-4" />{review.edit} · {text.steps.organization}</Button>
              <Button type="button" variant="outline" onClick={() => navigate('calendar')}><Pencil className="h-4 w-4" />{review.edit} · {review.calendarStep}</Button>
            </div>
            <IndiceModalValidation tone="info" messages={[review.impact]} />
          </> : null}
        </fieldset>
        {step !== 'calendar' ? <details className="rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900">
          <summary className="min-h-11 cursor-pointer px-4 py-3 text-sm font-medium text-slate-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#269C82] dark:text-slate-200">{text.separationTitle}</summary>
          <div className="space-y-3 border-t border-slate-100 p-4 dark:border-slate-800">
            {Object.values(text.separators).map(item => <p key={item.title} className="text-sm text-slate-500 dark:text-slate-400"><span className="font-medium text-slate-700 dark:text-slate-200">{item.title}. </span>{item.description}</p>)}
            <p className="text-xs leading-5 text-[#177D66] dark:text-[#B8F2E3]">{text.separationNotice}</p>
          </div>
        </details> : null}
      </div>
    </IndiceModalFrame>
  );
}
