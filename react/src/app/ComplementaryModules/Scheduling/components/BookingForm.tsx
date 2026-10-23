import { useEffect, useId, useRef } from 'react';
import { createPortal } from 'react-dom';
import { CalendarDays, CheckCircle2, ClipboardCheck, UserRound, Users } from 'lucide-react';
import { IndiceModalSummary, IndiceModalValidation, IndiceModalWizardStepper } from '../../../components/indice-modal';
import { getSchedulingOperationsCopy } from '../translations/schedulingOperationsCopy';
import { getBookingFlowCopy } from '../translations/bookingFlowCopy';
import { getServiceTermsCopy, serviceChargeLabel } from '../translations/serviceTermsCopy';
import { getIndiceFilterControlClassName } from '../../../components/frontend-os/IndiceFilterBar';
import { MODULE_COLORS, type IndiceModuleTone } from '../../../styles/moduleColors';
import type { BookingCatalog, BookingRequest, SlotRequest, Slots, Submission } from '../services/schedulingApi';
import type { SchedulingCopy } from '../translations/schedulingCopy';
import { useBookingFlow } from '../hooks/useBookingFlow';
import { bookingSteps, slotDateBounds, validBookingContact, type BookingProgress } from '../utils/bookingFlow';
import { ActionButton, controlClass as privateControlClass, Feedback, Field } from './SchedulingPrimitives';
import { BookingClientPicker } from './BookingClientPicker';
import { PublicServiceChoices } from './PublicServiceChoices';
import { schedulingTone } from '../utils/schedulingIdentity';
import { getPublicAgendaBrandCopy } from '../translations/publicAgendaBrandCopy';

