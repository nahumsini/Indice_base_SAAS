import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { CheckCircle2, Clock, UserRound } from 'lucide-react';
import { IndiceModalSummary, IndiceModalWizardStepper } from '../../../components/indice-modal';
import { schedulingApi, type Staff } from '../services/schedulingApi';
import type { SchedulingCopy } from '../translations/schedulingCopy';
import { ActionButton, controlClass, EditorFrame, Feedback, Field } from './SchedulingPrimitives';
import { schedulingEmoji } from '../utils/schedulingIdentity';
import { getSchedulingOperationsCopy } from '../translations/schedulingOperationsCopy';
import { WeeklyHours } from './WeeklyHours';
import { getSchedulingSetupCopy } from '../translations/schedulingSetupCopy';
import { SchedulingValidationError, validWeeklyHours } from '../utils/setupValidation';
import { useSchedulingQuery } from '../hooks/useSchedulingQuery';
import { getStaffEditorCopy } from '../translations/staffEditorCopy';
import { staffSectionClass, StaffServiceSummary, StaffWeeklySummary } from './StaffConfigurationSummary';

export function StaffEditor({ staff, members, copy, locale, onClose, onSaved }: { staff?: Staff; members: { id: number; name: string }[];
  copy: SchedulingCopy; locale: string; onClose: () => void; onSaved: () => void }) {
  const setup = getSchedulingSetupCopy(locale), text = getStaffEditorCopy(locale), op = getSchedulingOperationsCopy(locale);
  const nameHintId = useId(), heading = useRef<HTMLHeadingElement>(null);
  const [step, setStep] = useState(0), [date,setDate] = useState('');
  const services = useSchedulingQuery(useCallback(signal => schedulingApi.services(signal), []));
  const [draft, setDraft] = useState({ userId: staff?.userId ?? 0, publicName: staff?.publicName ?? '', timezone: staff?.timezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone,
    active: staff?.active ?? true, days: staff?.days ?? [1, 2, 3, 4, 5].map(dayOfWeek => ({ dayOfWeek, startTime: '09:00', endTime: '17:00' })),
    bufferMinutes: staff?.bufferMinutes ?? 0, unavailableDates: staff?.unavailableDates ?? [], serviceIds: staff?.serviceIds ?? [] });
  const initialDraft = useRef(JSON.stringify(draft));
  const sortedMembers = useMemo(() => [...members].sort((a,b) => a.name.localeCompare(b.name,locale)), [members,locale]);
  const availableDays = new Set(draft.days.map(day => day.dayOfWeek)).size;
  const steps = [text.collaboratorStep, text.availabilityStep, text.servicesStep, text.reviewStep].map((label,index) => ({ id: String(index), label }));
  const descriptions = [setup.employeeHint, text.weeklyHint, op.servicesHint, text.reviewHint];
  const employeeName = members.find(member => member.id === draft.userId)?.name ?? staff?.publicName ?? '—';
  useEffect(() => { heading.current?.focus(); }, [step]);
  const validateIdentity = () => {
    if (!draft.userId || !draft.publicName.trim() || draft.publicName.length > 180) throw new SchedulingValidationError('scheduling_setup_required');
  };
  const validateHours = () => {
    if (!draft.timezone || !validWeeklyHours(draft.days)) throw new SchedulingValidationError('scheduling_hours_invalid');
  };
  const next = () => {
    if (step === 0) validateIdentity();
    if (step === 1) validateHours();
    setStep(current => Math.min(current + 1, 3));
  };
  return <EditorFrame icon={schedulingEmoji.team} modalType="wizard" title={staff ? text.editStaff : copy.newStaff}
    description={text.description} copy={copy} onClose={onClose} onSaved={onSaved}
    navigation={{ stepLabel: `${text.step} ${step+1} ${text.of} 4 · ${steps[step].label}`, backLabel: text.back, continueLabel: text.continue,
      onBack: step > 0 ? () => setStep(current => current - 1) : undefined, onContinue: step < 3 ? next : undefined,
      progress: <IndiceModalWizardStepper accent="coral" density="compact" activeStepId={String(step)} steps={steps} progressLabel={`${staff ? text.editStaff : copy.newStaff}: ${text.step} ${step+1} ${text.of} 4`} /> }}
    footerLayout="split" footerSummary={step > 0 ? `${availableDays} ${text.daysConfigured} · ${draft.days.length} ${text.timeWindows}` : text.requiredFields}
    discardDescription={text.discardDescription} discardLabel={text.discardLabel}
    hasChanges={JSON.stringify(draft) !== initialDraft.current} onSave={() => {
      if (step !== 3) return Promise.reject(new SchedulingValidationError('scheduling_setup_required'));
      validateIdentity(); validateHours();
      return schedulingApi.saveStaff({ ...draft, version: staff?.version }, staff?.id);
    }}>
    <div className="flex items-start gap-3"><span aria-hidden="true" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#FF6B5E]/10 text-[#b63b32] dark:text-[#FF9C92]">{step === 0 ? <UserRound className="h-5 w-5"/> : step === 3 ? <CheckCircle2 className="h-5 w-5"/> : <Clock className="h-5 w-5"/>}</span>
      <div className="min-w-0"><h2 ref={heading} tabIndex={-1} className="text-base font-medium text-slate-900 outline-none dark:text-slate-100">{step === 3 ? text.reviewTitle : steps[step].label}</h2><p className="mt-1 text-sm leading-6 text-slate-500 dark:text-slate-400">{descriptions[step]}</p></div>
    </div>
    {step === 0 && <section className={`${staffSectionClass} space-y-4`}>
      <div className="flex flex-wrap items-center justify-between gap-2"><h3 className="text-sm font-medium">{text.identity}</h3>
        <label className="flex min-h-11 items-center gap-3 rounded-full bg-slate-50 px-3 text-sm dark:bg-slate-800"><input type="checkbox" className="h-4 w-4 accent-[#FF6B5E]" checked={draft.active} onChange={e => setDraft({ ...draft, active: e.target.checked })} />{copy.active}</label></div>
      {!members.length&&!staff&&<Feedback>{setup.noEmployees}</Feedback>}
      <Field label={`${copy.member} *`}><select className={controlClass} required disabled={Boolean(staff)} value={draft.userId || ''}
        onChange={e => { const member = members.find(m => m.id === Number(e.target.value)); setDraft({ ...draft, userId: Number(e.target.value), publicName: member?.name ?? '' }); }}>
        <option value="">{copy.selectOption}</option>{staff&&!members.some(m=>m.id===staff.userId)&&<option value={staff.userId}>{staff.publicName} · {setup.legacyEmployee}</option>}{sortedMembers.map(member => <option key={member.id} value={member.id}>{member.name}</option>)}</select></Field>
      <Field label={`${text.publicName} *`}><input className={controlClass} aria-describedby={nameHintId} required maxLength={180} value={draft.publicName} onChange={e => setDraft({ ...draft, publicName: e.target.value })} /></Field>
      <p id={nameHintId} className="text-xs leading-5 text-slate-500 dark:text-slate-400">{text.publicNameHint}</p>
    </section>}
    {step === 1 && <>
      <div className={`${staffSectionClass} space-y-3`}><div className="grid gap-4 sm:grid-cols-2">
        <Field label={`${copy.timezone} *`}><select className={controlClass} required value={draft.timezone} onChange={e => setDraft({ ...draft, timezone: e.target.value })}>{[...new Set([draft.timezone,'America/Mexico_City','America/Cancun','America/Tijuana','America/Toronto','America/Vancouver','America/New_York','America/Bogota','America/Sao_Paulo','Europe/Madrid','UTC'])].map(zone=><option key={zone} value={zone}>{zone}</option>)}</select></Field>
        <Field label={setup.sessionGap}><select className={controlClass} value={draft.bufferMinutes} onChange={e=>setDraft({...draft,bufferMinutes:Number(e.target.value)})}>{[...new Set([0,5,10,15,20,30,45,60,90,120,draft.bufferMinutes])].sort((a,b)=>a-b).map(value=><option key={value} value={value}>{value} {copy.minutes}</option>)}</select></Field>
      </div><p className="text-xs leading-5 text-slate-500 dark:text-slate-400">{setup.gapHint}</p></div>
      <section aria-label={copy.weekly} className={staffSectionClass}><WeeklyHours compact days={draft.days} onChange={days=>setDraft({...draft,days})} locale={locale} copy={copy}/></section>
    </>}
    {step === 2 && <>
      <section className={`${staffSectionClass} space-y-3`}><h3 className="text-sm font-medium">{text.assignedServices}</h3>
        {services.loading && <Feedback>{copy.loading}</Feedback>}{services.error && <Feedback error>{copy.error}<ActionButton onClick={services.reload}>{copy.retry}</ActionButton></Feedback>}
        <div className="grid gap-2 sm:grid-cols-2">{services.data?.map(service=><label key={service.id} className={`flex min-h-14 cursor-pointer items-center gap-3 rounded-xl border p-3 text-sm ${draft.serviceIds.includes(service.id) ? 'border-[#FF6B5E] bg-[#FF6B5E]/5' : 'border-slate-200 dark:border-slate-700'}`}>
          <input type="checkbox" className="h-4 w-4 shrink-0 accent-[#FF6B5E]" checked={draft.serviceIds.includes(service.id)} onChange={e=>setDraft({...draft,serviceIds:e.target.checked?[...draft.serviceIds,service.id]:draft.serviceIds.filter(id=>id!==service.id)})}/><span className="min-w-0 break-words">{service.name}</span>
        </label>)}</div>
        <p className="text-xs text-slate-500 dark:text-slate-400">{!draft.serviceIds.length ? op.allServices : `${draft.serviceIds.length} · ${text.assignedServices}`}</p>
      </section>
      <section className={`${staffSectionClass} space-y-3`}><h3 className="text-sm font-medium">{op.unavailableDates}</h3>
        <p className="text-sm text-slate-500 dark:text-slate-400">{text.exceptionsHint}</p>
        <div className="flex flex-wrap items-end gap-3"><Field label={copy.date}><input className={controlClass} type="date" value={date} onChange={e=>setDate(e.target.value)}/></Field>
          <ActionButton disabled={!date||draft.unavailableDates.includes(date)||draft.unavailableDates.length>=366} onClick={()=>{setDraft({...draft,unavailableDates:[...draft.unavailableDates,date].sort()});setDate('');}}>{op.addDate}</ActionButton></div>
        {draft.unavailableDates.length?<ul className="flex flex-wrap gap-2">{draft.unavailableDates.map(d=><li key={d}><ActionButton aria-label={op.remove+': '+d} onClick={()=>setDraft({...draft,unavailableDates:draft.unavailableDates.filter(v=>v!==d)})}>{d} ×</ActionButton></li>)}</ul>:<p className="text-sm text-slate-500 dark:text-slate-400">{text.noExceptions}</p>}
      </section>
    </>}
    {step === 3 && <>
      <IndiceModalSummary variant="muted" columns={2} className="[&_dd]:whitespace-normal [&_dd]:break-words" items={[
        {label:copy.member,value:employeeName}, {label:text.publicName,value:draft.publicName}, {label:copy.status,value:draft.active?copy.active:text.inactive},
        {label:copy.timezone,value:draft.timezone}, {label:setup.sessionGap,value:`${draft.bufferMinutes} ${copy.minutes}`},
      ]}/>
      <StaffWeeklySummary days={draft.days} locale={locale} copy={copy}/>
      <StaffServiceSummary staff={draft} services={services.data} locale={locale}/>
    </>}
  </EditorFrame>;
}
