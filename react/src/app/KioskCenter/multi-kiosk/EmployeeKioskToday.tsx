import { useId } from 'react';
import { ArrowRight, RefreshCw } from 'lucide-react';
import type { MultiKioskToday } from '../../api/multiKiosks';
import { employeePortalCopy, employeePortalCount, employeeTodayCopy } from './employeePortalCopy';

const panel = 'rounded-[1.375rem] border border-slate-200 bg-white shadow-[0_3px_16px_-10px_rgba(20,54,117,0.16)] dark:border-slate-700 dark:bg-slate-900';
const focus = 'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-500/40 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-950';

function Emoji({ children, className = '', size = 28 }: { children: string; className?: string; size?: number }) {
  return <span aria-hidden="true" className={`inline-flex shrink-0 items-center justify-center leading-none ${className}`} style={{ fontSize: size, fontFamily: '"Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif' }}>{children}</span>;
}

export function EmployeeKioskToday({ name, locale, data, unread, loading, failed, busy, onRefresh, onOpen, onMessages, onTools }: {
  name: string; locale: string; data: MultiKioskToday | null; unread: number | null; loading: boolean; failed: boolean; busy: boolean;
  onRefresh: () => void; onOpen: (id: number) => void; onMessages: () => void; onTools: () => void;
}) {
  const c = employeePortalCopy(locale);
  const summaryId = useId();
  const t = employeeTodayCopy(locale);
  const day = data?.attendance?.day;
  const tasks = data?.tasks?.day;
  const attendanceLabel = day?.lastCheckOut ? c.finished : day?.firstCheckIn ? c.active : day?.restDay ? c.rest
    : day?.status === 'not_scheduled' ? c.unscheduled : c.noCheckIn;
  const dateLabel = data?.date ? new Date(`${data.date}T12:00:00`).toLocaleDateString(locale, { weekday: 'long', day: 'numeric', month: 'long' }) : c.intro;
  const attendanceEmoji = day?.lastCheckOut ? '✅' : day?.restDay ? '🌿' : '⏰';

  return <div className="space-y-4 text-[#222831] dark:text-slate-100 sm:space-y-5 [[data-kiosk-large-text=true]_&_.text-xs]:!text-base [[data-kiosk-large-text=true]_&_.text-sm]:!text-base [[data-kiosk-large-text=true]_&_[data-today-shortcuts]]:!grid-cols-1" data-employee-today>
    <header className="relative overflow-hidden rounded-[1.5rem] bg-[#143675] p-5 text-white sm:p-6" data-today-welcome>
      <div aria-hidden="true" className="pointer-events-none absolute -bottom-14 -right-10 h-40 w-40 rounded-full border-[22px] border-white/[0.04]" />
      <div className="relative flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm text-[#DBEAFE]">{c.greeting}</p>
          <h2 className="mt-1.5 flex items-center gap-2 text-[1.625rem] font-medium leading-tight tracking-tight text-white sm:text-[1.875rem]"><span className="min-w-0 break-words">{name}</span><Emoji size={26}>👋</Emoji></h2>
          <p className="mt-3 text-[0.8125rem] leading-5 text-[#DBEAFE] first-letter:uppercase">{dateLabel}</p>
        </div>
        <button type="button" disabled={loading} onClick={onRefresh} aria-label={c.refresh} className={`grid h-11 w-11 shrink-0 place-items-center rounded-2xl border border-white/25 bg-white/10 text-white transition-colors hover:bg-white/20 disabled:opacity-60 ${focus}`}><RefreshCw size={18} aria-hidden="true" className={loading ? 'animate-spin motion-reduce:animate-none' : ''} /></button>
      </div>
    </header>

    {loading && !data ? <div role="status" className={`${panel} animate-pulse p-5 text-sm text-slate-600 motion-reduce:animate-none dark:text-slate-300`}>{c.loading}</div> : null}
    {failed ? <div role="alert" className="rounded-2xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-100"><p>{c.unavailable}</p><button type="button" className={`mt-2 min-h-11 rounded-lg px-2 underline ${focus}`} onClick={onRefresh}>{c.retry}</button></div> : null}

    <div className="grid gap-4 lg:grid-cols-2 lg:gap-5">
      {data?.attendance && day ? <section className={`${panel} relative overflow-hidden p-4 sm:p-5`} data-today-attendance>
        <div aria-hidden="true" className="absolute inset-y-6 left-0 w-1 rounded-r-full bg-[#59C3A5]" />
        <div className="flex items-start gap-3">
          <Emoji className="h-12 w-12 rounded-2xl bg-[#E7F7F1] dark:bg-emerald-950">{attendanceEmoji}</Emoji>
          <div className="min-w-0 flex-1">
            <h3 className="text-sm font-medium text-[#425466] dark:text-slate-300">{c.attendance}</h3>
            <p className="mt-1 text-lg font-medium leading-snug text-[#222831] dark:text-slate-100">{attendanceLabel}</p>
            {day.startTime && day.endTime ? <p className="mt-1.5 text-sm tabular-nums text-[#425466] dark:text-slate-300">{day.startTime.slice(0, 5)} – {day.endTime.slice(0, 5)}</p> : null}
          </div>
        </div>
        <button type="button" disabled={busy} className={`mt-4 flex min-h-12 w-full items-center justify-between gap-3 rounded-2xl bg-[#59C3A5] px-4 py-3 text-left text-base font-medium text-[#222831] transition-colors hover:bg-[#3AAE90] disabled:opacity-50 ${focus}`} onClick={() => onOpen(data.attendance!.kioskId)}>{day.lastCheckOut || day.restDay ? c.viewAttendance : day.firstCheckIn ? c.checkOut : c.checkIn}<ArrowRight size={19} aria-hidden="true" className="shrink-0" /></button>
      </section> : null}

      <div className={`grid min-w-0 gap-3 ${tasks ? 'grid-cols-2' : 'grid-cols-1'} ${!data?.attendance ? 'lg:col-span-2' : ''}`} data-today-shortcuts>
        {data?.tasks && tasks ? <button type="button" aria-label={c.openTasks} aria-describedby={`${summaryId}-tasks`} disabled={busy} onClick={() => onOpen(data.tasks!.kioskId)} className={`${panel} flex min-w-0 flex-col items-start p-4 text-left transition-colors hover:border-[#D9B142] disabled:opacity-50 ${focus}`} data-today-tasks>
          <span className="flex w-full items-center justify-between gap-2"><Emoji className="h-10 w-10 rounded-xl bg-[#FFF4CF] dark:bg-amber-950">📝</Emoji><ArrowRight size={17} aria-hidden="true" className="text-[#66521B] dark:text-amber-300" /></span>
          <span className="mt-3 text-sm font-medium text-[#222831] dark:text-slate-100">{c.tasks}</span>
          <span id={`${summaryId}-tasks`} className="mt-1 flex flex-wrap items-baseline gap-x-1.5"><span className="text-[1.75rem] font-medium leading-tight tabular-nums text-[#222831] dark:text-white">{new Intl.NumberFormat(locale).format(tasks.pending)}</span><span className="text-xs text-[#425466] dark:text-slate-300">{c.pending}</span></span>
          <span className={`mt-2 rounded-md px-2 py-1 text-xs leading-4 ${tasks.overdue > 0 ? 'bg-rose-50 text-[#9F1239] dark:bg-rose-950 dark:text-rose-200' : 'bg-slate-50 text-[#425466] dark:bg-slate-800 dark:text-slate-300'}`}>{tasks.overdue > 0 ? employeePortalCount(locale, 'overdue', tasks.overdue) : tasks.pending === 0 ? c.upToDate : t.pendingHint}</span>
        </button> : null}
        <button type="button" aria-label={c.messages} aria-describedby={`${summaryId}-messages`} onClick={onMessages} className={`${panel} flex min-w-0 flex-col items-start p-4 text-left transition-colors hover:border-blue-300 ${focus}`} data-today-messages>
          <span className="flex w-full items-center justify-between gap-2"><Emoji className="h-10 w-10 rounded-xl bg-[#EFF6FF] dark:bg-blue-950">{unread !== null && unread > 0 ? '📬' : '💬'}</Emoji><ArrowRight size={17} aria-hidden="true" className="text-[#2563EB] dark:text-blue-300" /></span>
          <span className="mt-3 text-sm font-medium text-[#222831] dark:text-slate-100">{c.messages}</span>
          <span id={`${summaryId}-messages`} className="mt-1 flex flex-wrap items-baseline gap-x-1.5"><span className="text-[1.75rem] font-medium leading-tight tabular-nums text-[#143675] dark:text-blue-200">{unread === null ? '—' : new Intl.NumberFormat(locale).format(unread)}</span><span className="text-xs text-[#425466] dark:text-slate-300">{t.unreadShort}</span></span>
          <span className="mt-2 rounded-md bg-[#EFF6FF] px-2 py-1 text-xs leading-4 text-[#143675] dark:bg-blue-950 dark:text-blue-200">{unread === 0 ? t.caughtUp : t.yourTeam}</span>
        </button>
      </div>
    </div>

    {tasks && tasks.items.length > 0 ? <section className={`${panel} overflow-hidden`} data-today-priorities>
      <div className="flex items-center gap-2.5 px-4 pb-2 pt-4 sm:px-5 sm:pt-5"><Emoji size={24}>🎯</Emoji><h3 className="text-base font-medium text-[#222831] dark:text-slate-100">{t.nextStep}</h3></div>
      <ul className="divide-y divide-slate-100 px-4 dark:divide-slate-800 sm:px-5">{tasks.items.map(task => {
        const overdue = Boolean(task.dueDate && data?.date && task.dueDate < data.date);
        const dueToday = task.dueDate === data?.date;
        const date = task.dueDate ? new Date(`${task.dueDate}T12:00:00`).toLocaleDateString(locale, { day: 'numeric', month: 'short' }) : null;
        return <li key={task.id}><button type="button" disabled={busy} onClick={() => onOpen(data!.tasks!.kioskId)} className={`flex min-h-20 w-full items-center gap-3 rounded-xl py-3.5 text-left transition-colors hover:bg-slate-50 disabled:opacity-50 dark:hover:bg-slate-800 ${focus}`}>
          <span aria-hidden="true" className={`h-2 w-2 shrink-0 rounded-full ${overdue ? 'bg-rose-600 dark:bg-rose-400' : 'bg-[#D4A719]'}`} />
          <span className="min-w-0 flex-1"><span className="block break-words text-[0.9375rem] font-medium leading-snug text-[#222831] dark:text-slate-100">{task.title}</span>
            {date ? <span className={`mt-1.5 inline-flex flex-wrap items-center gap-x-1.5 text-xs leading-5 ${overdue ? 'text-[#9F1239] dark:text-rose-200' : 'text-[#425466] dark:text-slate-300'}`}>{overdue ? <><span>{t.overdueTask}</span><span aria-hidden="true">·</span></> : null}<span>{dueToday ? t.dueToday : date}</span></span> : null}
          </span><ArrowRight size={17} aria-hidden="true" className="shrink-0 text-[#425466] dark:text-slate-300" />
        </button></li>;
      })}</ul>
    </section> : null}

    {!data?.tasks && !data?.attendance && !loading ? <button type="button" className={`flex min-h-12 w-full items-center justify-between gap-3 rounded-2xl bg-[#2563EB] px-4 py-3 text-base font-medium text-white ${focus}`} onClick={onTools}><span className="flex items-center gap-3"><Emoji size={24}>🧰</Emoji>{c.openTools}</span><ArrowRight size={19} aria-hidden="true" /></button> : null}
    <p className="flex items-start gap-2 px-1 pb-1 text-xs leading-5 text-[#425466] dark:text-slate-300"><Emoji className="mt-0.5" size={14}>🔒</Emoji><span>{c.privacy}</span></p>
  </div>;
}
