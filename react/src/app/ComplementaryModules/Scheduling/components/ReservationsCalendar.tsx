import { useRef } from "react";
import { CalendarDays } from "lucide-react";
import { IndiceCalendarSurface } from "../../../components/frontend-os/IndiceCalendarSurface";
import type { CalendarWorkspace, Reservation } from "../services/schedulingApi";
import type { SchedulingCopy } from "../translations/schedulingCopy";
import { getSchedulingExperienceCopy } from "../translations/schedulingExperienceCopy";
import { calendarDates } from "../utils/calendarScope";
import { dateInput } from "../utils/dateScope";
import { Feedback, panelClass, StatusBadge } from "./SchedulingPrimitives";
import { EventState } from "./EventsResults";

export function ReservationsCalendar({
  workspace,
  from,
  to,
  copy,
  locale,
  selectedDate,
  onSelectDate,
  onReview,
}: {
  workspace: CalendarWorkspace;
  from: string;
  to: string;
  copy: SchedulingCopy;
  locale: string;
  onReview: (record: Reservation) => void;
  selectedDate: string;
  onSelectDate: (date: string) => void;
}) {
  const c = getSchedulingExperienceCopy(locale),
    detail = useRef<HTMLElement>(null);
  const selected =
    selectedDate < from || selectedDate > to ? from : selectedDate;
  const time = (value: string) =>
    new Intl.DateTimeFormat(locale, {
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(value));
  const selectedRows = workspace.items.filter(
    (record) => dateInput(new Date(record.startAt)) === selected,
  );
  const selectedEvents = workspace.events.filter(
    (event) => dateInput(new Date(event.startAt)) === selected,
  );
  const selectDay = (date: string) => {
    onSelectDate(date);
    detail.current?.scrollIntoView({ block: "nearest" });
    detail.current?.focus({ preventScroll: true });
  };
  return (
    <div className="space-y-5">
      {(workspace.total > workspace.items.length ||
        workspace.eventsTotal > workspace.events.length) && (
        <Feedback>{copy.partialCalendar}</Feedback>
      )}
      <IndiceCalendarSurface
        tone="coral"
        dates={calendarDates(from, to)}
        locale={locale}
        label={copy.calendarView}
        selectedDate={selected}
        onSelectDate={selectDay}
        renderDay={(date) => {
          const activities = [
            ...workspace.items
              .filter((record) => dateInput(new Date(record.startAt)) === date)
              .map((record) => ({
                key: `reservation-${record.id}`,
                at: record.startAt,
                node: (
                  <button
                    type="button"
                    onClick={() => onReview(record)}
                    className="block w-full min-w-0 rounded-lg border border-[#FF6B5E]/20 bg-[#FF6B5E]/5 p-2 text-left text-xs leading-5 hover:border-[#FF6B5E]/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF6B5E] dark:border-[#FF6B5E]/30 dark:bg-[#FF6B5E]/10"
                    aria-label={`${copy.details}: ${record.attendeeName}`}
                  >
                    <span className="block font-medium">
                      {time(record.startAt)} · {record.attendeeName}
                    </span>
                    <span className="mt-1 block text-slate-500 dark:text-slate-400">
                      {copy[record.status]}
                    </span>
                  </button>
                ),
              })),
            ...workspace.events
              .filter((event) => dateInput(new Date(event.startAt)) === date)
              .map((event) => ({
                key: `event-${event.id}`,
                at: event.startAt,
                node: (
                  <button
                    type="button"
                    onClick={() => selectDay(date)}
                    className="block w-full rounded-lg border border-teal-200 bg-teal-50 p-2 text-left text-xs leading-5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF6B5E] dark:border-teal-800 dark:bg-teal-950"
                  >
                    <span className="block font-medium">
                      {time(event.startAt)} · {event.title}
                    </span>
                    <span>
                      {copy.events} · {event.confirmedCount}/{event.capacity} ·{" "}
                      {event.status === "CANCELLED"
                        ? copy.CANCELLED
                        : copy.active}
                    </span>
                  </button>
                ),
              })),
          ].sort(
            (a, b) =>
              Date.parse(a.at) - Date.parse(b.at) || a.key.localeCompare(b.key),
          );
          return (
            <>
              {activities.slice(0, 3).map((activity) => (
                <div key={activity.key}>{activity.node}</div>
              ))}
              {activities.length > 3 && (
                <button
                  type="button"
                  className="min-h-11 w-full rounded-lg text-left text-xs font-medium text-[#B63B32] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF6B5E] dark:text-[#FFB0AA]"
                  onClick={() => selectDay(date)}
                >
                  +{activities.length - 3} · {c.viewDayItems}
                </button>
              )}
            </>
          );
        }}
      />
      <section
        ref={detail}
        tabIndex={-1}
        aria-label={c.viewDayItems}
        className={`${panelClass} scroll-mt-6 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF6B5E]`}
      >
        <h3 className="flex items-center gap-3 font-medium">
          <CalendarDays className="h-5 w-5 shrink-0 text-[#B63B32] dark:text-[#FFB0AA]" />
          {new Intl.DateTimeFormat(locale, { dateStyle: "full" }).format(
            new Date(`${selected}T12:00:00`),
          )}
          <span className="ml-auto rounded-full bg-[#FF6B5E]/10 px-3 py-1 text-sm tabular-nums">
            {selectedRows.length + selectedEvents.length}
          </span>
        </h3>
        {selectedRows.length || selectedEvents.length ? (
          <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {selectedRows.map((record) => (
              <button
                type="button"
                key={record.id}
                onClick={() => onReview(record)}
                className="min-w-0 rounded-xl border border-slate-200 p-4 text-left hover:border-[#FF6B5E]/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF6B5E] dark:border-slate-700"
              >
                <p className="break-words font-medium">
                  {time(record.startAt)} · {record.attendeeName}
                </p>
                <p className="my-2 text-sm text-slate-500 dark:text-slate-400">
                  {record.serviceName} · {record.staffName}
                </p>
                <StatusBadge status={record.status} copy={copy} />
              </button>
            ))}
            {selectedEvents.map((event) => (
              <article
                key={`event-${event.id}`}
                className="min-w-0 rounded-xl border border-teal-100 bg-teal-50/50 p-4 dark:border-teal-900 dark:bg-teal-950/40"
              >
                <p className="break-words font-medium">
                  {time(event.startAt)} · {event.title}
                </p>
                <p className="my-2 text-sm text-slate-500 dark:text-slate-400">
                  {copy.events} · {event.confirmedCount}/{event.capacity} ·{" "}
                  {event.durationMinutes} {copy.minutes}
                </p>
                <EventState event={event} copy={copy} locale={locale} />
              </article>
            ))}
          </div>
        ) : (
          <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">
            {copy.empty}
          </p>
        )}
      </section>
    </div>
  );
}
