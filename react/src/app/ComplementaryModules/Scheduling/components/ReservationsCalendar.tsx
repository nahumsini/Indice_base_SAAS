import { IndiceCalendarSurface } from '../../../components/frontend-os/IndiceCalendarSurface';
import type { CalendarWorkspace, Reservation } from '../services/schedulingApi';
import type { SchedulingCopy } from '../translations/schedulingCopy';
import { getSchedulingExperienceCopy } from '../translations/schedulingExperienceCopy';
import { getSchedulingCalendarCopy } from '../translations/schedulingCalendarCopy';
import { calendarDates } from '../utils/calendarScope';
import { activitiesForDay, type CalendarActivity } from '../utils/calendarActivities';
import { Feedback } from './SchedulingPrimitives';
import './schedulingCalendar.css';

/** Same full-width calendar rhythm as Meeting control; day consultation belongs to its owner modal. */
export function ReservationsCalendar({ workspace, from, to, copy, locale, selectedDate, onSelectDate, onDayOpen, onReview }: {
  workspace: CalendarWorkspace; from: string; to: string; copy: SchedulingCopy; locale: string; selectedDate: string;
  onSelectDate: (date: string) => void; onDayOpen: (date: string) => void; onReview: (record: Reservation) => void;
}) {
  const c = getSchedulingExperienceCopy(locale), text = getSchedulingCalendarCopy(locale);
  const selected = selectedDate < from || selectedDate > to ? from : selectedDate, dates = calendarDates(from, to);
  const time = (value: string) => new Intl.DateTimeFormat(locale, { timeStyle: 'short' }).format(new Date(value));
  const selectDay = (date: string) => { onSelectDate(date); onDayOpen(date); };
  const preview = (activity: CalendarActivity, date: string) => activity.kind === 'reservation' ?
    <button type="button" onClick={() => onReview(activity.record)} className="block min-h-11 w-full min-w-0 rounded-lg border border-[#FF6B5E]/20 bg-[#FF6B5E]/5 p-2 text-left text-xs leading-5 hover:border-[#FF6B5E]/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF6B5E] dark:border-[#FF6B5E]/30 dark:bg-[#FF6B5E]/10" aria-label={`${copy.details}: ${activity.record.attendeeName}`}><span className="block font-medium">{time(activity.at)}</span><span className="line-clamp-2 break-words">{activity.record.attendeeName}</span><span className="mt-1 block text-slate-500 dark:text-slate-400">{copy[activity.record.status]}</span></button> :
    <button type="button" onClick={() => selectDay(date)} className="block min-h-11 w-full rounded-lg border border-teal-200 bg-teal-50 p-2 text-left text-xs leading-5 hover:border-teal-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF6B5E] dark:border-teal-800 dark:bg-teal-950"><span className="block font-medium">{time(activity.at)}</span><span className="line-clamp-2 break-words">{activity.event.title}</span><span className="mt-1 block">{copy.events} · {activity.event.confirmedCount}/{activity.event.capacity} · {activity.event.status === 'CANCELLED' ? copy.CANCELLED : copy.active}</span></button>;
  return <div className="scheduling-calendar-workspace space-y-4">
    {(workspace.total > workspace.items.length || workspace.eventsTotal > workspace.events.length) && <Feedback>{copy.partialCalendar}</Feedback>}
    <div className="min-w-0 space-y-2">
      <p className="text-xs text-slate-500 dark:text-slate-400 sm:hidden">{text.calendarScrollHint}</p>
      <IndiceCalendarSurface tone="coral" density="compact" dates={dates} locale={locale} label={copy.calendarView} selectedDate={selected} onSelectDate={selectDay} renderDay={date => {
        const rows = activitiesForDay(workspace, date);
        return <>{rows.slice(0, 3).map(activity => <div key={activity.key}>{preview(activity, date)}</div>)}{rows.length > 3 && <button type="button" className="min-h-11 w-full rounded-lg text-left text-xs font-medium text-[#B63B32] focus-visible:ring-2 focus-visible:ring-[#FF6B5E] dark:text-[#FFB0AA]" onClick={() => selectDay(date)}>+{rows.length - 3} · {c.viewDayItems}</button>}</>;
      }}/>
    </div>
  </div>;
}
