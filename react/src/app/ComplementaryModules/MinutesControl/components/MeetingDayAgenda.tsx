import { ArrowUpRight, CalendarDays, Clock3, Plus, Users } from "lucide-react";
import { IndiceModalFrame } from "../../../components/indice-modal/IndiceModalFrame";
import type { MeetingItem } from "../services/meetingApi";
import type { MeetingCopy } from "../translations/meetingCopy";
import { getMeetingWorkspaceCopy } from "../translations/meetingWorkspaceCopy";
import { dateInput, localDate } from "../utils/dateScope";
import { Action, Feedback, Status } from "./MeetingPrimitives";

/** Read-only day consultation. Selection replaces this frame with the existing owner workflow. */
export function MeetingDayAgenda({
  date, items, copy, locale, loading = false, error = false, partial = false, filtered = false,
  onClose, onOpen, onCreate, onClearFilters, onRetry,
}: {
  date: string; items: MeetingItem[]; copy: MeetingCopy; locale: string;
  loading?: boolean; error?: boolean; partial?: boolean; filtered?: boolean;
  onClose: () => void; onOpen: (id: number) => void; onCreate?: (date: string) => void;
  onClearFilters?: () => void; onRetry?: () => void;
}) {
  const c = getMeetingWorkspaceCopy(locale);
  const rows = items.filter(row => dateInput(new Date(row.startAt)) === date)
    .sort((a, b) => Date.parse(a.startAt) - Date.parse(b.startAt) || a.id - b.id);
  const past = date < dateInput(new Date());
  const time = (value: string) => new Intl.DateTimeFormat(locale, { timeStyle: "short" }).format(new Date(value));
  const count = `${new Intl.NumberFormat(locale).format(rows.length)} ${rows.length === 1 ? c.meetingSingular : c.meetingPlural}`;
  return <IndiceModalFrame
    open tone="blue" modalType="standard-form" icon="📅"
    title={c.dayMeetings}
    description={new Intl.DateTimeFormat(locale, { dateStyle: "full" }).format(localDate(date))}
    closeLabel={copy.close} onOpenChange={open => { if (!open) onClose(); }}
    footer={<><Action onClick={onClose}>{copy.close}</Action>{onCreate && !past && <Action primary onClick={() => onCreate(date)}><Plus className="h-4 w-4" aria-hidden/>{c.scheduleDay}</Action>}</>}
  >
    <div className="space-y-4">
      <p className="text-xs leading-5 text-slate-500 dark:text-slate-400">{copy.localTime} · {Intl.DateTimeFormat().resolvedOptions().timeZone}</p>
      {loading ? <Feedback>{copy.loading}</Feedback> : error ? <Feedback error>{copy.error}{onRetry && <Action onClick={onRetry}>{copy.refresh}</Action>}</Feedback> : <>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-sm font-medium text-blue-700 dark:border-blue-900 dark:bg-blue-950 dark:text-blue-300">{count}</p>
          {filtered && <p className="text-xs leading-5 text-slate-500 dark:text-slate-400">{c.filteredDayScope}</p>}
        </div>
        {partial && <Feedback>{copy.partial}</Feedback>}
        {rows.length ? <ol className="space-y-3" aria-label={c.dayMeetings}>{rows.map(row => <li key={row.id}>
          <button type="button" onClick={() => onOpen(row.id)} aria-label={`${c.openDayMeeting}: ${row.title}`}
            className="group grid min-h-11 w-full min-w-0 gap-3 rounded-xl border border-slate-200 p-4 text-left transition-colors hover:border-blue-300 hover:bg-blue-50/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 dark:border-slate-700 dark:hover:border-blue-700 dark:hover:bg-blue-950/20 sm:grid-cols-[100px_minmax(0,1fr)_20px]">
            <span className="flex flex-wrap items-center gap-1.5 text-sm font-medium text-blue-700 dark:text-blue-300 sm:block">
              <Clock3 className="h-4 w-4 shrink-0 sm:mb-2" aria-hidden/>
              <span className="block">{time(row.startAt)}</span>
              <span className="text-xs font-normal text-slate-500 dark:text-slate-400 sm:mt-1 sm:block">— {time(row.endAt)}</span>
            </span>
            <span className="min-w-0 space-y-2">
              <span className="block break-words text-sm font-medium leading-6 text-slate-900 dark:text-white">{row.title}</span>
              <span className="block break-words text-xs leading-5 text-slate-500 dark:text-slate-400">{c.coordinatorLabel}: {row.ownerName}</span>
              <span className="flex flex-wrap items-center gap-x-4 gap-y-2"><span className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400"><Users className="h-3.5 w-3.5" aria-hidden/>{copy.participants}: {row.participantCount}</span><Status status={row.status} copy={copy}/></span>
            </span>
            <ArrowUpRight className="hidden h-4 w-4 text-blue-600 dark:text-blue-300 sm:block" aria-hidden/>
          </button>
        </li>)}</ol> : <div className="rounded-xl border border-dashed border-slate-200 px-5 py-7 text-center dark:border-slate-700">
          <CalendarDays className="mx-auto mb-3 h-8 w-8 text-blue-500 dark:text-blue-300" aria-hidden/>
          <p className="text-sm font-medium text-slate-900 dark:text-white">{filtered ? c.filteredDayTitle : c.emptyDayTitle}</p>
          <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">{filtered ? c.filteredDayHint : past ? c.pastDayHint : c.emptyDayHint}</p>
          {filtered && onClearFilters && <Action className="mt-4" onClick={onClearFilters}>{c.clearDayFilters}</Action>}
        </div>}
      </>}
    </div>
  </IndiceModalFrame>;
}
