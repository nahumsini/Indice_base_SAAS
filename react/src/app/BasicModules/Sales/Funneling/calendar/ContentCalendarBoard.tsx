import { Plus } from 'lucide-react';
import { calendarDays, channelNames, sortedEntries, validDate, type CalendarMode, type ContentEntry } from './contentCalendarModel';
import type { ContentCalendarCopy } from './contentCalendarCopy';

const tones = {
  REEL: 'border-violet-200 bg-violet-50 text-violet-900 dark:border-violet-800 dark:bg-violet-950/40 dark:text-violet-200',
  STORY: 'border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200',
  CAROUSEL: 'border-sky-200 bg-sky-50 text-sky-900 dark:border-sky-800 dark:bg-sky-950/40 dark:text-sky-200',
  POST: 'border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200',
  META_AD: 'border-rose-200 bg-rose-50 text-rose-900 dark:border-rose-800 dark:bg-rose-950/40 dark:text-rose-200',
  SEARCH_AD: 'border-indigo-200 bg-indigo-50 text-indigo-900 dark:border-indigo-800 dark:bg-indigo-950/40 dark:text-indigo-200',
};
export function ContentCalendarBoard({ entries, anchor, mode, today, locale, c, disabled, onCreate, onEdit, onDay }: {
  entries: ContentEntry[]; anchor: string; mode: CalendarMode; today: string; locale: string; c: ContentCalendarCopy;
  disabled: boolean; onCreate: (date: string) => void; onEdit: (entry: ContentEntry) => void; onDay: (date: string) => void;
}) {
  const days = calendarDays(anchor, mode);
  const visible = sortedEntries(entries.filter(entry => entry.date && (mode === 'week' ? days.includes(entry.date) : entry.date.slice(0,7) === anchor.slice(0,7))));
  const dates = [...new Set(visible.map(entry => entry.date!))];
  const dateLabel = (date: string, weekday = false) => new Intl.DateTimeFormat(locale, { timeZone:'UTC', day:'numeric', month:'short', ...(weekday ? {weekday:'long' as const} : {}) }).format(new Date(`${date}T12:00:00Z`));
  function card(entry: ContentEntry, compact: boolean) {
    return <button key={entry.id} type="button" disabled={disabled} onClick={() => onEdit(entry)} data-content-entry={entry.id}
      className={`min-h-11 w-full min-w-0 rounded-xl border p-2.5 text-left transition-shadow hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF6B5E] disabled:opacity-60 ${tones[entry.format]} ${entry.status === 'CANCELLED' ? 'opacity-60' : ''}`}>
      <span className="flex flex-wrap items-center justify-between gap-1 text-[11px] font-medium"><span>{c.formats[entry.format]}</span><span>{entry.time || c.noTime}</span></span>
      <span className="mt-1 block break-words text-sm font-medium leading-5">{entry.title}</span>
      <span className="mt-1 block text-xs opacity-80">{channelNames[entry.channel]}</span>
      <span className="mt-2 block text-[11px] font-medium">{c.statuses[entry.status]}</span>
      {!compact && <span className="mt-1 block text-xs">{c.purposes[entry.purpose]}{entry.owner ? ` · ${entry.owner}` : ''}</span>}
    </button>;
  }
  return <div className="min-w-0">
    {mode !== 'agenda' && <div className="hidden overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900 lg:block">
      <div className="grid grid-cols-7 bg-slate-50 dark:bg-slate-800">{days.slice(0,7).map(date => <div key={date} className="p-3 text-center text-xs font-medium text-slate-500 dark:text-slate-300">{new Intl.DateTimeFormat(locale,{weekday:'short',timeZone:'UTC'}).format(new Date(`${date}T12:00:00Z`))}</div>)}</div>
      <div className={`grid grid-cols-7 ${mode === 'week' ? 'max-h-[65vh] overflow-y-auto' : ''}`}>{days.map(date => {
        const items = sortedEntries(entries.filter(entry => entry.date === date));
        return <section key={date} aria-label={dateLabel(date,true)} className={`min-w-0 border-t border-r border-slate-100 p-2 dark:border-slate-800 ${mode === 'week' ? 'min-h-72' : 'min-h-40'} ${date.slice(0,7) !== anchor.slice(0,7) && mode === 'month' ? 'bg-slate-50/80 dark:bg-slate-950/40' : ''}`}>
          <div className="mb-1 flex items-center justify-between gap-1">
            <button type="button" disabled={!validDate(date)} onClick={() => onDay(date)} className={`min-h-11 min-w-11 rounded-full text-sm font-medium ${date === today ? 'bg-[#FF6B5E] text-slate-950' : 'hover:bg-slate-100 dark:hover:bg-slate-800'}`}>{Number(date.slice(-2))}</button>
            <button type="button" disabled={disabled || !validDate(date)} aria-label={`${c.create}: ${dateLabel(date)}`} onClick={() => onCreate(date)} className="flex min-h-11 min-w-11 items-center justify-center rounded-xl text-slate-400 hover:bg-slate-100 hover:text-[#b63b32] dark:hover:bg-slate-800"><Plus className="h-4 w-4" /></button>
          </div>
          <div className="space-y-2">{(mode === 'month' ? items.slice(0,3) : items).map(entry => card(entry,true))}</div>
          {mode === 'month' && items.length > 3 && <button type="button" onClick={() => onDay(date)} className="mt-1 min-h-11 w-full rounded-xl text-sm font-medium text-[#b63b32] dark:text-[#ffb0aa]">+{items.length - 3} · {c.week}</button>}
        </section>;
      })}</div>
    </div>}
    <div className={`${mode === 'agenda' ? '' : 'lg:hidden'} space-y-4`}>
      {dates.map(date => <section key={date} className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
        <header className="mb-3 flex items-center justify-between gap-2"><h3 className="text-sm font-medium">{dateLabel(date,true)}</h3><button type="button" disabled={disabled} aria-label={`${c.create}: ${dateLabel(date)}`} onClick={() => onCreate(date)} className="flex min-h-11 min-w-11 items-center justify-center rounded-xl bg-[#FF6B5E]/10 text-[#b63b32] dark:text-[#ffb0aa]"><Plus className="h-4 w-4" /></button></header>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{visible.filter(entry => entry.date === date).map(entry => card(entry,false))}</div>
      </section>)}
      {!dates.length && <div className="rounded-2xl border border-dashed border-slate-300 p-8 text-center dark:border-slate-700"><p className="font-medium">{c.empty}</p><p className="mt-2 text-sm text-slate-500 dark:text-slate-400">{c.emptyHint}</p><button type="button" disabled={disabled} onClick={() => onCreate(anchor)} className="mt-4 min-h-11 rounded-xl bg-[#FF6B5E]/10 px-4 text-sm font-medium text-[#b63b32] dark:text-[#ffb0aa]">{c.create}</button></div>}
    </div>
  </div>;
}
