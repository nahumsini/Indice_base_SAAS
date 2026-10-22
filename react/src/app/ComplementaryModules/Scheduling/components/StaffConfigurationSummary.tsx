import { CalendarDays, Layers } from 'lucide-react';
import type { Staff } from '../services/schedulingApi';
import type { SchedulingCopy } from '../translations/schedulingCopy';
import { getSchedulingOperationsCopy } from '../translations/schedulingOperationsCopy';
import { getStaffEditorCopy } from '../translations/staffEditorCopy';

export const staffSectionClass = 'min-w-0 rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 dark:border-slate-700 dark:bg-slate-900';

/** Configuration only: these windows do not claim live booking availability. */
export function StaffWeeklySummary({ days, locale, copy }: { days: Staff['days']; locale: string; copy: SchedulingCopy }) {
  const text = getStaffEditorCopy(locale);
  return <section className={staffSectionClass} aria-label={copy.weekly}>
    <h3 className="mb-3 flex items-center gap-2 text-sm font-medium"><CalendarDays className="h-4 w-4 text-slate-500" aria-hidden="true" />{copy.weekly}</h3>
    <dl className="divide-y divide-slate-100 dark:divide-slate-800">{[1,2,3,4,5,6,7].map(day => {
      const windows = days.filter(row => row.dayOfWeek === day);
      const weekday = new Intl.DateTimeFormat(locale, { weekday: 'long', timeZone: 'UTC' }).format(new Date(Date.UTC(2026,0,4+day)));
      return <div key={day} className="grid grid-cols-[6.5rem_minmax(0,1fr)] items-start gap-3 py-2.5 text-sm">
        <dt className={windows.length ? 'text-slate-700 dark:text-slate-200' : 'text-slate-400 dark:text-slate-500'}>{weekday}</dt>
        <dd className="flex min-w-0 flex-wrap justify-end gap-x-3 gap-y-1 font-medium tabular-nums">{windows.length ? windows.map((window,index) => <span key={index} className="inline-flex items-center gap-2 text-slate-700 dark:text-slate-200"><span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-[#FF6B5E]"/>{window.startTime.slice(0,5)} – {window.endTime.slice(0,5)}</span>) : <span className="font-normal text-slate-400 dark:text-slate-500">{text.noHours}</span>}</dd>
      </div>;
    })}</dl>
  </section>;
}

export function StaffServiceSummary({ staff, services, locale }: {
  staff: Pick<Staff, 'serviceIds' | 'unavailableDates'>; services?: { id: number; name: string }[]; locale: string;
}) {
  const text = getStaffEditorCopy(locale), op = getSchedulingOperationsCopy(locale);
  return <section className={`${staffSectionClass} space-y-4`}>
    <div><h3 className="mb-2 flex items-center gap-2 text-sm font-medium"><Layers className="h-4 w-4 text-slate-500" aria-hidden="true" />{text.assignedServices}</h3>
      {staff.serviceIds?.length ? <ul className="flex flex-wrap gap-2">{staff.serviceIds.map(id => <li key={id} className="max-w-full break-words rounded-lg bg-slate-100 px-2.5 py-1.5 text-sm text-slate-600 dark:bg-slate-800 dark:text-slate-300">{services?.find(service => service.id === id)?.name ?? `${text.retainedService} #${id}`}</li>)}</ul> : <p className="text-sm text-slate-600 dark:text-slate-300">{op.allServices}</p>}
    </div><div className="border-t border-slate-100 pt-4 dark:border-slate-800"><h3 className="mb-2 text-sm font-medium">{op.unavailableDates}</h3>
      {staff.unavailableDates?.length ? <ul className="flex flex-wrap gap-2">{staff.unavailableDates.map(date => <li key={date} className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-sm tabular-nums dark:border-slate-700">{date}</li>)}</ul> : <p className="text-sm text-slate-500 dark:text-slate-400">{text.noExceptions}</p>}
    </div>
  </section>;
}
