import { IndiceCalendarSurface } from '../../../components/frontend-os/IndiceCalendarSurface';
import type { CalendarWorkspace, Reservation } from '../services/schedulingApi';
import type { SchedulingCopy } from '../translations/schedulingCopy';
import { calendarDates } from '../utils/calendarScope';
import { dateInput } from '../utils/dateScope';
import { Feedback, panelClass, StatusBadge } from './SchedulingPrimitives';

export function ReservationsCalendar({ workspace, from, to, copy, locale, selectedDate, onSelectDate, onReview }: {
  workspace: CalendarWorkspace; from: string; to: string; copy: SchedulingCopy; locale: string; onReview: (record: Reservation) => void;
  selectedDate: string; onSelectDate: (date: string) => void;
}) {
  const selected=selectedDate<from||selectedDate>to?from:selectedDate;
  const time = (value: string) => new Intl.DateTimeFormat(locale,{hour:'2-digit',minute:'2-digit'}).format(new Date(value));
  const selectedRows = workspace.items.filter(record=>dateInput(new Date(record.startAt))===selected);
  return <div className="space-y-5">
    {(workspace.total>workspace.items.length||workspace.eventsTotal>workspace.events.length) && <Feedback>{copy.partialCalendar}</Feedback>}
    <IndiceCalendarSurface tone="coral" dates={calendarDates(from,to)} locale={locale} label={copy.calendarView} selectedDate={selected} onSelectDate={onSelectDate}
      renderDay={date => <>
        {workspace.items.filter(record=>dateInput(new Date(record.startAt))===date).map(record=><button key={record.id} type="button" onClick={()=>onReview(record)}
          className="block w-full min-w-0 rounded-lg border border-[#FF6B5E]/20 bg-[#FF6B5E]/5 p-2 text-left text-xs leading-5 hover:border-[#FF6B5E]/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF6B5E] dark:border-[#FF6B5E]/30 dark:bg-[#FF6B5E]/10"
          aria-label={`${copy.details}: ${record.attendeeName}`}>
          <span className="block font-medium">{time(record.startAt)} · {record.attendeeName}</span><span className="block break-words text-slate-500 dark:text-slate-400">{record.staffName}</span>
          <span className="block mt-1">{copy[record.status]}</span>
        </button>)}
        {workspace.events.filter(event=>dateInput(new Date(event.startAt))===date).map(event=><div key={`event-${event.id}`} className="rounded-lg border border-[#FF6B5E]/20 bg-[#FF6B5E]/5 p-2 text-xs leading-5 dark:border-[#FF6B5E]/30 dark:bg-[#FF6B5E]/10">
          <p className="font-medium">{time(event.startAt)} · {event.title}</p><p>{copy.events} · {event.confirmedCount}/{event.capacity}</p><p>{event.status==='CANCELLED'?copy.CANCELLED:copy.active}</p>
        </div>)}
      </>} />
    <section className={panelClass}><h3 className="font-medium">{new Intl.DateTimeFormat(locale,{dateStyle:'full'}).format(new Date(`${selected}T12:00:00`))}</h3>
      {selectedRows.length ? <div className="mt-4 grid gap-3 sm:grid-cols-2">{selectedRows.map(record=><button type="button" key={record.id} onClick={()=>onReview(record)}
        className="min-w-0 rounded-xl border border-slate-200 p-4 text-left hover:border-[#FF6B5E]/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF6B5E] dark:border-slate-700"><p className="font-medium">{time(record.startAt)} · {record.attendeeName}</p>
        <p className="my-2 text-sm text-slate-500">{record.serviceName} · {record.staffName}</p><StatusBadge status={record.status} copy={copy}/></button>)}</div>:<p className="mt-3 text-sm text-slate-500">{copy.empty}</p>}
    </section>
  </div>;
}
