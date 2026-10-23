import { ArrowUpRight, CalendarDays, Clock3, Plus } from 'lucide-react';
import { IndiceModalFrame } from '../../../components/indice-modal/IndiceModalFrame';
import type { CalendarWorkspace, Reservation } from '../services/schedulingApi';
import type { SchedulingCopy } from '../translations/schedulingCopy';
import { getSchedulingCalendarCopy } from '../translations/schedulingCalendarCopy';
import { activitiesForDay } from '../utils/calendarActivities';
import { dateInput } from '../utils/dateScope';
import { schedulingEmoji, schedulingTone } from '../utils/schedulingIdentity';
import { ActionButton, Feedback, StatusBadge } from './SchedulingPrimitives';
import { EventState } from './EventsResults';

/** Read-only day consultation. Review/capture replaces this frame and returns to the same day. */
export function ReservationDayAgenda({ date, workspace, copy, locale, loading = false, error = false, filtered = false,
  onClose, onReview, onCreate, onClearFilters, onRetry,
}: {
  date: string; workspace?: CalendarWorkspace; copy: SchedulingCopy; locale: string;
  loading?: boolean; error?: boolean; filtered?: boolean;
  onClose: () => void; onReview: (record: Reservation) => void; onCreate?: (date: string) => void;
  onClearFilters?: () => void; onRetry?: () => void;
}) {
  const text = getSchedulingCalendarCopy(locale);
  const activities = workspace ? activitiesForDay(workspace, date) : [];
  const reservations = activities.filter(activity => activity.kind === 'reservation').length;
  const partial = Boolean(workspace && (workspace.total > workspace.items.length || workspace.eventsTotal > workspace.events.length));
  const past = date < dateInput(new Date());
  const time = (value: string) => new Intl.DateTimeFormat(locale, { timeStyle: 'short' }).format(new Date(value));
  const end = (at: string, minutes: number) => time(new Date(Date.parse(at) + minutes * 60000).toISOString());
  const timeClass = 'flex flex-wrap items-center gap-1.5 text-sm font-medium text-[#B63B32] dark:text-[#FFB0AA] sm:block';
  const rowClass = 'grid min-h-11 w-full min-w-0 gap-3 rounded-xl border border-slate-200 p-4 text-left dark:border-slate-700 sm:grid-cols-[100px_minmax(0,1fr)_20px]';
  return <IndiceModalFrame open tone={schedulingTone} modalType="standard-form" icon={schedulingEmoji.calendar}
    title={text.dayAgenda} description={new Intl.DateTimeFormat(locale, { dateStyle: 'full' }).format(new Date(`${date}T12:00:00`))}
    closeLabel={copy.close} onOpenChange={open => { if (!open) onClose(); }}
    footer={<><ActionButton onClick={onClose}>{copy.close}</ActionButton>{onCreate && !past && <ActionButton primary onClick={() => onCreate(date)}><Plus className="h-4 w-4" aria-hidden/>{copy.newReservation}</ActionButton>}</>}>
    <div className="space-y-4">
      <p className="text-xs leading-5 text-slate-500 dark:text-slate-400">{copy.timezone}: {Intl.DateTimeFormat().resolvedOptions().timeZone}</p>
      {loading ? <Feedback>{copy.loading}</Feedback> : error ? <Feedback error>{copy.error}{onRetry && <ActionButton onClick={onRetry}>{copy.retry}</ActionButton>}</Feedback> : <>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="rounded-full border border-[#FF6B5E]/20 bg-[#FF6B5E]/5 px-3 py-1 text-sm font-medium text-[#B63B32] dark:bg-[#FF6B5E]/10 dark:text-[#FFB0AA]">{new Intl.NumberFormat(locale).format(activities.length)} {activities.length === 1 ? text.activitySingular : text.activityPlural}</p>
          {activities.length > 0 && <p className="text-xs leading-5 text-slate-500 dark:text-slate-400">{copy.reservations}: {reservations} · {copy.events}: {activities.length - reservations}</p>}
          {filtered && <p className="w-full text-xs leading-5 text-slate-500 dark:text-slate-400">{text.filteredDayScope}</p>}
        </div>
        {partial && <Feedback>{copy.partialCalendar}</Feedback>}
        {activities.length ? <ol className="space-y-3" aria-label={text.dayAgenda}>{activities.map(activity => <li key={activity.key}>
          {activity.kind === 'reservation' ? <button type="button" onClick={() => onReview(activity.record)} aria-label={`${copy.details}: ${activity.record.attendeeName}`}
            className={`${rowClass} transition-colors hover:border-[#FF6B5E]/60 hover:bg-[#FF6B5E]/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF6B5E]`}>
            <span className={timeClass}><Clock3 className="h-4 w-4 shrink-0 sm:mb-2" aria-hidden/><span className="block">{time(activity.at)}</span><span className="text-xs font-normal text-slate-500 dark:text-slate-400 sm:mt-1 sm:block">— {end(activity.at, activity.record.durationMinutes)}</span></span>
            <span className="min-w-0 space-y-2"><span className="block break-words text-sm font-medium leading-6 text-slate-900 dark:text-white">{activity.record.attendeeName}</span><span className="block break-words text-xs leading-5 text-slate-500 dark:text-slate-400">{activity.record.serviceName}</span><span className="block break-words text-xs leading-5 text-slate-500 dark:text-slate-400">{copy.collaborator}: {activity.record.staffName}</span><span className="block"><StatusBadge status={activity.record.status} copy={copy}/></span></span>
            <ArrowUpRight className="hidden h-4 w-4 text-[#B63B32] dark:text-[#FFB0AA] sm:block" aria-hidden/>
          </button> : <article className={`${rowClass} border-teal-100 bg-teal-50/50 dark:border-teal-900 dark:bg-teal-950/40`}>
            <div className={`${timeClass} !text-teal-800 dark:!text-teal-200`}><Clock3 className="h-4 w-4 shrink-0 sm:mb-2" aria-hidden/><span className="block">{time(activity.at)}</span><span className="text-xs font-normal text-slate-500 dark:text-slate-400 sm:mt-1 sm:block">— {end(activity.at, activity.event.durationMinutes)}</span></div>
            <div className="min-w-0 space-y-2"><p className="break-words text-sm font-medium leading-6 text-slate-900 dark:text-white">{activity.event.title}</p><p className="text-xs leading-5 text-slate-500 dark:text-slate-400">{copy.events} · {activity.event.confirmedCount}/{activity.event.capacity} · {activity.event.durationMinutes} {copy.minutes}</p><EventState event={activity.event} copy={copy} locale={locale}/></div>
          </article>}
        </li>)}</ol> : <div className="rounded-xl border border-dashed border-slate-200 px-5 py-7 text-center dark:border-slate-700">
          <CalendarDays className="mx-auto mb-3 h-8 w-8 text-[#B63B32] dark:text-[#FFB0AA]" aria-hidden/>
          <p className="text-sm font-medium text-slate-900 dark:text-white">{filtered ? text.filteredDayTitle : text.emptyDayTitle}</p>
          <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">{filtered ? text.filteredDayHint : past ? text.pastDayHint : text.emptyDayHint}</p>
          {filtered && onClearFilters && <ActionButton className="mt-4" onClick={onClearFilters}>{text.clearDayFilters}</ActionButton>}
        </div>}
      </>}
    </div>
  </IndiceModalFrame>;
}
