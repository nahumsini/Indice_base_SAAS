import { useCallback, useEffect, useRef, useState } from 'react';
import { getAuthorizationRevision } from '../../../api/authSessionStore';
import { IndiceModalFrame } from '../../../components/indice-modal/IndiceModalFrame';
import { schedulingApi, type SlotRequest, type BookingRequest } from '../services/schedulingApi';
import { useSchedulingQuery } from '../hooks/useSchedulingQuery';
import type { SchedulingCopy } from '../translations/schedulingCopy';
import { ActionButton, Feedback } from './SchedulingPrimitives';
import { BookingForm } from './BookingForm';
import { getSchedulingSetupCopy } from '../translations/schedulingSetupCopy';
import { getSchedulingOperationsCopy } from '../translations/schedulingOperationsCopy';
import { getBookingFlowCopy } from '../translations/bookingFlowCopy';
import { bookingSteps, type BookingProgress } from '../utils/bookingFlow';
import { schedulingEmoji, schedulingTone } from '../utils/schedulingIdentity';

export function InternalBookingModal({ copy, locale, onClose, onSetup, suggestedDate }: {
  copy: SchedulingCopy; locale: string; suggestedDate?: string; onClose: () => void; onSetup?: (section: 'services'|'team') => void;
}) {
  const actorRevision = useRef(getAuthorizationRevision()), body = useRef<HTMLDivElement>(null);
  const pending = useRef(false), completed = useRef(false);
  const setup = getSchedulingSetupCopy(locale), text = getBookingFlowCopy(locale), op = getSchedulingOperationsCopy(locale);
  const loadCatalog = useCallback((signal: AbortSignal) => {
    if (actorRevision.current !== getAuthorizationRevision()) return Promise.reject(new Error('scheduling_scope_changed'));
    return schedulingApi.catalog(signal);
  },[]);
  const query = useSchedulingQuery(loadCatalog);
  const [busy,setBusy] = useState(false), [discard,setDiscard] = useState(false), [received,setReceived] = useState(false), [dirty,setDirty] = useState(false);
  const [receiptStatus,setReceiptStatus] = useState('REQUESTED');
  const [progress,setProgress] = useState<BookingProgress>({step:'choose',summary:''});
  const [footerTarget,setFooterTarget] = useState<HTMLDivElement|null>(null);
  const activity = useCallback((value: boolean) => { pending.current = value; setBusy(value); },[]);
  const slots = useCallback((request: SlotRequest, signal: AbortSignal) => {
    if (actorRevision.current !== getAuthorizationRevision()) return Promise.reject(new Error('scheduling_scope_changed'));
    return schedulingApi.slots(request,signal);
  },[]);
  const submit = useCallback((request: BookingRequest, key: string) => {
    if (actorRevision.current !== getAuthorizationRevision()) return Promise.reject(new Error('scheduling_scope_changed'));
    return schedulingApi.request(request,key);
  },[]);
  const close = () => { if (!pending.current) { if (completed.current || !dirty) onClose(); else setDiscard(true); } };
  const labels = [text.selection,text.schedule,text.contact,op.review];
  const hints = [text.chooseHint,text.timeHint,text.contactHint,text.reviewHint];
  const stepIndex = bookingSteps.indexOf(progress.step);
  useEffect(() => { body.current?.scrollTo({top:0}); },[progress.step,received,discard]);
  const cancel = <ActionButton disabled={busy} className="!border-[#222831]/25 !bg-transparent !text-[#222831] hover:!bg-white/20 dark:!border-white/40 dark:!text-white" onClick={close}>{received ? copy.close : copy.cancel}</ActionButton>;
  return <IndiceModalFrame open busy={busy} bodyRef={body} onOpenChange={open => { if (!open) { if (discard) setDiscard(false); else close(); } }} tone={schedulingTone} modalType={discard ? 'confirmation' : 'wizard'}
    contentClassName="group/agenda-booking data-[dialog-compact-viewport=true]:!overflow-hidden"
    bodyClassName="group-data-[dialog-compact-viewport=true]/agenda-booking:!flex-[1_1_0%] group-data-[dialog-compact-viewport=true]/agenda-booking:!overflow-y-auto"
    footerClassName="[&_[data-slot=indice-modal-actions]>div]:flex [&_[data-slot=indice-modal-actions]>div]:w-full [&_[data-slot=indice-modal-actions]>div]:flex-wrap [&_[data-slot=indice-modal-actions]>div]:gap-2 [&_[data-slot=indice-modal-actions]>div>button]:min-h-11 [&_[data-slot=indice-modal-actions]>div>button]:h-auto [&_[data-slot=indice-modal-actions]>div>button]:min-w-0 [&_[data-slot=indice-modal-actions]>div>button]:flex-1 [&_[data-slot=indice-modal-actions]>div>button]:whitespace-normal [&_[data-slot=indice-modal-actions]>div>button]:break-words [&_[data-slot=indice-modal-actions]>div>button]:!border-white [&_[data-slot=indice-modal-actions]>div>button]:!bg-white [&_[data-slot=indice-modal-actions]>div>button]:!text-slate-600 [&_[data-slot=indice-modal-actions]>div>button:last-child]:!text-[#B63B32] md:[&_[data-slot=indice-modal-actions]>div]:w-auto md:[&_[data-slot=indice-modal-actions]>div>button]:flex-none"
    title={discard ? copy.discard : copy.newReservation} eyebrow={!discard && !received && query.data ? `${stepIndex+1} / 4 · ${labels[stepIndex]}` : undefined}
    description={<span className="group-data-[dialog-compact-viewport=true]/agenda-booking:sr-only">{discard ? text.discardHint : received ? receiptStatus === 'CONFIRMED' || receiptStatus === 'PAUSED' ? text.existingRequest : text.recordedHint : hints[stepIndex]}</span>}
    icon={<span className="text-xl leading-none">{schedulingEmoji.calendar}</span>}
    footerLeading={!discard ? cancel : undefined} footerSummary={!discard && !received ? progress.summary || undefined : undefined}
    footer={discard ? <><ActionButton onClick={() => setDiscard(false)}>{copy.keepEditing}</ActionButton><ActionButton data-modal-destructive onClick={onClose}>{text.discard}</ActionButton></> : !received ? <div ref={setFooterTarget}/> : undefined}>
    <div hidden={discard}>{query.loading ? <Feedback>{copy.loading}</Feedback> : query.error ? <Feedback error>{copy.error}<ActionButton className="ml-2" onClick={query.reload}>{copy.retry}</ActionButton></Feedback> : query.data &&
      <><BookingForm tone={schedulingTone} context="internal" footerTarget={footerTarget} onDirtyChange={setDirty} onProgressChange={setProgress} catalog={query.data} copy={copy} locale={locale}
        presetDate={suggestedDate} loadSlots={slots} loadCatalog={loadCatalog} onSubmit={submit} onBusyChange={activity} onReceived={result => { completed.current = true; setReceiptStatus(result.status); setReceived(true); }}/>
        {onSetup && (!query.data.staff.length || (!query.data.services.length && !query.data.events.length)) && <div className="mt-4 flex flex-wrap gap-3"><ActionButton onClick={() => onSetup('services')}>{setup.servicesSetup}</ActionButton><ActionButton primary onClick={() => onSetup('team')}>{setup.teamSetup}</ActionButton></div>}
      </>}
    </div>
  </IndiceModalFrame>;
}
