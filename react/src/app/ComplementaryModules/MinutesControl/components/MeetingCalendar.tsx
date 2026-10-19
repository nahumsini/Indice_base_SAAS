import { useRef } from "react";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import { IndiceCalendarSurface } from "../../../components/frontend-os/IndiceCalendarSurface";
import type { MeetingItem } from "../services/meetingApi";
import type { MeetingCopy } from "../translations/meetingCopy";
import { getMeetingWorkspaceCopy } from "../translations/meetingWorkspaceCopy";
import {
  calendarDates,
  meetingCalendarPeriod,
  localDate,
  dayCount,
  dateInput,
  type MeetingCalendarPeriod,
} from "../utils/dateScope";
import { Action, Status, panel } from "./MeetingPrimitives";

export function MeetingCalendar({
  items,
  from,
  to,
  selectedDate,
  onSelectDate,
  onRange,
  onOpen,
  copy,
  locale,
}: {
  items: MeetingItem[];
  from: string;
  to: string;
  selectedDate: string;
  onSelectDate: (date: string) => void;
  onRange: (range: { from: string; to: string }) => void;
  onOpen: (id: number) => void;
  copy: MeetingCopy;
  locale: string;
}) {
  const c = getMeetingWorkspaceCopy(locale),
    detail = useRef<HTMLElement>(null);
  const selected =
    selectedDate < from || selectedDate > to ? from : selectedDate;
  const dates = calendarDates(from, to);
  const period = (["day", "week", "month"] as const).find((value) => {
    const range = meetingCalendarPeriod(from, value);
    return range.from === from && range.to === to;
  });
  const apply = (value: MeetingCalendarPeriod, anchor = selected) =>
    onRange(meetingCalendarPeriod(anchor, value));
  const move = (offset: number) => {
    const date = localDate(from);
    if (period === "month") date.setMonth(date.getMonth() + offset, 1);
    else
      date.setDate(
        date.getDate() +
          offset *
            (period === "week" ? 7 : period === "day" ? 1 : dayCount(from, to)),
      );
    if (period) apply(period, dateInput(date));
    else {
      const end = new Date(date);
      end.setDate(end.getDate() + dayCount(from, to) - 1);
      onRange({ from: dateInput(date), to: dateInput(end) });
    }
  };
  const dateLabel = new Intl.DateTimeFormat(locale, { dateStyle: "medium" });
  const time = (value: string) =>
    new Intl.DateTimeFormat(locale, { timeStyle: "short" }).format(
      new Date(value),
    );
  const rowsFor = (date: string) =>
    items
      .filter((row) => dateInput(new Date(row.startAt)) === date)
      .sort(
        (a, b) => Date.parse(a.startAt) - Date.parse(b.startAt) || a.id - b.id,
      );
  const selectDay = (date: string) => {
    onSelectDate(date);
    detail.current?.scrollIntoView({ block: "nearest" });
    detail.current?.focus({ preventScroll: true });
  };
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div
          role="group"
          aria-label={c.period}
          className="flex flex-wrap gap-2"
        >
          {(["day", "week", "month"] as const).map((value) => (
            <Action
              key={value}
              primary={period === value}
              aria-pressed={period === value}
              onClick={() => apply(value)}
            >
              {c[value]}
            </Action>
          ))}
        </div>
        <p className="text-sm text-slate-600 dark:text-slate-300">
          {!period && `${c.customRange} · `}
          {dateLabel.format(localDate(from))} —{" "}
          {dateLabel.format(localDate(to))}
        </p>
        <div className="flex gap-2">
          <Action aria-label={c.previousPeriod} onClick={() => move(-1)}>
            <ChevronLeft className="h-4 w-4" />
          </Action>
          <Action
            onClick={() => {
              const today = dateInput(new Date());
              onSelectDate(today);
              apply(period ?? "month", today);
            }}
          >
            {c.today}
          </Action>
          <Action aria-label={c.nextPeriod} onClick={() => move(1)}>
            <ChevronRight className="h-4 w-4" />
          </Action>
        </div>
      </div>
      <p className="text-xs text-slate-500 dark:text-slate-400">
        {copy.localTime} · {Intl.DateTimeFormat().resolvedOptions().timeZone}
      </p>
      <IndiceCalendarSurface
        tone="blue"
        dates={dates}
        locale={locale}
        selectedDate={selected}
        onSelectDate={selectDay}
        label={copy.calendar}
        renderDay={(date) => {
          const rows = rowsFor(date);
          return (
            <>
              {rows.slice(0, 3).map((row) => (
                <button
                  type="button"
                  key={row.id}
                  className="block w-full rounded-xl border border-blue-100 bg-blue-50 p-2.5 text-left text-xs text-blue-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-100"
                  onClick={() => onOpen(row.id)}
                >
                  <span className="mb-1 block font-medium">
                    {time(row.startAt)}
                  </span>
                  <span className="block break-words">{row.title}</span>
                  <span className="mt-1 block text-xs opacity-75">
                    {copy[row.status]}
                  </span>
                </button>
              ))}
              {rows.length > 3 && (
                <button
                  type="button"
                  className="min-h-11 w-full rounded-lg text-left text-xs font-medium text-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 dark:text-blue-300"
                  onClick={() => selectDay(date)}
                >
                  +{rows.length - 3} · {c.viewDayItems}
                </button>
              )}
            </>
          );
        }}
      />
      <section
        ref={detail}
        tabIndex={-1}
        aria-label={c.dayActivities}
        className={`${panel} scroll-mt-6 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600`}
      >
        <h3 className="flex items-center gap-3 font-medium">
          <CalendarDays className="h-5 w-5 shrink-0 text-blue-600 dark:text-blue-300" />
          {new Intl.DateTimeFormat(locale, { dateStyle: "full" }).format(
            localDate(selected),
          )}
          <span className="ml-auto rounded-full bg-blue-50 px-3 py-1 text-sm text-blue-700 dark:bg-blue-950 dark:text-blue-300">
            {rowsFor(selected).length}
          </span>
        </h3>
        {rowsFor(selected).length ? (
          <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {rowsFor(selected).map((row) => (
              <button
                type="button"
                key={row.id}
                onClick={() => onOpen(row.id)}
                className="min-w-0 space-y-2 rounded-xl border border-slate-200 p-4 text-left hover:border-blue-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 dark:border-slate-700 dark:hover:border-blue-700"
              >
                <span className="block text-sm text-blue-700 dark:text-blue-300">
                  {time(row.startAt)} — {time(row.endAt)}
                </span>
                <span className="block break-words font-medium">
                  {row.title}
                </span>
                <span className="block text-sm text-slate-500 dark:text-slate-400">
                  {row.ownerName} · {row.participantCount}{" "}
                  {copy.participants.toLocaleLowerCase()}
                </span>
                <Status status={row.status} copy={copy} />
              </button>
            ))}
          </div>
        ) : (
          <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">
            {copy.empty}
          </p>
        )}
      </section>
    </div>
  );
}
