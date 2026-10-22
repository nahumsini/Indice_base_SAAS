import { useEffect, useRef, useState } from 'react';
import { CheckCircle2, Clock, PackageSearch } from 'lucide-react';
import { IndiceModalSummary, IndiceModalWizardStepper } from '../../../components/indice-modal';
import { schedulingApi, type Service, type InventoryService, type AvailabilityDay, type ServiceChargePolicy } from '../services/schedulingApi';
import type { SchedulingCopy } from '../translations/schedulingCopy';
import { useLanguage } from '../../../shared/context';
import { getSchedulingSetupCopy } from '../translations/schedulingSetupCopy';
import { getServiceTermsCopy, serviceChargeLabel } from '../translations/serviceTermsCopy';
import { getServiceEditorCopy } from '../translations/serviceEditorCopy';
import { controlClass, EditorFrame, Feedback, Field } from './SchedulingPrimitives';
import { schedulingEmoji } from '../utils/schedulingIdentity';
import { WeeklyHours } from './WeeklyHours';
import { SchedulingValidationError, validWeeklyHours } from '../utils/setupValidation';
import { ServiceCatalogPicker } from './ServiceCatalogPicker';
import { staffSectionClass, StaffWeeklySummary } from './StaffConfigurationSummary';

export function ServiceEditor({ service, configuredServices, copy, onClose, onSaved, onEditConfigured }: {
  service?: Service; configuredServices: Service[]; copy: SchedulingCopy; onClose: () => void; onSaved: () => void; onEditConfigured: (id: number) => void;
}) {
  const { currentLanguage } = useLanguage(), locale = currentLanguage.code;
  const setup = getSchedulingSetupCopy(locale), text = getServiceEditorCopy(locale), terms = getServiceTermsCopy(locale);
  const [step,setStep] = useState(0), [selected,setSelected] = useState<InventoryService>();
  const [source,setSource] = useState<'inventory' | 'agenda'>(service && !service.productId ? 'agenda' : 'inventory');
  const sourceDrafts = useRef<Partial<Record<'inventory' | 'agenda', { productId?: number; name: string; description: string }>>>({});
  const [draft,setDraft] = useState({ chargePolicy: service?.chargePolicy ?? 'TO_BE_AGREED' as ServiceChargePolicy, productId: service?.productId ?? undefined, name: service?.name ?? '', description: service?.description ?? '',
    durationMinutes: service?.durationMinutes ?? 60, bufferMinutes: service?.bufferMinutes ?? 15, noticeHours: service?.noticeHours ?? 24,
    active: service?.active ?? true, days: service?.days ?? [] as AvailabilityDay[] });
  const [restricted,setRestricted] = useState(Boolean(service?.days?.length));
  const [customize,setCustomize] = useState(false);
  const initial = useRef(JSON.stringify({ draft,restricted,source })), heading = useRef<HTMLHeadingElement>(null);
  const steps = [service?.productId ? copy.service : text.chooseStep,text.bookingStep,text.reviewStep].map((label,index) => ({ id:String(index),label }));
  const hints = [service?.productId ? text.linkLocked : terms.chooseHint,text.bookingHint,text.reviewHint];
  const selectionError = () => {
    if (source === 'agenda') {
      if (!draft.name.trim() || draft.name.length > 180 || draft.description.length > 1500) return terms.nameRequired;
      return;
    }
    if (!draft.productId || (selected && !selected.active)) return text.selectionRequired;
    if (draft.productId && configuredServices.some(item => item.productId === draft.productId && item.id !== service?.id)) return text.duplicateHint;
  };
  const settingsError = () => {
    if (!draft.name.trim() || draft.name.length > 180 || draft.description.length > 1500 ||
      ![[draft.durationMinutes,15,180],[draft.bufferMinutes,0,60],[draft.noticeHours,0,720]].every(([value,min,max]) => Number.isInteger(value) && value >= min && value <= max)) return text.settingsInvalid;
    if (restricted && (!draft.days.length || !validWeeklyHours(draft.days))) return setup.hoursInvalid;
  };
  const validate = () => {
    const error = step === 0 ? selectionError() : step === 1 ? settingsError() : selectionError() ?? settingsError();
    if (step === 1 && error === text.settingsInvalid && !draft.name.trim()) setCustomize(true);
    return error;
  };
  const changeSource = (next: 'inventory' | 'agenda') => {
    sourceDrafts.current[source] = { productId:draft.productId, name:draft.name, description:draft.description };
    const restored = sourceDrafts.current[next] ?? { productId:undefined, name:service?.name ?? '', description:service?.description ?? '' };
    setDraft(value => ({ ...value,...restored }));
    setSource(next);
  };
  useEffect(() => { heading.current?.focus(); },[step]);
  const sourceItem = draft.productId ? selected : undefined;
  const sourceSummary = <IndiceModalSummary variant="muted" columns={2} className="[&_dd]:whitespace-normal [&_dd]:break-words" title={sourceItem ? text.selectedService : draft.productId ? text.linkedService : terms.agendaService} items={[
    { label:sourceItem ? text.inventoryName : text.publicName,value:sourceItem?.name ?? draft.name },
    ...(sourceItem?.sku ? [{ label:text.inventoryCode,value:sourceItem.sku }] : []),
  ]}/>;
  return <EditorFrame icon={schedulingEmoji.services} modalType="wizard" title={service ? text.editService : copy.newService} description={terms.description}
    copy={copy} onClose={onClose} onSaved={onSaved} footerLayout="split" footerSummary={draft.name || undefined}
    saveLabel={text.saveConfiguration} discardDescription={text.discardDescription} discardLabel={text.discardLabel}
    hasChanges={JSON.stringify({ draft,restricted,source }) !== initial.current} trackChanges={false} validate={validate}
    navigation={{ stepLabel:`${text.step} ${step+1} ${text.of} 3 · ${steps[step].label}`,backLabel:copy.back,continueLabel:copy.next,
      disabled:step === 0 && source === 'inventory' && !draft.productId,
      onBack:step > 0 ? () => setStep(value => value-1) : undefined,onContinue:step < 2 ? () => setStep(value => value+1) : undefined,
      progress:<IndiceModalWizardStepper accent="coral" density="compact" activeStepId={String(step)} steps={steps} progressLabel={`${service ? text.editService : copy.newService}: ${text.step} ${step+1} ${text.of} 3`}/> }}
    onSave={() => {
      if (step !== 2 || selectionError()) throw new SchedulingValidationError('scheduling_catalog_service_unavailable');
      if (settingsError()) throw new SchedulingValidationError(restricted && (!draft.days.length || !validWeeklyHours(draft.days)) ? 'scheduling_hours_invalid' : 'scheduling_setup_required');
      return schedulingApi.saveService({ ...draft,days:restricted ? draft.days : [],version:service?.version },service?.id);
    }}>
    {({ requestExit }) => <>
      <div className="flex items-start gap-3"><span aria-hidden="true" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#FF6B5E]/10 text-[#b63b32] dark:text-[#FF9C92]">{step === 0 ? <PackageSearch className="h-5 w-5"/> : step === 1 ? <Clock className="h-5 w-5"/> : <CheckCircle2 className="h-5 w-5"/>}</span><div className="min-w-0"><h2 ref={heading} tabIndex={-1} className="text-base font-medium text-slate-900 outline-none dark:text-slate-100">{steps[step].label}</h2><p className="mt-1 text-sm leading-6 text-slate-500 dark:text-slate-400">{hints[step]}</p></div></div>
      {step === 0 && <>
        {service?.productId ? sourceSummary : <>
          <fieldset className="grid gap-2 sm:grid-cols-2"><legend className="mb-2 text-sm font-medium">{terms.source}</legend>{(['inventory','agenda'] as const).map(value => <label key={value} className={`flex min-h-12 cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 text-sm ${source === value ? 'border-[#FF6B5E] bg-[#FF6B5E]/5' : 'border-slate-200 dark:border-slate-700'}`}><input type="radio" name="service-source" value={value} checked={source === value} onChange={() => changeSource(value)} className="h-4 w-4 shrink-0 accent-[#FF6B5E]"/>{terms[value]}</label>)}</fieldset>
          {source === 'agenda' ? <section className={`${staffSectionClass} space-y-3`}>
            <p className="text-sm leading-6 text-slate-500 dark:text-slate-400">{terms.agendaHint}</p>
            <Field label={`${text.publicName} *`}><input className={controlClass} required maxLength={180} value={draft.name} onChange={event => setDraft({ ...draft,name:event.target.value })}/></Field>
            <Field label={text.publicDescription}><textarea className={`${controlClass} h-24 py-3`} maxLength={1500} value={draft.description} onChange={event => setDraft({ ...draft,description:event.target.value })}/></Field>
          </section> : <>
          {service && <Feedback>{terms.linkHint}</Feedback>}
          <ServiceCatalogPicker selected={selected} configuredServices={configuredServices} serviceId={service?.id} copy={copy} locale={locale}
            onSelect={item => { setSelected(item); setDraft(value => ({ ...value,productId:item.id,name:service && !service.productId ? value.name : item.name.slice(0,180),description:service && !service.productId ? value.description : (item.description ?? '').slice(0,1500) })); }}
            onEditConfigured={id => requestExit(() => onEditConfigured(id))}/>
          {(selected || draft.productId) && sourceSummary}
          </>}
        </>}
      </>}
      {step === 1 && <>
        {sourceSummary}
        <section className={`${staffSectionClass} space-y-4`}>
          <div className="grid gap-4 sm:grid-cols-3">{(['durationMinutes','bufferMinutes','noticeHours'] as const).map(key => <Field key={key} label={{durationMinutes:copy.duration,bufferMinutes:setup.sessionGap,noticeHours:copy.notice}[key]}><input className={controlClass} type="number" required step={1} min={key === 'durationMinutes' ? 15 : 0} max={key === 'durationMinutes' ? 180 : key === 'bufferMinutes' ? 60 : 720} value={draft[key]} onChange={event => setDraft({ ...draft,[key]:Number(event.target.value) })}/></Field>)}</div>
          <p className="text-xs leading-5 text-slate-500 dark:text-slate-400">{setup.gapHint}</p><p className="text-xs leading-5 text-slate-500 dark:text-slate-400">{text.noticeHint}</p>
          <label className="flex min-h-11 items-center gap-3 border-t border-slate-100 pt-3 text-sm dark:border-slate-800"><input type="checkbox" className="h-4 w-4 accent-[#FF6B5E]" checked={draft.active} onChange={event => setDraft({ ...draft,active:event.target.checked })}/>{copy.active}</label>
        </section>
        <section className={`${staffSectionClass} space-y-3`}>
          <Field label={terms.chargePolicy}><select className={controlClass} value={draft.chargePolicy} onChange={event => setDraft({ ...draft,chargePolicy:event.target.value as ServiceChargePolicy })}><option value="TO_BE_AGREED">{terms.toBeAgreed}</option><option value="NO_CHARGE">{terms.noCharge}</option></select></Field>
          <p className="text-xs leading-5 text-slate-500 dark:text-slate-400">{terms.chargeHint}</p>
        </section>
        <section className={`${staffSectionClass} space-y-3`}><h3 className="text-sm font-medium">{setup.serviceHours}</h3><p className="text-sm leading-6 text-slate-500 dark:text-slate-400">{setup.serviceHoursHint}</p>
          <label className="flex min-h-11 items-center gap-3 text-sm"><input type="checkbox" className="h-4 w-4 shrink-0 accent-[#FF6B5E]" checked={restricted} onChange={event => { setRestricted(event.target.checked); if (event.target.checked && !draft.days.length) setDraft({ ...draft,days:[1,2,3,4,5].map(dayOfWeek => ({ dayOfWeek,startTime:'09:00',endTime:'17:00' })) }); }}/>{setup.restrictHours}</label>
          {restricted ? <WeeklyHours compact days={draft.days} onChange={days => setDraft({ ...draft,days })} locale={locale} copy={copy}/> : <p className="text-sm text-slate-600 dark:text-slate-300">{text.defaultHours}</p>}
        </section>
        <details open={customize} onToggle={event => setCustomize(event.currentTarget.open)} className={staffSectionClass}><summary className="flex min-h-11 cursor-pointer items-center text-sm font-medium focus-visible:outline-2 focus-visible:outline-[#FF6B5E]">{text.customize}</summary><div className="mt-3 space-y-3"><p className="text-xs leading-5 text-slate-500 dark:text-slate-400">{text.customizeHint}</p>
          <Field label={`${text.publicName} *`}><input className={controlClass} aria-required="true" maxLength={180} value={draft.name} onChange={event => setDraft({ ...draft,name:event.target.value })}/></Field>
          <Field label={text.publicDescription}><textarea className={`${controlClass} h-24 py-3`} maxLength={1500} value={draft.description} onChange={event => setDraft({ ...draft,description:event.target.value })}/></Field>
        </div></details>
      </>}
      {step === 2 && <>
        {sourceSummary}
        <IndiceModalSummary columns={2} className="[&_dd]:whitespace-pre-line [&_dd]:break-words" items={[
          {label:text.publicName,value:draft.name},{label:text.publicDescription,value:draft.description || '—'},
          {label:terms.source,value:draft.productId ? terms.inventoryService : terms.agendaService},{label:terms.chargePolicy,value:serviceChargeLabel(draft.chargePolicy,locale)},
          {label:copy.duration,value:`${draft.durationMinutes} ${copy.minutes}`},{label:setup.sessionGap,value:`${draft.bufferMinutes} ${copy.minutes}`},
          {label:copy.notice,value:draft.noticeHours},{label:copy.status,value:draft.active ? copy.active : text.inactive},
        ]}/>
        {restricted ? <StaffWeeklySummary days={draft.days} locale={locale} copy={{ ...copy,weekly:setup.serviceHours }}/> : <IndiceModalSummary variant="muted" description={setup.serviceHoursHint} items={[{label:setup.serviceHours,value:text.defaultHours}]}/>}
      </>}
    </>}
  </EditorFrame>;
}
