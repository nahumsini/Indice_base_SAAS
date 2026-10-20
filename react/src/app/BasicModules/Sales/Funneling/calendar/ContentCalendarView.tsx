import { useMemo, useState } from 'react';
import { CalendarDays, ChevronLeft, ChevronRight, FileText, Plus, Save, Settings, Sparkles } from 'lucide-react';
import { Button } from '../../../../components/ui/button';
import { IndiceViewState, IndiceWorkspaceNavigation } from '../../../../components/frontend-os';
import { useWorkspaceNavigationMemory } from '../../../../hooks/useWorkspaceNavigationMemory';
import { SalesModalFrame } from '../../components/SalesModalFrame';
import { salesTitleBarPrimaryActionClassName } from '../../components/SalesTitleBar';
import { getSalesModalActionClassNames } from '../../salesModalStyles';
import { CampaignPromptTools } from '../CampaignPromptTools';
import { campaignCopy } from '../campaignCopy';
import { contentGenerationCopy } from '../contentGenerationCopy';
import type { FunnelCopy } from '../funnelCopy';
import type { FunnelPlan } from '../funnelModel';
import type { ContentNavigationGuard } from '../useCampaignContent';
import { ContentCalendarBoard } from './ContentCalendarBoard';
import { CalendarField, calendarControl, ContentEntryModal } from './ContentEntryModal';
import { ContentSuggestionsModal } from './ContentSuggestionsModal';
import { contentCalendarCopy } from './contentCalendarCopy';
import { calendarDays, contentStatuses, dateInZone, defaultSettings, newContentEntry, shiftPeriod, sortedEntries, validDate, type CalendarMode, type ContentEntry } from './contentCalendarModel';
import { useContentCalendar } from './useContentCalendar';

