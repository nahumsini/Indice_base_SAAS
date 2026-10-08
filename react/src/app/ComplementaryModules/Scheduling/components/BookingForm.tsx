import { useEffect, useRef, useState } from 'react';
import { CheckCircle2, Clock3 } from 'lucide-react';
import { IndiceWorkspaceNavigation } from '../../../components/frontend-os/IndiceWorkspaceNavigation';
import { getIndiceFilterControlClassName } from '../../../components/frontend-os/IndiceFilterBar';
import { MODULE_COLORS, type IndiceModuleTone } from '../../../styles/moduleColors';
import type { BookingCatalog, BookingRequest, SlotRequest, Slots, Submission } from '../services/schedulingApi';
import type { SchedulingCopy } from '../translations/schedulingCopy';
import { ActionButton, controlClass as privateControlClass, Feedback, Field, panelClass } from './SchedulingPrimitives';
import { schedulingTone } from '../utils/schedulingIdentity';

/** Shared owner workflow for public requests and authorized internal capture. No contact data is cached. */
export function BookingForm({ catalog, copy, locale, loadSlots, onSubmit, presetStaff, presetEvent, onBusyChange, onReceived, tone = 'blue' }: {
  catalog: BookingCatalog; copy: SchedulingCopy; locale: string; presetStaff?: number; presetEvent?: number;
  loadSlots: (request: SlotRequest, signal: AbortSignal) => Promise<Slots>;
  onSubmit: (request: BookingRequest, idempotencyKey: string) => Promise<Submission>;
  onBusyChange?: (busy: boolean) => void;
  onReceived?: () => void;
  tone?: IndiceModuleTone;
}) {
  const controlClass = tone === schedulingTone ? privateControlClass : getIndiceFilterControlClassName(tone);
  const initialEvent = catalog.events.find(e => e.id === presetEvent);
  const [selection, setSelection] = useState(initialEvent ? `event:${initialEvent.id}` : '');
  const [staffId, setStaffId] = useState(initialEvent?.staffId ?? (catalog.staff.some(s => s.id === presetStaff) ? presetStaff! : 0));
  const [date, setDate] = useState(''), [startAt, setStartAt] = useState('');
  const [step, setStep] = useState<'choose' | 'time' | 'contact'>('choose');
  const [slots, setSlots] = useState<Slots>(), [slotLoading, setSlotLoading] = useState(false);
  const [error, setError] = useState(false), [busy, setBusy] = useState(false), [received, setReceived] = useState(false);
  const [contact, setContact] = useState({ attendeeName: '', attendeeEmail: '', attendeeCompany: '', attendeePhone: '', contactConsent: false });
  const retry = useRef<{ fingerprint: string; key: string } | null>(null);
  const selectedEvent = selection.startsWith('event:') ? catalog.events.find(e => e.id === Number(selection.slice(6))) : undefined;
  const service = selection.startsWith('service:') ? catalog.services.find(s => s.id === Number(selection.slice(8))) : undefined;
  const staff = catalog.staff.find(s => s.id === staffId);
  const timeLabel = (value: string, full = false) => new Intl.DateTimeFormat(locale, {
    timeZone: staff?.timezone, ...(full ? { dateStyle: 'medium', timeStyle: 'short' } : { hour: '2-digit', minute: '2-digit' }),
  }).format(new Date(value));
  useEffect(() => {
    const controller = new AbortController(); setSlots(undefined); setStartAt(''); setError(false);
    if (!service || !staff || !date) { setSlotLoading(false); return; }
    setSlotLoading(true);
    loadSlots({ serviceId: service.id, staffId: staff.id, date }, controller.signal)
      .then(result => { if (!controller.signal.aborted) setSlots(result); })
      .catch(() => { if (!controller.signal.aborted) setError(true); })
      .finally(() => { if (!controller.signal.aborted) setSlotLoading(false); });
    return () => controller.abort();
  }, [service?.id, staffId, date, loadSlots]);
  useEffect(() => { onBusyChange?.(busy); }, [busy, onBusyChange]);
  if (received) return <section className={`${panelClass} space-y-3 text-center`} role="status">
    <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-600" aria-hidden="true" /><h2 className="text-xl font-medium">{copy.received}</h2>
    <p className="mx-auto max-w-xl text-sm leading-6 text-slate-600 dark:text-slate-300">{copy.receivedHint}</p>
  </section>;
  if (!catalog.staff.length || (!catalog.services.length && !catalog.events.length)) return <Feedback tone={tone}>{copy.setupHint}</Feedback>;
  const steps = ['choose', 'time', 'contact'] as const;
  const chooseReady = Boolean(staff && (service || (selectedEvent && selectedEvent.availablePlaces > 0)));
  const timeReady = Boolean(selectedEvent || startAt);
  return <div className="space-y-5">
    <IndiceWorkspaceNavigation<typeof step> ariaLabel={copy.newReservation} variant="workflow" tone={tone} value={step}
      items={[{ id: 'choose', label: copy.service }, { id: 'time', label: copy.time }, { id: 'contact', label: copy.attendee }]
        .map((item, index) => ({ ...item, id: item.id as typeof step, disabled: busy || index > steps.indexOf(step) }))}
      onValueChange={setStep} />
    <Feedback tone={tone}>{copy.reviewRequired}</Feedback>
    {error && <Feedback error>{copy.error}</Feedback>}
    <form className="space-y-5" onSubmit={async event => {
      event.preventDefault(); if (busy) return;
      if (step === 'choose') { if (chooseReady) setStep('time'); return; }
      if (step === 'time') { if (timeReady) setStep('contact'); return; }
      if (!chooseReady || !timeReady || !contact.contactConsent) return;
      const body: BookingRequest = { serviceId: service?.id ?? null, eventId: selectedEvent?.id ?? null, staffId,
        startAt: selectedEvent?.startAt ?? startAt, ...contact };
      const fingerprint = JSON.stringify(body);
      if (retry.current?.fingerprint !== fingerprint) retry.current = { fingerprint, key: crypto.randomUUID() };
      setBusy(true); setError(false);
      try { await onSubmit(body, retry.current.key); setReceived(true); onReceived?.(); }
      catch { setError(true); } finally { setBusy(false); }
    }}>
      {step === 'choose' && <div className="grid gap-5 md:grid-cols-2">
        <Field label={`${copy.service} / ${copy.events}`}><select required className={controlClass} value={selection} onChange={event => {
          const value = event.target.value; setSelection(value);
          const chosen = catalog.events.find(e => `event:${e.id}` === value);
          if (chosen) setStaffId(chosen.staffId);
        }}><option value="">{copy.selectOption}</option>
          {catalog.services.map(s => <option key={`service:${s.id}`} value={`service:${s.id}`}>{s.name} · {s.durationMinutes} {copy.minutes}</option>)}
          {catalog.events.map(e => <option key={`event:${e.id}`} value={`event:${e.id}`} disabled={e.availablePlaces <= 0}>{e.title} · {e.availablePlaces} {copy.places}</option>)}
        </select></Field>
        <Field label={copy.consultant}><select required className={controlClass} value={staffId || ''} disabled={Boolean(selectedEvent)} onChange={e => setStaffId(Number(e.target.value))}>
          <option value="">{copy.selectOption}</option>{catalog.staff.map(s => <option key={s.id} value={s.id}>{s.publicName}</option>)}
        </select></Field>
        {(service?.description || selectedEvent?.description) && <p className="text-sm leading-6 text-slate-600 dark:text-slate-300 md:col-span-2">{service?.description ?? selectedEvent?.description}</p>}
      </div>}
      {step === 'time' && <section className="space-y-4">
        <p className="flex items-center gap-2 text-sm font-medium"><Clock3 className="h-4 w-4" aria-hidden="true" />{staff?.publicName} · {staff?.timezone}</p>
        <p className="text-sm text-slate-500 dark:text-slate-400">{copy.timezoneHint}</p>
        {selectedEvent ? <div className={panelClass}><p className="font-medium">{selectedEvent.title}</p><p className="mt-2 text-sm">{timeLabel(selectedEvent.startAt, true)} · {selectedEvent.durationMinutes} {copy.minutes}</p></div> : <>
          <Field label={copy.date}><input type="date" required className={`${controlClass} max-w-sm`} value={date} onChange={e => setDate(e.target.value)} /></Field>
          {slotLoading ? <Feedback tone={tone}>{copy.loading}</Feedback> : slots && !slots.starts.length ? <Feedback tone={tone}>{copy.noSlots}</Feedback> :
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4" role="group" aria-label={copy.time}>{slots?.starts.map(start =>
              <ActionButton key={start} aria-pressed={startAt === start} primary={startAt === start} onClick={() => setStartAt(start)}>{timeLabel(start)}</ActionButton>)}</div>}
        </>}
      </section>}
      {step === 'contact' && <>
        <section className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800">
          <p className="font-medium">{service?.name ?? selectedEvent?.title}</p><p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{staff?.publicName} · {timeLabel(selectedEvent?.startAt ?? startAt, true)} · {staff?.timezone}</p>
        </section>
        <fieldset disabled={busy} className="grid gap-4 sm:grid-cols-2">
          {(['attendeeName', 'attendeeEmail', 'attendeeCompany', 'attendeePhone'] as const).map(key => <Field key={key}
            label={{ attendeeName: copy.attendee, attendeeEmail: copy.email, attendeeCompany: copy.company, attendeePhone: copy.phone }[key]}>
            <input className={controlClass} type={key === 'attendeeEmail' ? 'email' : key === 'attendeePhone' ? 'tel' : 'text'}
              autoComplete={{ attendeeName: 'name', attendeeEmail: 'email', attendeeCompany: 'organization', attendeePhone: 'tel' }[key]}
              required={key === 'attendeeName' || key === 'attendeeEmail'} maxLength={key === 'attendeeEmail' ? 240 : key === 'attendeePhone' ? 40 : 180}
              value={contact[key]} onChange={e => setContact(previous => ({ ...previous, [key]: e.target.value }))} />
          </Field>)}
          <label className="flex min-h-11 items-start gap-3 text-sm leading-6 sm:col-span-2"><input type="checkbox" className="mt-1 h-4 w-4 shrink-0" style={{accentColor:`var(--scheduling-accent,${MODULE_COLORS[tone].primary})`}} required checked={contact.contactConsent} onChange={e => setContact(previous => ({ ...previous, contactConsent: e.target.checked }))} />{copy.consent}</label>
        </fieldset>
        <p className="text-xs leading-5 text-slate-500 dark:text-slate-400">{copy.privacy}</p>
      </>}
      <div className="flex flex-wrap justify-end gap-3 border-t border-slate-200 pt-5 dark:border-slate-700">
        {step !== 'choose' && <ActionButton disabled={busy} onClick={() => setStep(step === 'contact' ? 'time' : 'choose')}>{copy.back}</ActionButton>}
        <ActionButton primary type="submit" disabled={busy || (step === 'choose' ? !chooseReady : step === 'time' ? !timeReady || slotLoading : !contact.contactConsent)}>{busy ? copy.loading : step === 'contact' ? copy.send : copy.next}</ActionButton>
      </div>
    </form>
  </div>;
}
