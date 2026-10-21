import { useCallback, useRef, useState } from 'react';
import { schedulingApi, type Staff } from '../services/schedulingApi';
import type { SchedulingCopy } from '../translations/schedulingCopy';
import { ActionButton, controlClass, EditorFrame, Feedback, Field } from './SchedulingPrimitives';
import { schedulingEmoji } from '../utils/schedulingIdentity';
import { getSchedulingOperationsCopy } from '../translations/schedulingOperationsCopy';
import { WeeklyHours } from './WeeklyHours';
import { getSchedulingSetupCopy } from '../translations/schedulingSetupCopy';
import { SchedulingValidationError, validWeeklyHours } from '../utils/setupValidation';
import { useSchedulingQuery } from '../hooks/useSchedulingQuery';

export function StaffEditor({ staff, members, copy, locale, onClose, onSaved }: { staff?: Staff; members: { id: number; name: string }[];
  copy: SchedulingCopy; locale: string; onClose: () => void; onSaved: () => void }) {
  const setup = getSchedulingSetupCopy(locale);
  const op = getSchedulingOperationsCopy(locale), [date,setDate] = useState('');
  const services = useSchedulingQuery(useCallback(signal => schedulingApi.services(signal), []));
  const [draft, setDraft] = useState({ userId: staff?.userId ?? 0, publicName: staff?.publicName ?? '', timezone: staff?.timezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone,
    active: staff?.active ?? true, days: staff?.days ?? [1, 2, 3, 4, 5].map(dayOfWeek => ({ dayOfWeek, startTime: '09:00', endTime: '17:00' })),
    bufferMinutes: staff?.bufferMinutes ?? 0, unavailableDates: staff?.unavailableDates ?? [], serviceIds: staff?.serviceIds ?? [] });
  const initialDraft = useRef(JSON.stringify(draft));
  return <EditorFrame icon={schedulingEmoji.team} title={staff ? copy.edit : copy.newStaff} description={copy.configurationHint} copy={copy} onClose={onClose} onSaved={onSaved}
    hasChanges={JSON.stringify(draft) !== initialDraft.current} onSave={() => { if(!validWeeklyHours(draft.days))throw new SchedulingValidationError("scheduling_hours_invalid");return schedulingApi.saveStaff({ ...draft, version: staff?.version }, staff?.id); }}>
    <p className="text-sm leading-6 text-slate-500">{setup.employeeHint}</p>{!members.length&&!staff&&<Feedback>{setup.noEmployees}</Feedback>}
    <div className="grid gap-4 sm:grid-cols-2"><Field label={copy.member}><select className={controlClass} required disabled={Boolean(staff)} value={draft.userId || ''}
      onChange={e => { const member = members.find(m => m.id === Number(e.target.value)); setDraft({ ...draft, userId: Number(e.target.value), publicName: member?.name ?? '' }); }}>
      <option value="">{copy.selectOption}</option>{staff&&!members.some(m=>m.id===staff.userId)&&<option value={staff.userId}>{staff.publicName} · {setup.legacyEmployee}</option>}{members.map(member => <option key={member.id} value={member.id}>{member.name}</option>)}</select></Field>
      <Field label={copy.name}><input className={controlClass} required maxLength={180} value={draft.publicName} onChange={e => setDraft({ ...draft, publicName: e.target.value })} /></Field>
      <Field label={copy.timezone}><select className={controlClass} required value={draft.timezone} onChange={e => setDraft({ ...draft, timezone: e.target.value })}>{[...new Set([draft.timezone,"America/Mexico_City","America/Cancun","America/Tijuana","America/Toronto","America/Vancouver","America/New_York","America/Bogota","America/Sao_Paulo","Europe/Madrid","UTC"])].map(zone=><option key={zone} value={zone}>{zone}</option>)}</select></Field>
      <label className="flex min-h-11 items-center gap-3 text-sm sm:mt-7"><input type="checkbox" className="h-4 w-4 accent-[#FF6B5E]" checked={draft.active} onChange={e => setDraft({ ...draft, active: e.target.checked })} />{copy.active}</label>
    </div>
    <Field label={setup.sessionGap}><select className={controlClass} value={draft.bufferMinutes} onChange={e=>setDraft({...draft,bufferMinutes:Number(e.target.value)})}>{[...new Set([0,5,10,15,20,30,45,60,90,120,draft.bufferMinutes])].sort((a,b)=>a-b).map(value=><option key={value} value={value}>{value} {copy.minutes}</option>)}</select></Field><p className="text-sm text-slate-500">{setup.gapHint}</p>
    <fieldset><legend className="mb-3 text-sm font-medium">{copy.weekly}</legend><WeeklyHours days={draft.days} onChange={days=>setDraft({...draft,days})} locale={locale} copy={copy}/></fieldset>
    <fieldset className="space-y-3"><legend className="font-medium">{op.unavailableDates}</legend>
      <div className="flex flex-wrap items-end gap-3"><Field label={copy.date}><input className={controlClass} type="date" value={date} onChange={e=>setDate(e.target.value)}/></Field>
        <ActionButton disabled={!date||draft.unavailableDates.includes(date)||draft.unavailableDates.length>=366} onClick={()=>{setDraft({...draft,unavailableDates:[...draft.unavailableDates,date].sort()});setDate('');}}>{op.addDate}</ActionButton></div>
      <ul className="flex flex-wrap gap-2">{draft.unavailableDates.map(d=><li key={d}><ActionButton aria-label={op.remove+': '+d} onClick={()=>setDraft({...draft,unavailableDates:draft.unavailableDates.filter(v=>v!==d)})}>{d} ×</ActionButton></li>)}</ul>
    </fieldset>
    <fieldset className="space-y-3"><legend className="font-medium">{copy.services}</legend><p className="text-sm text-slate-500">{op.servicesHint}</p>
      {services.loading && <Feedback>{copy.loading}</Feedback>}{services.error && <Feedback error>{copy.error}</Feedback>}
      <div className="grid gap-2 sm:grid-cols-2">{services.data?.map(service=><label key={service.id} className="flex min-h-11 items-center gap-3 text-sm">
        <input type="checkbox" checked={draft.serviceIds.includes(service.id)} onChange={e=>setDraft({...draft,serviceIds:e.target.checked?[...draft.serviceIds,service.id]:draft.serviceIds.filter(id=>id!==service.id)})}/>{service.name}
      </label>)}</div>
    </fieldset>
  </EditorFrame>;
}
