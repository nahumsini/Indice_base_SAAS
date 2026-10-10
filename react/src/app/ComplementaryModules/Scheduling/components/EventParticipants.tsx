import { useCallback, useState } from 'react';
import { IndiceModalFrame } from '../../../components/indice-modal/IndiceModalFrame';
import { schedulingApi, type Event, type Reservation } from '../services/schedulingApi';
import { useSchedulingQuery } from '../hooks/useSchedulingQuery';
import type { SchedulingCopy } from '../translations/schedulingCopy';
import { getSchedulingOperationsCopy } from '../translations/schedulingOperationsCopy';
import { ActionButton, Feedback } from './SchedulingPrimitives';
import { ReservationsTable, type ReservationColumn } from './ReservationsTable';
import { ReservationReview } from './ReservationReview';

export function EventParticipants({ event, copy, locale, onClose }: { event: Event; copy: SchedulingCopy; locale: string; onClose: () => void }) {
  const [page, setPage] = useState(1), [size, setSize] = useState(25), [review, setReview] = useState<Reservation | null>(null);
  const [widths, setWidths] = useState({ time: 200, attendee: 240, service: 180, consultant: 180, status: 140 });
  const query = useSchedulingQuery(useCallback(signal => schedulingApi.participants(event.id, page, signal, size), [event.id, page, size]));
  const op = getSchedulingOperationsCopy(locale);
  const columns = (['time', 'attendee', 'service', 'consultant', 'status'] as ReservationColumn[]).map(id => ({ id,
    label: { time: copy.date, attendee: copy.attendee, service: copy.service, consultant: copy.consultant, status: copy.status }[id],
    width: widths[id], defaultWidth: widths[id], contentMinimumWidth: 140, resizeLabel: copy.edit }));
  if (review) return <ReservationReview record={review} copy={copy} locale={locale} canManage={false} onClose={() => setReview(null)} onSaved={() => { setReview(null); query.reload(); }} />;
  return <IndiceModalFrame open tone="coral" icon="👥" modalType="operational-workspace" title={op.attendees} description={event.title}
    onOpenChange={open => { if (!open) onClose(); }} footer={<ActionButton onClick={onClose}>{copy.close}</ActionButton>}>
    {query.loading ? <Feedback>{copy.loading}</Feedback> : query.error ? <Feedback error>{copy.error}</Feedback> : query.data &&
      <ReservationsTable data={query.data} columns={columns} copy={copy} locale={locale} page={page} size={size} canManage={false} administrator={false}
        onPage={setPage} onSize={value => { setSize(value); setPage(1); }} onResize={(id, width) => setWidths(previous => ({ ...previous, [id]: width }))}
        onReview={setReview} onManage={() => {}} />}
  </IndiceModalFrame>;
}
