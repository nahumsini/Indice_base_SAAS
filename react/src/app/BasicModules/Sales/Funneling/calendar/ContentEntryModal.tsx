import { useEffect, useState, type ReactNode } from 'react';
import { CalendarDays } from 'lucide-react';
import { Button } from '../../../../components/ui/button';
import { SalesModalFrame } from '../../components/SalesModalFrame';
import { getSalesModalActionClassNames } from '../../salesModalStyles';
import type { FunnelCopy } from '../funnelCopy';
import { contentCalendarCopy } from './contentCalendarCopy';
import { channelNames, compatibleFormat, contentChannels, contentFormats, contentPurposes, contentStatuses, validEntry, type ContentEntry } from './contentCalendarModel';

export const calendarControl = 'min-h-11 w-full min-w-0 rounded-xl border border-slate-200 bg-white px-3 py-2 text-base focus:outline-none focus:ring-2 focus:ring-[#FF6B5E]/50 dark:border-slate-700 dark:bg-slate-900';
export function CalendarField({ label, children }: { label: string; children: ReactNode }) {
  return <label className="block min-w-0 space-y-1.5 text-sm"><span className="font-medium">{label}</span>{children}</label>;
}
export function ContentEntryModal({ initial, timeZone, locale, copy, onApply, onClose }: {
  initial: ContentEntry; timeZone: string; locale: string; copy: FunnelCopy; onApply: (entry: ContentEntry) => void; onClose: () => void;
}) {
  const c = contentCalendarCopy(locale), actions = getSalesModalActionClassNames();
  const [entry, setEntry] = useState(initial), [error, setError] = useState(false), [confirm, setConfirm] = useState(false);
  const dirty = JSON.stringify(entry) !== JSON.stringify(initial);
  useEffect(() => { const warn = (event: BeforeUnloadEvent) => { if (dirty) { event.preventDefault(); event.returnValue = ''; } }; window.addEventListener('beforeunload',warn); return () => window.removeEventListener('beforeunload',warn); },[dirty]);
  function close() { if (dirty) setConfirm(true); else onClose(); }
  function patch(value: Partial<ContentEntry>) { setEntry(row => ({ ...row,...value })); setError(false); }
  if (confirm) return <SalesModalFrame open modalType="confirmation" title={copy.discardTitle} description={copy.discardHint} icon={<CalendarDays />} onOpenChange={open => { if (!open) setConfirm(false); }} footer={<><Button className={actions.secondary} onClick={() => setConfirm(false)}>{copy.keepEditing}</Button><Button className={actions.primary} onClick={onClose}>{copy.discard}</Button></>}><p>{entry.title}</p></SalesModalFrame>;
  return <SalesModalFrame open modalType="standard-form" title={initial.title ? c.edit : c.create} description={`${c.timeZone}: ${timeZone}`} icon={<CalendarDays />} onOpenChange={open => { if (!open) close(); }}
    footer={<><Button className={actions.secondary} onClick={close}>{copy.cancel}</Button><Button className={actions.primary} onClick={() => { if (!validEntry(entry)) setError(true); else onApply({ ...entry,title:entry.title.trim() }); }}>{c.saveEntry}</Button></>}>
    <div className="space-y-4">
      {error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950 dark:text-red-200">{c.invalid}</p>}
      <CalendarField label={`${c.titleLabel} *`}><input className={calendarControl} value={entry.title} maxLength={180} onChange={e => patch({title:e.target.value})} /></CalendarField>
      <div className="grid gap-4 sm:grid-cols-2">
        <CalendarField label={c.channel}><select className={calendarControl} value={entry.channel} onChange={e => { const channel = e.target.value as ContentEntry['channel']; patch({channel,format:compatibleFormat(channel,entry.format) ? entry.format : channel === 'GOOGLE_SEARCH' ? 'SEARCH_AD' : 'REEL'}); }}>{contentChannels.map(value => <option key={value} value={value}>{channelNames[value]}</option>)}</select></CalendarField>
        <CalendarField label={c.format}><select className={calendarControl} value={entry.format} onChange={e => patch({format:e.target.value as ContentEntry['format']})}>{contentFormats.filter(value => compatibleFormat(entry.channel,value)).map(value => <option key={value} value={value}>{c.formats[value]}</option>)}</select></CalendarField>
        <CalendarField label={c.date}><input className={calendarControl} type="date" min="2000-01-01" max="2100-12-31" value={entry.date || ''} onChange={e => patch({date:e.target.value || null,...(!e.target.value ? {time:null,status:'IDEA'} : entry.status === 'IDEA' ? {status:'PLANNED'} : {})})} /></CalendarField>
        <CalendarField label={c.time}><input className={calendarControl} type="time" disabled={!entry.date} value={entry.time || ''} onChange={e => patch({time:e.target.value || null})} /></CalendarField>
        <CalendarField label={c.status}><select className={calendarControl} value={entry.status} onChange={e => patch({status:e.target.value as ContentEntry['status']})}>{contentStatuses.map(value => <option key={value} value={value}>{c.statuses[value]}</option>)}</select></CalendarField>
        <CalendarField label={c.purpose}><select className={calendarControl} value={entry.purpose} onChange={e => patch({purpose:e.target.value as ContentEntry['purpose']})}>{contentPurposes.map(value => <option key={value} value={value}>{c.purposes[value]}</option>)}</select></CalendarField>
      </div>
      <CalendarField label={c.brief}><textarea className={calendarControl} rows={4} maxLength={2000} value={entry.brief} onChange={e => patch({brief:e.target.value})} /></CalendarField>
      <CalendarField label={c.cta}><input className={calendarControl} maxLength={300} value={entry.callToAction} onChange={e => patch({callToAction:e.target.value})} /></CalendarField>
      <div className="grid gap-4 sm:grid-cols-2">
        <CalendarField label={c.owner}><input className={calendarControl} maxLength={180} value={entry.owner} onChange={e => patch({owner:e.target.value})} /></CalendarField>
        <CalendarField label={c.reference}><input className={calendarControl} type="url" placeholder="https://" maxLength={500} value={entry.reference} onChange={e => patch({reference:e.target.value})} /></CalendarField>
      </div>
      {entry.status === 'CANCELLED' && <p className="text-sm text-slate-500 dark:text-slate-400">{c.cancelledHint}</p>}
    </div>
  </SalesModalFrame>;
}