export function ContentCalendarView({ plan, plans, total, locale, copy, guard, onSelect }: {
  plan: FunnelPlan; plans: FunnelPlan[]; total: number; locale: string; copy: FunnelCopy;
  guard: ContentNavigationGuard; onSelect: (id: string) => void;
}) {
  const c = contentCalendarCopy(locale), campaign = campaignCopy(locale), g = contentGenerationCopy(locale), actions = getSalesModalActionClassNames();
  const editor = useContentCalendar(plan.id,guard);
  const [entry,setEntry] = useState<ContentEntry|null>(null), [suggesting,setSuggesting] = useState(false);
  const [preferences,setPreferences] = useState(false), [exporting,setExporting] = useState(false), [zone,setZone] = useState('UTC');
  const defaults = useMemo(() => ({ anchor:dateInZone(Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'), mode:'month' as CalendarMode, status:'ALL' }),[]);
  const [view,setView] = useState(defaults);
  useWorkspaceNavigationMemory({ moduleKey:'crm',tabKey:'funneling-content-calendar',state:view,defaults,onRestore:value => setView({
    anchor:validDate(value.anchor) ? value.anchor : defaults.anchor,
    mode:['month','week','agenda'].includes(value.mode) ? value.mode : 'month',
    status:contentStatuses.includes(value.status as ContentEntry['status']) ? value.status : 'ALL',
  }) });
  const zones = useMemo(() => {
    const supported = (Intl as typeof Intl & { supportedValuesOf?: (key: 'timeZone') => string[] }).supportedValuesOf;
    return [...new Set(['UTC',...(supported?.('timeZone') ?? ['America/Mexico_City','America/Toronto','America/Bogota']),editor.draft?.timeZone ?? 'UTC'])].sort();
  },[editor.draft?.timeZone]);
  if (editor.loading) return <IndiceViewState variant="loading" title={copy.loading} tone="coral" />;
  if (!editor.draft || editor.error === 'load') return <IndiceViewState variant="error" title={copy.loadError} tone="coral" action={<Button onClick={editor.reload}>{copy.retry}</Button>} />;
  const { draft } = editor;
  const today = dateInZone(draft.timeZone), disabled = editor.busy || editor.error === 'conflict';
  const entries = draft.entries.filter(row => view.status === 'ALL' ? row.status !== 'CANCELLED' : row.status === view.status);
  const undated = sortedEntries(entries.filter(row => !row.date));
  function move(direction: number) { const anchor = shiftPeriod(view.anchor,view.mode,direction); if (validDate(anchor)) setView(v => ({...v,anchor})); }
  const periodFormatter = new Intl.DateTimeFormat(locale,{month:'long',year:'numeric',...(view.mode === 'week' ? {day:'numeric' as const} : {}),timeZone:'UTC'});
  const weekDays = calendarDays(view.anchor,'week');
  const periodLabel = view.mode === 'week'
    ? `${periodFormatter.format(new Date(`${weekDays[0]}T12:00:00Z`))} — ${periodFormatter.format(new Date(`${weekDays[6]}T12:00:00Z`))}`
    : periodFormatter.format(new Date(`${view.anchor}T12:00:00Z`));
  return <section aria-label={c.title} data-content-calendar className="min-w-0 space-y-5 text-slate-900 dark:text-slate-100">
    <header className="flex flex-wrap items-center justify-between gap-4">
      <div className="min-w-0 space-y-1"><h2 className="flex items-center gap-2 text-lg font-medium"><CalendarDays className="h-5 w-5 text-[#b63b32] dark:text-[#ffb0aa]" />{c.title}</h2><p className="text-sm text-slate-600 dark:text-slate-300">{c.subtitle}</p></div>
      <div className="flex flex-wrap gap-2"><Button variant="outline" className="min-h-11 gap-2 dark:bg-slate-800 dark:text-slate-100 dark:border-slate-700" disabled={disabled || draft.entries.length >= 200} onClick={() => setSuggesting(true)}><Sparkles className="h-4 w-4" />{c.suggest}</Button><Button className={salesTitleBarPrimaryActionClassName} disabled={disabled || draft.entries.length >= 200} onClick={() => setEntry(newContentEntry(view.anchor))}><Plus className="h-4 w-4" />{c.create}</Button></div>
    </header>
    <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900 sm:p-5">
      <div className="grid min-w-0 gap-4 sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <CalendarField label={g.campaign}><select className={calendarControl} value={plan.id} disabled={editor.busy} onChange={event => { const id = event.target.value; editor.navigate(() => onSelect(id)); }}>{plans.map(value => <option key={value.id} value={value.id}>{value.name}</option>)}</select></CalendarField>
        <CalendarField label={c.status}><select className={calendarControl} value={view.status} onChange={event => setView(v => ({...v,status:event.target.value}))}><option value="ALL">{c.all}</option>{contentStatuses.map(value => <option key={value} value={value}>{c.statuses[value]}</option>)}</select></CalendarField>
      </div>
      <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">{copy.pagePlans}: {plans.length} / {total} · {c.timeZone}: {draft.timeZone}</p>
    </div>
    {editor.error && <div role="alert" className="space-y-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-200"><p>{editor.error === 'conflict' ? g.conflict : editor.error === 'invalid' ? c.invalid : copy.saveError}</p>{editor.error === 'conflict' && <Button variant="outline" onClick={editor.reload}>{g.reload}</Button>}</div>}
    {draft.entries.length >= 200 && <p role="status" className="text-sm text-amber-700 dark:text-amber-200">{c.limit}</p>}
    <div className="flex flex-wrap items-center justify-between gap-4">
      <div className="flex min-w-0 flex-wrap items-center gap-2"><Button variant="outline" size="icon" className="h-11 w-11 dark:bg-slate-800 dark:text-slate-100 dark:border-slate-700" aria-label={c.previous} disabled={!validDate(shiftPeriod(view.anchor,view.mode,-1))} onClick={() => move(-1)}><ChevronLeft className="h-4 w-4" /></Button><Button variant="outline" size="icon" className="h-11 w-11 dark:bg-slate-800 dark:text-slate-100 dark:border-slate-700" aria-label={c.next} disabled={!validDate(shiftPeriod(view.anchor,view.mode,1))} onClick={() => move(1)}><ChevronRight className="h-4 w-4" /></Button><h3 className="px-2 text-base font-medium capitalize">{periodLabel}</h3><Button variant="outline" className="min-h-11 dark:bg-slate-800 dark:text-slate-100 dark:border-slate-700" onClick={() => setView(v => ({...v,anchor:today}))}>{c.today}</Button></div>
      <IndiceWorkspaceNavigation variant="views" tone="coral" ariaLabel={c.title} value={view.mode} onValueChange={mode => setView(v => ({...v,mode}))} items={[{id:'month',label:c.month},{id:'week',label:c.week},{id:'agenda',label:c.agenda}]} />
    </div>
    <div className="flex flex-wrap gap-2 text-xs">{(['PLANNED','READY','PUBLISHED'] as const).map(status => <span key={status} className="rounded-full border border-[#FF6B5E]/15 bg-[#FF6B5E]/5 px-3 py-2"><strong>{draft.entries.filter(row => row.status === status).length}</strong> · {c.statuses[status]}</span>)}</div>
    <ContentCalendarBoard entries={entries} anchor={view.anchor} mode={view.mode} today={today} locale={locale} c={c} disabled={disabled}
      onCreate={date => { if (draft.entries.length < 200) setEntry(newContentEntry(date)); }} onEdit={setEntry} onDay={anchor => { if (validDate(anchor)) setView(v => ({...v,anchor,mode:'week'})); }} />
    <section className="space-y-3 rounded-2xl border border-dashed border-slate-300 p-4 dark:border-slate-700">
      <header className="flex flex-wrap items-center justify-between gap-2"><h3 className="text-sm font-medium">{c.unscheduled} · {undated.length}</h3><Button variant="ghost" className="min-h-11 gap-2" disabled={disabled || draft.entries.length >= 200} onClick={() => setEntry(newContentEntry(null))}><Plus className="h-4 w-4" />{campaign.newIdea}</Button></header>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{undated.map(row => <button type="button" key={row.id} disabled={disabled} onClick={() => setEntry(row)} className="min-h-11 rounded-xl border border-slate-200 bg-white p-3 text-left dark:border-slate-700 dark:bg-slate-900"><span className="block break-words text-sm font-medium">{row.title}</span><span className="mt-1 block text-xs text-slate-500 dark:text-slate-400">{c.formats[row.format]} · {c.statuses[row.status]}</span></button>)}</div>
    </section>
    <div className="flex flex-wrap gap-2"><Button variant="outline" className="h-auto min-h-11 gap-2 whitespace-normal dark:bg-slate-800 dark:text-slate-100 dark:border-slate-700" disabled={disabled} onClick={() => { setZone(draft.timeZone); setPreferences(true); }}><Settings className="h-4 w-4 shrink-0" />{c.settings}</Button><Button variant="outline" className="h-auto min-h-11 gap-2 whitespace-normal dark:bg-slate-800 dark:text-slate-100 dark:border-slate-700" disabled={editor.busy} onClick={() => setExporting(true)}><FileText className="h-4 w-4 shrink-0" />{c.export}</Button></div>
    <footer className="sticky bottom-0 z-10 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900">
      <p role="status" className="text-xs text-slate-600 dark:text-slate-300">{editor.busy ? copy.saving : editor.dirty ? g.unsaved : editor.saved ? g.saved : c.subtitle}</p>
      <Button className={salesTitleBarPrimaryActionClassName} disabled={!editor.dirty || disabled} onClick={() => { void editor.save(); }}><Save className="h-4 w-4" />{editor.busy ? copy.saving : c.saveCalendar}</Button>
    </footer>
    {entry && <ContentEntryModal initial={entry} timeZone={draft.timeZone} locale={locale} copy={copy} onClose={() => setEntry(null)} onApply={value => { editor.update({...draft,entries:draft.entries.some(row => row.id === value.id) ? draft.entries.map(row => row.id === value.id ? value : row) : [...draft.entries,value]}); setEntry(null); }} />}
    {suggesting && <ContentSuggestionsModal plan={plan} initial={draft.settings ?? defaultSettings(plan,today)} existing={draft.entries.length} timeZone={draft.timeZone} locale={locale} copy={copy} onClose={() => setSuggesting(false)} onApply={(settings,items) => { editor.update({...draft,settings,entries:[...draft.entries,...items]}); setView(v => ({...v,anchor:settings.startDate,status:'ALL'})); setSuggesting(false); }} />}
    {preferences && <SalesModalFrame open modalType="standard-form" title={c.settings} description={c.settingsHint} icon={<Settings />} onOpenChange={open => { if (!open) setPreferences(false); }} footer={<><Button className={actions.secondary} onClick={() => setPreferences(false)}>{copy.cancel}</Button><Button className={actions.primary} onClick={() => { editor.update({...draft,timeZone:zone}); setPreferences(false); }}>{c.saveEntry}</Button></>}><CalendarField label={c.timeZone}><select className={calendarControl} value={zone} onChange={event => setZone(event.target.value)}>{zones.map(value => <option key={value}>{value}</option>)}</select></CalendarField></SalesModalFrame>}
    {exporting && <SalesModalFrame open modalType="operational-workspace" title={c.export} description={plan.name} icon={<FileText />} onOpenChange={open => { if (!open) setExporting(false); }} footer={<Button className={actions.primary} onClick={() => setExporting(false)}>{copy.cancel}</Button>}><CampaignPromptTools plan={plan} copy={copy} c={campaign} locale={locale} extraContext={{title:c.exportContext,content:{timeZone:draft.timeZone,entries:sortedEntries(draft.entries.filter(row => row.status !== 'CANCELLED'))}}} /></SalesModalFrame>}
    {editor.pending && <SalesModalFrame open modalType="confirmation" title={copy.discardTitle} description={copy.discardHint} icon={<CalendarDays />} onOpenChange={open => { if (!open) editor.keepEditing(); }} footer={<><Button className={actions.secondary} onClick={editor.keepEditing}>{copy.keepEditing}</Button><Button className={actions.primary} onClick={editor.discard}>{copy.discard}</Button></>}><p className="break-words">{plan.name}</p></SalesModalFrame>}
  </section>;
}
