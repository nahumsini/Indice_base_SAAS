import { useState } from 'react';
import { schedulingApi, type Service } from '../services/schedulingApi';
import type { SchedulingCopy } from '../translations/schedulingCopy';
import { controlClass, EditorFrame, Field } from './SchedulingPrimitives';
import { schedulingEmoji } from '../utils/schedulingIdentity';

export function ServiceEditor({ service, copy, onClose, onSaved }: { service?: Service; copy: SchedulingCopy; onClose: () => void; onSaved: () => void }) {
  const [draft, setDraft] = useState({ name: service?.name ?? '', description: service?.description ?? '', durationMinutes: service?.durationMinutes ?? 60,
    bufferMinutes: service?.bufferMinutes ?? 15, noticeHours: service?.noticeHours ?? 24, active: service?.active ?? true });
  return <EditorFrame icon={schedulingEmoji.services} title={service ? copy.edit : copy.newService} description={copy.configurationHint} copy={copy} onClose={onClose} onSaved={onSaved}
    onSave={() => schedulingApi.saveService({ ...draft, version: service?.version }, service?.id)}>
    <Field label={copy.name}><input className={controlClass} required maxLength={180} value={draft.name} onChange={e => setDraft({ ...draft, name: e.target.value })} /></Field>
    <Field label={copy.description}><textarea className={`${controlClass} h-24 py-3`} maxLength={1500} value={draft.description} onChange={e => setDraft({ ...draft, description: e.target.value })} /></Field>
    <div className="grid gap-4 sm:grid-cols-3">{(['durationMinutes', 'bufferMinutes', 'noticeHours'] as const).map(key => <Field key={key}
      label={{ durationMinutes: copy.duration, bufferMinutes: copy.buffer, noticeHours: copy.notice }[key]}><input className={controlClass} type="number" required
        min={key === 'durationMinutes' ? 15 : key === 'bufferMinutes' ? 0 : 1} max={key === 'durationMinutes' ? 180 : key === 'bufferMinutes' ? 60 : 720}
        value={draft[key]} onChange={e => setDraft({ ...draft, [key]: Number(e.target.value) })} /></Field>)}</div>
    <label className="flex min-h-11 items-center gap-3 text-sm"><input type="checkbox" className="h-4 w-4 accent-[#FF6B5E]" checked={draft.active} onChange={e => setDraft({ ...draft, active: e.target.checked })} />{copy.active}</label>
  </EditorFrame>;
}
