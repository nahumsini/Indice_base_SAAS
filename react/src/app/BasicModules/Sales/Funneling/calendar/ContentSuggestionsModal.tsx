import { useEffect, useMemo, useState } from 'react';
import { Sparkles } from 'lucide-react';
import { Button } from '../../../../components/ui/button';
import { SalesModalFrame } from '../../components/SalesModalFrame';
import { getSalesModalActionClassNames } from '../../salesModalStyles';
import { campaignCopy } from '../campaignCopy';
import { campaignGoals } from '../campaignModel';
import type { FunnelCopy } from '../funnelCopy';
import type { FunnelPlan } from '../funnelModel';
import { CalendarField, calendarControl } from './ContentEntryModal';
import { contentCalendarCopy } from './contentCalendarCopy';
import { channelNames, compatibleFormat, contentChannels, contentFormats, suggestContent, validSettings, type ContentEntry, type ContentSettings } from './contentCalendarModel';

export function ContentSuggestionsModal({ plan, initial, existing, timeZone, locale, copy, onApply, onClose }: {
  plan: FunnelPlan; initial: ContentSettings; existing: number; timeZone: string; locale: string; copy: FunnelCopy;
  onApply: (settings: ContentSettings, entries: ContentEntry[]) => void; onClose: () => void;
}) {
  const c = contentCalendarCopy(locale), campaign = campaignCopy(locale), actions = getSalesModalActionClassNames();
  const [settings,setSettings] = useState(initial), [proposal,setProposal] = useState<ContentEntry[]>([]);
  const [selected,setSelected] = useState<string[]>([]), [error,setError] = useState(false), [confirm,setConfirm] = useState(false);
  const dirty = JSON.stringify(settings) !== JSON.stringify(initial) || proposal.length > 0;
  useEffect(() => { const warn = (event: BeforeUnloadEvent) => { if (dirty) { event.preventDefault(); event.returnValue = ''; } }; window.addEventListener('beforeunload',warn); return () => window.removeEventListener('beforeunload',warn); },[dirty]);
  const days = useMemo(() => [1,2,3,4,5,6,0].map(value => ({ value, label:new Intl.DateTimeFormat(locale,{weekday:'short',timeZone:'UTC'}).format(new Date(Date.UTC(2026,9,18+value))) })),[locale]);
  function patch(value: Partial<ContentSettings>) { setSettings(s => ({...s,...value})); setProposal([]); setSelected([]); setError(false); }
  function close() { if (dirty) setConfirm(true); else onClose(); }
  function changeChannel(channel: ContentEntry['channel'], enabled: boolean) {
    const channels = enabled ? [...settings.channels,channel] : settings.channels.filter(value => value !== channel);
    let formats = settings.formats.filter(format => channels.some(value => compatibleFormat(value,format)));
    if (enabled && !formats.some(format => compatibleFormat(channel,format))) formats = [...formats,channel === 'GOOGLE_SEARCH' ? 'SEARCH_AD' : 'REEL'];
    patch({channels,formats});
  }
  if (confirm) return <SalesModalFrame open modalType="confirmation" title={copy.discardTitle} description={copy.discardHint} icon={<Sparkles />} onOpenChange={open => { if (!open) setConfirm(false); }} footer={<><Button className={actions.secondary} onClick={() => setConfirm(false)}>{copy.keepEditing}</Button><Button className={actions.primary} onClick={onClose}>{copy.discard}</Button></>}><p>{plan.name}</p></SalesModalFrame>;
  return <SalesModalFrame open modalType="operational-workspace" title={c.suggest} description={c.suggestionHint} icon={<Sparkles />} onOpenChange={open => { if (!open) close(); }}
    footerLeading={<Button className={actions.secondary} onClick={close}>{copy.cancel}</Button>} footerSummary={`${c.selected}: ${selected.length} · ${timeZone}`}
    footer={<Button className={actions.primary} disabled={!selected.length || selected.length + existing > 200} onClick={() => onApply(settings,proposal.filter(entry => selected.includes(entry.id)))}>{c.apply}</Button>}>
    <div className="grid min-w-0 items-start gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
      <div className="min-w-0 space-y-4">
        {error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950 dark:text-red-200">{c.invalidSettings}</p>}
        <CalendarField label={`${c.topic} *`}><input className={calendarControl} value={settings.topic} maxLength={300} onChange={e => patch({topic:e.target.value})} /></CalendarField>
        <CalendarField label={campaign.goal}><select className={calendarControl} value={settings.goal} onChange={e => patch({goal:e.target.value as ContentSettings['goal']})}>{campaignGoals.filter(value => value !== 'UNDECIDED').map(value => <option key={value} value={value}>{campaign[`goal_${value}`]}</option>)}</select></CalendarField>
        <fieldset><legend className="mb-2 text-sm font-medium">{campaign.channels}</legend><div className="flex flex-wrap gap-2">{contentChannels.map(channel => <label key={channel} className="flex min-h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-900"><input type="checkbox" checked={settings.channels.includes(channel)} onChange={e => changeChannel(channel,e.target.checked)} />{channelNames[channel]}</label>)}</div></fieldset>
        <fieldset><legend className="mb-2 text-sm font-medium">{c.format}</legend><div className="flex flex-wrap gap-2">{contentFormats.filter(format => settings.channels.some(channel => compatibleFormat(channel,format))).map(format => <label key={format} className="flex min-h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-900"><input type="checkbox" checked={settings.formats.includes(format)} onChange={e => patch({formats:e.target.checked ? [...settings.formats,format] : settings.formats.filter(value => value !== format)})} />{c.formats[format]}</label>)}</div></fieldset>
        <div className="grid gap-4 sm:grid-cols-2"><CalendarField label={c.start}><input type="date" min="2000-01-01" max="2100-12-31" className={calendarControl} value={settings.startDate} onChange={e => patch({startDate:e.target.value})} /></CalendarField><CalendarField label={c.weeks}><select className={calendarControl} value={settings.weeks} onChange={e => patch({weeks:Number(e.target.value)})}>{[1,2,3,4,6,8].map(value => <option key={value}>{value}</option>)}</select></CalendarField></div>
        <fieldset><legend className="mb-2 text-sm font-medium">{c.days}</legend><div className="flex flex-wrap gap-2">{days.map(day => <label key={day.value} className="flex min-h-11 items-center gap-2 rounded-xl border border-slate-200 px-3 text-sm dark:border-slate-700"><input type="checkbox" checked={settings.days.includes(day.value)} onChange={e => patch({days:e.target.checked ? [...settings.days,day.value] : settings.days.filter(value => value !== day.value)})} />{day.label}</label>)}</div></fieldset>
        <CalendarField label={`${c.time} · ${timeZone}`}><input type="time" className={calendarControl} value={settings.time} onChange={e => patch({time:e.target.value})} /></CalendarField>
        <Button variant="outline" className="min-h-11 w-full gap-2 dark:bg-slate-800 dark:text-slate-100 dark:border-slate-700" onClick={() => { if (!validSettings(settings)) { setError(true); return; } const result = suggestContent(plan,settings,locale); setProposal(result); setSelected(result.map(entry => entry.id)); }}><Sparkles className="h-4 w-4" />{c.generate}</Button>
        <p className="text-xs leading-5 text-slate-500 dark:text-slate-400">{c.rules}</p>
      </div>
      <section className="min-w-0 space-y-4 rounded-2xl border border-[#FF6B5E]/20 bg-[#FF6B5E]/5 p-4" aria-label={c.review}>
        <h3 className="text-lg font-medium">{c.review}</h3><p className="text-sm text-slate-600 dark:text-slate-300">{c.reviewHint}</p>
        {proposal.length > 0 && <label className="flex min-h-11 items-center gap-2 text-sm"><input type="checkbox" checked={selected.length === proposal.length} onChange={e => setSelected(e.target.checked ? proposal.map(entry => entry.id) : [])} />{c.selectAll} · {proposal.length}</label>}
        {selected.length + existing > 200 && <p role="alert" className="text-sm text-red-700 dark:text-red-300">{c.limit}</p>}
        <div className="max-h-[60vh] space-y-3 overflow-y-auto">{proposal.map(entry => <label key={entry.id} className="flex gap-3 rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-900"><input className="mt-1 h-5 w-5 shrink-0" type="checkbox" checked={selected.includes(entry.id)} onChange={e => setSelected(ids => e.target.checked ? [...ids,entry.id] : ids.filter(id => id !== entry.id))} /><span className="min-w-0 space-y-1"><span className="block text-xs text-slate-500 dark:text-slate-400">{new Intl.DateTimeFormat(locale,{day:'numeric',month:'short',year:'numeric',timeZone:'UTC'}).format(new Date(`${entry.date}T12:00:00Z`))} · {entry.time} · {channelNames[entry.channel]}</span><span className="block break-words text-sm font-medium">{entry.title}</span><span className="block text-xs text-[#b63b32] dark:text-[#ffb0aa]">{c.formats[entry.format]} · {c.purposes[entry.purpose]}</span><span className="block text-sm text-slate-600 dark:text-slate-300">{entry.callToAction}</span></span></label>)}</div>
      </section>
    </div>
  </SalesModalFrame>;
}