/** Public requests and private capture share one booking use case and separate presentation. */
export function BookingForm({ catalog, copy, locale, loadSlots, loadCatalog, onSubmit, presetStaff, presetEvent, presetDate, onBusyChange, onReceived,
  footerTarget, onDirtyChange, onProgressChange, tone = 'blue', selectionLayout = 'compact', context = 'public', presentationOnly = false }: {
  catalog: BookingCatalog; copy: SchedulingCopy; locale: string; presetStaff?: number; presetEvent?: number; presetDate?: string;
  loadSlots: (request: SlotRequest, signal: AbortSignal) => Promise<Slots>; loadCatalog?: (signal: AbortSignal) => Promise<BookingCatalog>;
  onSubmit: (request: BookingRequest, key: string) => Promise<Submission>;
  onBusyChange?: (busy: boolean) => void; onReceived?: (result: Submission) => void;
  onProgressChange?: (progress: BookingProgress) => void; onDirtyChange?: (dirty: boolean) => void;
  tone?: IndiceModuleTone; selectionLayout?: 'cards' | 'compact' | 'showcase'; context?: 'public' | 'internal'; presentationOnly?: boolean; footerTarget?: HTMLElement|null;
}) {
  const FormSurface = presentationOnly ? 'div' : 'form';
  const formId = useId(), heading = useRef<HTMLHeadingElement>(null);
  const op = getSchedulingOperationsCopy(locale), text = getBookingFlowCopy(locale), terms = getServiceTermsCopy(locale), brand = getPublicAgendaBrandCopy(locale), internal = context === 'internal';
  const controlClass = tone === schedulingTone ? privateControlClass : getIndiceFilterControlClassName(tone);
  const flow = useBookingFlow({catalog,presetStaff,presetEvent,presetDate,loadSlots,loadCatalog,onSubmit,onBusyChange,onDirtyChange,onReceived});
  const { service,event,staff,step,busy,receipt } = flow;
  const stepIndex = bookingSteps.indexOf(step), labels = [internal ? text.selection : copy.service,internal ? text.schedule : copy.time,internal ? text.contact : copy.attendee,op.review];
  const hints = [text.chooseHint,text.timeHint,text.contactHint,text.reviewHint];
  const summary = [service?.name ?? event?.title,staff?.publicName].filter(Boolean).join(' · ');
  useEffect(() => { heading.current?.focus(); },[step,receipt]);
  useEffect(() => { onProgressChange?.({step,summary}); },[step,summary,onProgressChange]);
  const timeLabel = (value: string, full = false) => !value || !Number.isFinite(Date.parse(value)) ? '—' : new Intl.DateTimeFormat(locale, {
    timeZone:staff?.timezone,...(full ? {dateStyle:'medium',timeStyle:'short'} : {hour:'2-digit',minute:'2-digit'}),
  }).format(new Date(value));
  const scheduledTime = event?.startAt ?? flow.startAt;
  const sessionItems = [
    {label:copy.service,value:service?.name ?? event?.title ?? '—'},{label:copy.consultant,value:staff?.publicName ?? '—'},
    {label:copy.date,value:timeLabel(scheduledTime,true)},{label:copy.timezone,value:staff?.timezone ?? '—'},
    {label:copy.duration,value:`${service?.durationMinutes ?? event?.durationMinutes ?? 0} ${copy.minutes}`},
    ...(service ? [{label:terms.chargePolicy,value:serviceChargeLabel(service.chargePolicy,locale)}] : []),
    ...(event?.location ? [{label:op.location,value:event.location}] : []),
  ];
  if (receipt) return <section className="space-y-5" role="status">
    <div className="space-y-3 text-center"><CheckCircle2 className="mx-auto h-10 w-10 text-emerald-600" aria-hidden="true"/><h2 ref={heading} tabIndex={-1} className="text-xl font-medium outline-none">{internal ? text.recorded : copy.received}</h2>
      <p className="mx-auto max-w-xl text-sm leading-6 text-slate-600 dark:text-slate-300">{internal ? receipt.status === 'CONFIRMED' || receipt.status === 'PAUSED' ? text.existingRequest : text.recordedHint : copy.receivedHint}</p></div>
    {internal && <IndiceModalSummary variant="success" columns={2} className="[&_dd]:whitespace-normal [&_dd]:break-words" items={[
      ...(receipt.reference ? [{label:text.reference,value:receipt.reference}] : []),{label:copy.status,value:receipt.status === 'CONFIRMED' ? copy.CONFIRMED : receipt.status === 'PAUSED' ? copy.PAUSED : copy.REQUESTED},...sessionItems,
    ]}/>}
  </section>;
  if (!flow.catalog.staff.length || (!flow.catalog.services.length && !flow.catalog.events.length)) return <Feedback tone={tone}>{copy.setupHint}</Feedback>;
  const issue = flow.error && {selection:text.selectionRequired,time:text.timeRequired,contact:text.contactInvalid,client:text.finishClient,submit:copy.error,conflict:op.conflict,scope:text.scopeChanged,catalog:copy.error}[flow.error];
  const buttons = <>
    {step !== 'choose' && <ActionButton disabled={busy} onClick={() => flow.goTo(bookingSteps[stepIndex-1])}>{copy.back}</ActionButton>}
    <ActionButton primary className={tone === 'blue' ? 'h-auto max-w-full whitespace-normal break-words py-3 text-center [overflow-wrap:anywhere]' : undefined} type={presentationOnly ? 'button' : 'submit'} form={presentationOnly ? undefined : formId}
      disabled={busy || flow.error === 'scope' || (step === 'choose' ? !flow.chooseReady : step === 'time' ? !flow.timeReady : flow.creatingClient || !validBookingContact(flow.contact))}>
      {busy ? copy.loading : step === 'review' ? internal ? text.submit : flow.catalog.appearance?.buttonLabel?.trim() || copy.send : copy.next}
    </ActionButton>
  </>;
  return <div className={internal ? 'space-y-5' : 'agenda-booking-flow space-y-5'}>
    <IndiceModalWizardStepper density="compact" className={!internal?'agenda-booking-progress':undefined} accent={tone === 'coral' ? 'coral' : 'blue'} activeStepId={step} progressLabel={copy.newReservation}
      steps={bookingSteps.map((id,index) => ({id,label:labels[index]}))} onStepSelect={value => flow.goTo(value)}/>
    {internal ? <div className="flex items-start gap-3"><span aria-hidden="true" className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#FF6B5E]/10 text-[#b63b32] dark:text-[#FF9C92]">{step === 'choose' ? <Users className="h-5 w-5"/> : step === 'time' ? <CalendarDays className="h-5 w-5"/> : step === 'contact' ? <UserRound className="h-5 w-5"/> : <ClipboardCheck className="h-5 w-5"/>}</span><div className="min-w-0"><h2 ref={heading} tabIndex={-1} className="text-base font-medium outline-none">{labels[stepIndex]}</h2><p className="mt-1 text-sm leading-6 text-slate-500 dark:text-slate-400">{hints[stepIndex]}</p></div></div>
      : <div className="agenda-current-step"><h2 ref={heading} tabIndex={-1} className="outline-none">{labels[stepIndex]}</h2><span aria-hidden>{stepIndex+1} / {bookingSteps.length}</span></div>}
    {!internal && step !== 'choose' && <p className="text-sm leading-6 text-slate-600 dark:text-slate-300">{summary}</p>}
    {issue && <IndiceModalValidation messages={[issue]}/>}
    <FormSurface id={formId} className="space-y-5" onSubmit={event => { event.preventDefault(); if (!presentationOnly) void flow.submit(); }}>
      <fieldset disabled={busy} className="min-w-0 space-y-5">
        {step === 'choose' && <div className="grid gap-5 sm:grid-cols-2">
          {!internal || selectionLayout === 'cards' || selectionLayout === 'showcase' ? <div className="min-w-0 sm:col-span-2"><PublicServiceChoices catalog={flow.catalog} value={flow.selection} onChange={flow.chooseSelection} copy={copy} locale={locale} layout={selectionLayout}/></div> :
            <Field label={`${copy.service} / ${copy.events}`}><select required className={controlClass} value={flow.selection} onChange={event => flow.chooseSelection(event.target.value)}><option value="">{copy.selectOption}</option>
              {flow.catalog.services.map(service => <option key={`service:${service.id}`} value={`service:${service.id}`}>{service.name} · {service.durationMinutes} {copy.minutes}</option>)}
              {flow.catalog.events.map(event => <option key={`event:${event.id}`} value={`event:${event.id}`} disabled={event.availablePlaces <= 0}>{event.title} · {event.availablePlaces} {copy.places}</option>)}
            </select></Field>}
          <Field label={copy.consultant}><select required className={controlClass} value={flow.staffId || ''} disabled={Boolean(event)} onChange={event => flow.changeStaff(Number(event.target.value))}>
            <option value="">{copy.selectOption}</option>{flow.eligibleStaff.map(person => <option key={person.id} value={person.id}>{person.publicName}</option>)}
          </select></Field>
          {internal && service && <p className="text-sm font-medium sm:col-span-2">{terms.chargePolicy}: {serviceChargeLabel(service.chargePolicy,locale)}</p>}
          {internal && (service?.description || event?.description) && <p className="text-sm leading-6 text-slate-600 dark:text-slate-300 sm:col-span-2">{service?.description ?? event?.description}</p>}
          {service && !flow.eligibleStaff.length && <Feedback>{text.noStaff}</Feedback>}
        </div>}
        {step === 'time' && <section className="space-y-4">
          <IndiceModalSummary variant="muted" columns={2} className="[&_dd]:whitespace-normal [&_dd]:break-words" items={(event ? sessionItems : sessionItems.filter(item => item.label !== copy.date)).filter(item=>internal || ![copy.service,copy.consultant].includes(item.label))}/>
          {event ? internal && <p className="text-sm text-slate-500 dark:text-slate-400">{copy.reviewRequired}</p> : <>
            <Field label={copy.date}><input type="date" required className={`${controlClass} max-w-sm`} {...slotDateBounds(staff?.timezone ?? 'UTC')} value={flow.date} onChange={event => flow.changeDate(event.target.value)}/></Field>
            <p className="text-xs leading-5 text-slate-500 dark:text-slate-400">{text.dateHint} {copy.timezoneHint}</p>
            {!flow.date ? <Feedback tone={tone}>{text.chooseDate}</Feedback> : flow.slotLoading ? <Feedback tone={tone}>{copy.loading}</Feedback> : flow.slotError ? <Feedback error>{text.slotsError}<ActionButton className="ml-2" onClick={flow.refreshSlots}>{copy.retry}</ActionButton></Feedback> : flow.slots && !flow.slots.starts.length ? <Feedback tone={tone}>{copy.noSlots}<ActionButton className="ml-2" onClick={flow.refreshSlots}>{text.refreshSlots}</ActionButton></Feedback> :
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4" role="group" aria-label={copy.time}>{flow.slots?.starts.map(start => <ActionButton key={start} aria-pressed={flow.startAt === start} primary={flow.startAt === start} onClick={() => flow.chooseTime(start)}>{timeLabel(start)}</ActionButton>)}</div>}
          </>}
        </section>}
        {internal && flow.contactVisited && flow.catalog.clientSelectionEnabled && <fieldset hidden={step !== 'contact'} disabled={step !== 'contact' || busy} className="min-w-0">
          <BookingClientPicker copy={copy} locale={locale} onBusyChange={flow.onClientBusyChange} onCreatingChange={flow.setCreatingClient} onSelect={flow.selectClient}/>
        </fieldset>}
        {step === 'contact' && <>
          <IndiceModalSummary variant="muted" columns={2} className="[&_dd]:whitespace-normal [&_dd]:break-words" items={sessionItems.filter(item=>internal || [copy.date,copy.timezone].includes(item.label))}/>
          {!flow.creatingClient && <fieldset className="grid gap-4 sm:grid-cols-2">
            <legend className={internal?'mb-3 text-sm font-medium':'sr-only'}>{flow.clientId ? text.linkedClient : text.manualContact}</legend>
            {(['attendeeName','attendeeEmail','attendeeCompany','attendeePhone'] as const).map(key => <Field key={key} label={{attendeeName:copy.attendee,attendeeEmail:copy.email,attendeeCompany:copy.company,attendeePhone:copy.phone}[key]}>
              <input className={controlClass} type={key === 'attendeeEmail' ? 'email' : key === 'attendeePhone' ? 'tel' : 'text'}
                autoComplete={{attendeeName:'name',attendeeEmail:'email',attendeeCompany:'organization',attendeePhone:'tel'}[key]} required={key === 'attendeeName' || key === 'attendeeEmail'}
                maxLength={key === 'attendeeEmail' ? 240 : key === 'attendeePhone' ? 40 : 180} value={flow.contact[key]} onChange={event => flow.editContact(key,event.target.value)}/>
            </Field>)}
            <label className="flex min-h-11 items-start gap-3 text-sm leading-6 sm:col-span-2"><input type="checkbox" className="mt-1 h-4 w-4 shrink-0" style={{accentColor:`var(--scheduling-accent,${MODULE_COLORS[tone].primary})`}} required checked={flow.contact.contactConsent} onChange={event => flow.setConsent(event.target.checked)}/>{copy.consent}</label>
          </fieldset>}
          {!flow.creatingClient && <p className="text-xs leading-5 text-slate-500 dark:text-slate-400">{copy.privacy}</p>}
        </>}
        {step === 'review' && <IndiceModalSummary columns={2} className="[&_dd]:whitespace-normal [&_dd]:break-words" items={[
          ...sessionItems,{label:copy.attendee,value:flow.contact.attendeeName},{label:copy.email,value:flow.contact.attendeeEmail},
          {label:copy.company,value:flow.contact.attendeeCompany || '—'},{label:copy.phone,value:flow.contact.attendeePhone || '—'},
          ...(internal ? [{label:text.contact,value:flow.clientId ? text.linkedClient : text.manualContact}] : []),
        ]}/>}
        {step === 'review' && <Feedback tone={tone}>{copy.reviewRequired}</Feedback>}
        {!internal && step !== 'review' && <p className="agenda-confirmation-hint">{brand.confirmationHint}</p>}
        {loadCatalog && step === 'choose' && <ActionButton onClick={() => void flow.refreshCatalog()}>{text.refreshCatalog}</ActionButton>}
      </fieldset>
      {footerTarget ? createPortal(buttons,footerTarget) : <div className={`${!internal?'agenda-booking-actions ':''}flex flex-wrap justify-end gap-3 border-t border-slate-200 pt-5 dark:border-slate-700`}>{buttons}</div>}
    </FormSurface>
  </div>;
}
