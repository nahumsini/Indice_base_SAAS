import { useState } from 'react';
import { IndiceModalFrame } from '../../../components/indice-modal/IndiceModalFrame';
import { schedulingApi, type Reservation, type ReservationStatus } from '../services/schedulingApi';
import type { SchedulingCopy } from '../translations/schedulingCopy';
import { ActionButton, controlClass, EditorFrame, Field, StatusBadge } from './SchedulingPrimitives';
import { schedulingEmoji, schedulingTone } from '../utils/schedulingIdentity';

export function ReservationReview({ record, copy, locale, canManage, onClose, onSaved }: { record: Reservation; copy: SchedulingCopy; locale: string;
  canManage: boolean; onClose: () => void; onSaved: () => void }) {
  const allowed: ReservationStatus[] = record.status === 'REQUESTED' ? ['CONFIRMED', 'CANCELLED'] : record.status === 'CONFIRMED' ?
    (new Date(record.startAt) > new Date() ? ['CANCELLED'] : ['COMPLETED', 'NO_SHOW', 'CANCELLED']) : [];
  const [status, setStatus] = useState<ReservationStatus>(allowed[0] ?? record.status), [reason, setReason] = useState('');
  const summary = <section className="space-y-4"><StatusBadge status={record.status} copy={copy} />
    <dl className="grid gap-4 text-sm sm:grid-cols-2">{[
      [copy.service, record.serviceName], [copy.consultant, record.staffName], [copy.attendee, record.attendeeName], [copy.email, record.attendeeEmail],
      [copy.company, record.attendeeCompany || '—'], [copy.date, new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(record.startAt))],
    ].map(([label, value]) => <div key={label}><dt className="text-slate-500 dark:text-slate-400">{label}</dt><dd className="mt-1 break-words text-slate-900 dark:text-white">{value}</dd></div>)}</dl>
    <p className="text-xs text-slate-500">{record.reference} · {Intl.DateTimeFormat().resolvedOptions().timeZone}</p>
  </section>;
  if (!canManage || !allowed.length) return <IndiceModalFrame open onOpenChange={open => { if (!open) onClose(); }} title={copy.details} description={copy.reservationsHint}
    icon={<span className="text-xl leading-none">{schedulingEmoji.calendar}</span>} tone={schedulingTone} modalType="standard-form" footer={<ActionButton onClick={onClose}>{copy.close}</ActionButton>}>{summary}</IndiceModalFrame>;
  return <EditorFrame title={copy.details} description={copy.reservationsHint} copy={copy} onClose={onClose} onSaved={onSaved}
    onSave={() => schedulingApi.transition(record, status, reason)}>
    {summary}
    <Field label={copy.status}><select className={controlClass} value={status} onChange={e => setStatus(e.target.value as ReservationStatus)}>{allowed.map(s => <option key={s} value={s}>{copy[s]}</option>)}</select></Field>
    {status === 'CANCELLED' && <Field label={copy.reason}><textarea className={`${controlClass} h-24 py-3`} required maxLength={500} value={reason} onChange={e => setReason(e.target.value)} /></Field>}
  </EditorFrame>;
}
