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
  const slots = useCallback((request: SlotRequest, signal: AbortSignal) => schedulingApi.slots(request, signal), []);
  const submit = useCallback((request: BookingRequest, key: string) => schedulingApi.request(request, key), []);
  const close = () => received ? onClose() : setDiscard(true);
  return <IndiceModalFrame open busy={busy} onOpenChange={open => { if (!open) close(); }} tone={schedulingTone} modalType={discard ? 'confirmation' : 'wizard'}
    title={discard ? copy.discard : copy.newReservation} description={copy.reservationsHint} icon={<span className="text-xl leading-none">{schedulingEmoji.calendar}</span>} footer={discard ? <>
      <ActionButton onClick={() => setDiscard(false)}>{copy.keepEditing}</ActionButton><ActionButton onClick={onClose}>{copy.close}</ActionButton>
    </> : <ActionButton disabled={busy} onClick={close}>{copy.close}</ActionButton>}>
    <div className={discard ? 'hidden' : ''}>{query.loading ? <Feedback>{copy.loading}</Feedback> : query.error ? <Feedback error>{copy.error}</Feedback> : query.data &&
      <BookingForm tone={schedulingTone} catalog={query.data} copy={copy} locale={locale} loadSlots={slots} onSubmit={submit} onBusyChange={setBusy} onReceived={() => setReceived(true)} />}</div>
  </IndiceModalFrame>;
}
