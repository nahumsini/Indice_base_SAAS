import { useState } from 'react';
import { schedulingApi, type BookingCatalog, type Event } from '../services/schedulingApi';
import type { SchedulingCopy } from '../translations/schedulingCopy';
import { controlClass, EditorFrame, Field } from './SchedulingPrimitives';
import { schedulingEmoji } from '../utils/schedulingIdentity';

export function EventEditor({ event, catalog, copy, onClose, onSaved }: { event?: Event; catalog: BookingCatalog;
  copy: SchedulingCopy; onClose: () => void; onSaved: () => void }) {
  const localDate = event ? new Date(new Date(event.startAt).getTime() - new Date(event.startAt).getTimezoneOffset() * 60000).toISOString().slice(0, 16) : '';
  const [draft, setDraft] = useState({ staffId: event?.staffId ?? 0, title: event?.title ?? '', description: event?.description ?? '',
    startAt: localDate, durationMinutes: event?.durationMinutes ?? 60, capacity: event?.capacity ?? 30, published: event?.published ?? false });
  return <EditorFrame icon={schedulingEmoji.events} title={event ? copy.edit : copy.newEvent} description={copy.eventsHint} copy={copy} onClose={onClose} onSaved={onSaved}
    onSave={() => schedulingApi.saveEvent({ ...draft, startAt: new Date(draft.startAt).toISOString(), version: event?.version }, event?.id)}>
    <Field label={copy.name}><input className={controlClass} required maxLength={180} value={draft.title} onChange={e => setDraft({ ...draft, title: e.target.value })} /></Field>
    <Field label={copy.description}><textarea className={`${controlClass} h-24 py-3`} maxLength={1500} value={draft.description} onChange={e => setDraft({ ...draft, description: e.target.value })} /></Field>
    <div className="grid gap-4 sm:grid-cols-2"><Field label={copy.consultant}><select className={controlClass} required value={draft.staffId || ''} onChange={e => setDraft({ ...draft, staffId: Number(e.target.value) })}>
      <option value="">{copy.selectOption}</option>{catalog.staff.map(s => <option key={s.id} value={s.id}>{s.publicName}</option>)}</select></Field>
      <Field label={`${copy.eventAt} · ${Intl.DateTimeFormat().resolvedOptions().timeZone}`}><input className={controlClass} type="datetime-local" required value={draft.startAt} onChange={e => setDraft({ ...draft, startAt: e.target.value })} /></Field>
      <Field label={copy.duration}><input className={controlClass} type="number" required min={15} max={180} value={draft.durationMinutes} onChange={e => setDraft({ ...draft, durationMinutes: Number(e.target.value) })} /></Field>
      <Field label={copy.capacity}><input className={controlClass} type="number" required min={1} max={1000} value={draft.capacity} onChange={e => setDraft({ ...draft, capacity: Number(e.target.value) })} /></Field>
    </div>
    <label className="flex min-h-11 items-center gap-3 text-sm"><input type="checkbox" className="h-4 w-4 accent-[#FF6B5E]" checked={draft.published} onChange={e => setDraft({ ...draft, published: e.target.checked })} />{copy.published}</label>
  </EditorFrame>;
}
