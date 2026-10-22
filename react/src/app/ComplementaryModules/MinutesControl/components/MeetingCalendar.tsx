import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import { IndiceCalendarSurface } from "../../../components/frontend-os/IndiceCalendarSurface";
import type { MeetingItem } from "../services/meetingApi";
import type { MeetingCopy } from "../translations/meetingCopy";
import { getMeetingWorkspaceCopy } from "../translations/meetingWorkspaceCopy";
import { calendarDates, meetingCalendarPeriod, localDate, dayCount, dateInput, type MeetingCalendarPeriod } from "../utils/dateScope";
import { Action } from "./MeetingPrimitives";
import "./meetingCalendar.css";

export function MeetingCalendar({ items, from, to, selectedDate, onSelectDate, onRange, onOpen, onDayOpen, copy, locale }: {
  items: MeetingItem[]; from: string; to: string; selectedDate: string;
  onSelectDate: (date: string) => void; onRange: (range: { from: string; to: string }) => void;
  onOpen: (id: number) => void; onDayOpen: (date: string) => void; copy: MeetingCopy; locale: string;
}) {
  const c = getMeetingWorkspaceCopy(locale);
  const selected = selectedDate < from || selectedDate > to ? from : selectedDate;
  const dates = calendarDates(from, to);
  const period = (["day", "week", "month"] as const).find(value => {
    const range = meetingCalendarPeriod(from, value);
    return range.from === from && range.to === to;
  });
  const apply = (value: MeetingCalendarPeriod, anchor = selected) => onRange(meetingCalendarPeriod(anchor, value));
  const move = (offset: number) => {
    const date = localDate(from);
    if (period === "month") date.setMonth(date.getMonth() + offset, 1);
    else date.setDate(date.getDate() + offset * (period === "week" ? 7 : period === "day" ? 1 : dayCount(from, to)));
    if (period) apply(period, dateInput(date));
    else { const end = new Date(date); end.setDate(end.getDate() + dayCount(from, to) - 1); onRange({ from: dateInput(date), to: dateInput(end) }); }
  };
  const dateLabel = new Intl.DateTimeFormat(locale, { dateStyle: "medium" });
  const time = (value: string) => new Intl.DateTimeFormat(locale, { timeStyle: "short" }).format(new Date(value));
  const rowsFor = (date: string) => items.filter(row => dateInput(new Date(row.startAt)) === date).sort((a,b) => Date.parse(a.startAt) - Date.parse(b.startAt) || a.id - b.id);
  const selectDay = (date: string) => {
    onSelectDate(date);
    onDayOpen(date);
  };
  return <div className="meeting-calendar-workspace space-y-4">
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="min-w-0"><h3 className="flex items-center gap-2 text-base font-medium text-slate-900 dark:text-white"><CalendarDays className="h-5 w-5 text-blue-600 dark:text-blue-300" aria-hidden/>{period === 'month' ? new Intl.DateTimeFormat(locale,{month:'long',year:'numeric'}).format(localDate(from)) : `${!period ? c.customRange+' · ' : ''}${dateLabel.format(localDate(from))}${from !== to ? ' — '+dateLabel.format(localDate(to)) : ''}`}</h3><p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">{c.calendarHint}</p></div>
        <div className="flex flex-wrap items-center gap-3">
          <div role="group" aria-label={c.period} className="flex gap-1 rounded-xl bg-slate-100 p-1 dark:bg-slate-950">{(['day','week','month'] as const).map(value => <Action key={value} primary={period === value} className={period === value ? 'shadow-sm' : '!border-transparent !bg-transparent shadow-none'} aria-pressed={period === value} onClick={()=>apply(value)}>{c[value]}</Action>)}</div>
          <div role="group" aria-label={copy.calendar} className="flex items-center gap-1"><Action className="w-11 !px-0" aria-label={c.previousPeriod} onClick={()=>move(-1)}><ChevronLeft className="h-4 w-4" aria-hidden/></Action><Action onClick={()=>{const today=dateInput(new Date());onSelectDate(today);apply(period??'month',today);}}>{c.today}</Action><Action className="w-11 !px-0" aria-label={c.nextPeriod} onClick={()=>move(1)}><ChevronRight className="h-4 w-4" aria-hidden/></Action></div>
        </div>
      </div>
    </div>
    <div className="min-w-0 space-y-2"><p className="text-xs text-slate-500 dark:text-slate-400 sm:hidden">{c.calendarScrollHint}</p><IndiceCalendarSurface tone="blue" density="compact" dates={dates} locale={locale} selectedDate={selected} onSelectDate={selectDay} label={copy.calendar} renderDay={date=>{
        const dayRows=rowsFor(date);
        return <>{dayRows.slice(0,3).map(row=><button type="button" key={row.id} className="block min-h-11 w-full rounded-lg border border-blue-100 bg-blue-50 p-2 text-left text-xs text-blue-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-100" onClick={()=>onOpen(row.id)}><span className="mb-1 block font-medium">{time(row.startAt)}</span><span className="line-clamp-2 break-words">{row.title}</span><span className="mt-1 block opacity-75">{copy[row.status]}</span></button>)}{dayRows.length>3&&<button type="button" className="min-h-11 w-full rounded-lg text-left text-xs font-medium text-blue-700 focus-visible:ring-2 focus-visible:ring-blue-600 dark:text-blue-300" onClick={()=>selectDay(date)}>+{dayRows.length-3} · {c.viewDayItems}</button>}</>;
      }}/></div>
    <p className="text-xs leading-5 text-slate-500 dark:text-slate-400">{copy.localTime} · {Intl.DateTimeFormat().resolvedOptions().timeZone}</p>
  </div>;
}
