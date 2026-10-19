import { useCallback, useState } from 'react';
import { IndiceModalFrame } from '../../../components/indice-modal/IndiceModalFrame';
import { schedulingApi, type SlotRequest, type BookingRequest } from '../services/schedulingApi';
import { useSchedulingQuery } from '../hooks/useSchedulingQuery';
import type { SchedulingCopy } from '../translations/schedulingCopy';
import { ActionButton, Feedback } from './SchedulingPrimitives';
import { BookingForm } from './BookingForm';
import { schedulingEmoji, schedulingTone } from '../utils/schedulingIdentity';

export function InternalBookingModal({ copy, locale, onClose }: { copy: SchedulingCopy; locale: string; onClose: () => void }) {
  const query = useSchedulingQuery(useCallback((signal: AbortSignal) => schedulingApi.catalog(signal), []));
  const [busy, setBusy] = useState(false), [discard, setDiscard] = useState(false);
  const [received, setReceived] = useState(false);
  const [dirty,setDirty] = useState(false), [footerTarget,setFooterTarget] = useState<HTMLDivElement|null>(null);
  const slots = useCallback((request: SlotRequest, signal: AbortSignal) => schedulingApi.slots(request, signal), []);
  const submit = useCallback((request: BookingRequest, key: string) => schedulingApi.request(request, key), []);
  const close = () => received || !dirty ? onClose() : setDiscard(true);
  return <IndiceModalFrame open busy={busy} onOpenChange={open => { if (!open) close(); }} tone={schedulingTone} modalType={discard ? 'confirmation' : 'wizard'}
    contentClassName="group/agenda-booking data-[dialog-compact-viewport=true]:!overflow-hidden"
    bodyClassName="group-data-[dialog-compact-viewport=true]/agenda-booking:!flex-[1_1_0%] group-data-[dialog-compact-viewport=true]/agenda-booking:!overflow-y-auto"
    footerClassName="max-md:[&_[data-slot=indice-modal-actions]]:!flex-nowrap max-md:[&_[data-slot=indice-modal-actions]>button]:!basis-0 max-md:[&_[data-slot=indice-modal-actions]>div]:!w-auto max-md:[&_[data-slot=indice-modal-actions]>div]:!flex-[2_1_0%] max-md:[&_[data-slot=indice-modal-actions]_button]:!px-3 max-md:[&_[data-slot=indice-modal-actions]>div>button]:!basis-0"
    title={discard ? copy.discard : copy.newReservation} description={<span className="group-data-[dialog-compact-viewport=true]/agenda-booking:sr-only">{copy.reservationsHint}</span>} icon={<span className="text-xl leading-none">{schedulingEmoji.calendar}</span>} footer={discard ? <>
      <ActionButton onClick={() => setDiscard(false)}>{copy.keepEditing}</ActionButton><ActionButton onClick={onClose}>{copy.close}</ActionButton>
    </> : <><ActionButton disabled={busy} onClick={close}>{received?copy.close:copy.cancel}</ActionButton><div ref={setFooterTarget} className="ml-auto flex flex-wrap gap-3"/></>}>
    <div className={discard ? 'hidden' : ''}>{query.loading ? <Feedback>{copy.loading}</Feedback> : query.error ? <Feedback error>{copy.error}</Feedback> : query.data &&
      <BookingForm tone={schedulingTone} footerTarget={footerTarget} onDirtyChange={setDirty} catalog={query.data} copy={copy} locale={locale} loadSlots={slots} onSubmit={submit} onBusyChange={setBusy} onReceived={() => setReceived(true)} />}</div>
  </IndiceModalFrame>;
}
