import { useState } from 'react';
import { schedulingApi, type Staff } from '../services/schedulingApi';
import type { SchedulingCopy } from '../translations/schedulingCopy';
import { controlClass, EditorFrame, Field } from './SchedulingPrimitives';
import { schedulingEmoji } from '../utils/schedulingIdentity';

export function StaffEditor({ staff, members, copy, locale, onClose, onSaved }: { staff?: Staff; members: { id: number; name: string }[];
  copy: SchedulingCopy; locale: string; onClose: () => void; onSaved: () => void }) {
  const [draft, setDraft] = useState({ userId: staff?.userId ?? 0, publicName: staff?.publicName ?? '', timezone: staff?.timezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone,
    active: staff?.active ?? true, days: staff?.days ?? [1, 2, 3, 4, 5].map(dayOfWeek => ({ dayOfWeek, startTime: '09:00', endTime: '17:00' })) });
  const weekday = (day: number) => new Intl.DateTimeFormat(locale, { weekday: 'long', timeZone: 'UTC' }).format(new Date(Date.UTC(2026, 0, 4 + day)));
  return <EditorFrame icon={schedulingEmoji.team} title={staff ? copy.edit : copy.newStaff} description={copy.configurationHint} copy={copy} onClose={onClose} onSaved={onSaved}
    onSave={() => schedulingApi.saveStaff({ ...draft, version: staff?.version }, staff?.id)}>
    <div className="grid gap-4 sm:grid-cols-2"><Field label={copy.member}><select className={controlClass} required disabled={Boolean(staff)} value={draft.userId || ''}
      onChange={e => { const member = members.find(m => m.id === Number(e.target.value)); setDraft({ ...draft, userId: Number(e.target.value), publicName: member?.name ?? '' }); }}>
      <option value="">{copy.selectOption}</option>{members.map(member => <option key={member.id} value={member.id}>{member.name}</option>)}</select></Field>
      <Field label={copy.name}><input className={controlClass} required maxLength={180} value={draft.publicName} onChange={e => setDraft({ ...draft, publicName: e.target.value })} /></Field>
      <Field label={copy.timezone}><input className={controlClass} required maxLength={80} value={draft.timezone} onChange={e => setDraft({ ...draft, timezone: e.target.value })} /></Field>
      <label className="flex min-h-11 items-center gap-3 text-sm sm:mt-7"><input type="checkbox" className="h-4 w-4 accent-[#FF6B5E]" checked={draft.active} onChange={e => setDraft({ ...draft, active: e.target.checked })} />{copy.active}</label>
    </div>
    <fieldset className="space-y-3"><legend className="mb-3 text-sm font-medium">{copy.weekly}</legend>{[1, 2, 3, 4, 5, 6, 7].map(day => {
      const window = draft.days.find(d => d.dayOfWeek === day);
      return <div key={day} className="grid gap-3 rounded-xl bg-slate-50 p-3 dark:bg-slate-800 sm:grid-cols-[1fr_1fr_1fr]">
        <label className="flex min-h-11 items-center gap-3 text-sm"><input type="checkbox" className="h-4 w-4 accent-[#FF6B5E]" checked={Boolean(window)} onChange={e => setDraft({ ...draft,
          days: e.target.checked ? [...draft.days, { dayOfWeek: day, startTime: '09:00', endTime: '17:00' }] : draft.days.filter(d => d.dayOfWeek !== day) })} />{weekday(day)}</label>
        {(['startTime', 'endTime'] as const).map(key => <Field key={key} label={`${key === 'startTime' ? copy.start : copy.end} · ${weekday(day)}`}>
          <input className={controlClass} type="time" required={Boolean(window)} disabled={!window} value={window?.[key]?.slice(0, 5) ?? ''} step={60}
            onChange={e => setDraft({ ...draft, days: draft.days.map(d => d.dayOfWeek === day ? { ...d, [key]: e.target.value } : d) })} /></Field>)}
      </div>;
    })}</fieldset>
  </EditorFrame>;
}
