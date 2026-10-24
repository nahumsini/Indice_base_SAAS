import { Button } from '../../../../../../components/ui/button';
import { IndiceFilterSegmented, IndiceFilterSelect } from '../../../../../../components/frontend-os/IndiceFilterBar';
import type { IncidentReport, IncidentReportEmployee, IncidentReportDay } from '../../../types/incidentReport';
import { incidentStatusLabel, type IncidentReportCopy } from '../../../translations/incidentReportCopy';
import { incidentDateLabel, incidentTimeLabel } from '../../../utils/incidentReportPeriod';
import { IncidentReportTable, type IncidentColumn } from './IncidentReportTable';

export function IncidentStatus({ day, copy }: { day: IncidentReportDay; copy: IncidentReportCopy }) {
  const tone = ({ on_time: 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200',
    late: 'bg-amber-50 text-amber-800 dark:bg-amber-950 dark:text-amber-200', absence: 'bg-rose-50 text-rose-800 dark:bg-rose-950 dark:text-rose-200',
    leave: 'bg-blue-50 text-blue-800 dark:bg-blue-950 dark:text-blue-200' } as Record<string, string>)[day.status]
    ?? 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-200';
  return <span className={`inline-flex max-w-full rounded-full px-2.5 py-1 text-xs font-medium ${tone}`}>{incidentStatusLabel(day.status, copy)}</span>;
}

export function IncidentReportResults({ report, copy, locale, view, selectedId, onView, onEmployee }: {
  report: IncidentReport; copy: IncidentReportCopy; locale: string; view: 'summary' | 'detail'; selectedId: number | null;
  onView: (view: 'summary' | 'detail') => void; onEmployee: (id: number) => void;
}) {
  const selected = report.employees.find(e => e.person.id === selectedId) ?? report.employees[0];
  const counts = (employee: IncidentReportEmployee) => employee.totals.statuses;
  const metrics = [[copy.people, report.employeeCount], [copy.attendance, (report.totals.statuses.on_time ?? 0) + (report.totals.statuses.late ?? 0)],
    [copy.late, report.totals.statuses.late ?? 0], [copy.absence, report.totals.statuses.absence ?? 0],
    [copy.leave, report.totals.statuses.leave ?? 0], [copy.incomplete, report.totals.incompleteDays]] as const;
  const openEmployee = (e: IncidentReportEmployee) => { onEmployee(e.person.id); onView('detail'); };
  const personLabel = (e: IncidentReportEmployee) => <div className="space-y-1">
    <p className="font-medium text-slate-900 dark:text-white">{e.person.name}</p>
    <p className="text-xs text-slate-500">{[e.person.code, e.person.businessName || copy.unassigned].filter(Boolean).join(' · ')}</p>
    {e.totals.statuses.outside_employment ? <p className="text-xs text-slate-500">{copy.outside}: {e.totals.statuses.outside_employment}</p> : null}
    {e.person.employmentStatus === 'terminated' ? <p className="text-xs text-slate-500">{copy.former}</p> : null}
  </div>;
  const summaryColumns: IncidentColumn<IncidentReportEmployee>[] = [
    { id: 'employee', label: copy.employee, width: 260, value: e => e.person.name, render: personLabel },
    ...(['on_time', 'late', 'absence', 'leave', 'rest', 'pending', 'not_scheduled'] as const).map(status => ({
      id: status, label: incidentStatusLabel(status, copy), width: status === 'not_scheduled' ? 145 : 120, value: (e: IncidentReportEmployee) => counts(e)[status] ?? 0,
    })),
    { id: 'incomplete', label: copy.incomplete, width: 170, value: e => e.totals.incompleteDays },
    { id: 'detail', label: copy.viewDays, action: true, width: 140, value: e => e.person.name, render: e => <Button variant="outline" className="min-h-11 rounded-xl" onClick={() => openEmployee(e)}>{copy.viewDays}</Button> },
  ];
  const dailyColumns: IncidentColumn<IncidentReportDay>[] = [
    { id: 'date', label: copy.day, width: 160, value: d => d.date, render: d => incidentDateLabel(d.date, locale) },
    { id: 'status', label: copy.status, width: 185, value: d => incidentStatusLabel(d.status, copy), render: d => <div className="space-y-1"><IncidentStatus day={d} copy={copy} />
      {d.correctedStatus ? <p className="text-xs text-slate-500">{copy.corrected}</p> : null}</div> },
    { id: 'checkIn', label: copy.checkIn, width: 155, value: d => d.checkIn ?? '', render: d => incidentTimeLabel(d.checkIn, locale, d.date) },
    { id: 'checkOut', label: copy.checkOut, width: 155, value: d => d.checkOut ?? '', render: d => incidentTimeLabel(d.checkOut, locale, d.date) },
    { id: 'minutesLate', label: copy.lateMinutes, width: 165, value: d => d.status === 'late' ? d.minutesLate : 0 },
    { id: 'notes', label: copy.notes, width: 300, value: d => d.notes ?? '', render: d => <div className="space-y-1 whitespace-pre-wrap">{d.incomplete ? <p className="text-amber-700 dark:text-amber-300">{copy.incomplete}</p> : null}{d.notes || '—'}</div> },
  ];
  return <div className="min-w-0 space-y-4" data-incident-results>
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">{metrics.map(([label, value]) => <div key={label} className="rounded-2xl border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-800">
      <p className="text-2xl font-medium text-slate-900 dark:text-white">{new Intl.NumberFormat(locale).format(value)}</p><p className="mt-1 text-xs text-slate-500 dark:text-slate-300">{label}</p>
    </div>)}</div>
    <div className="grid gap-3 md:grid-cols-2 md:items-end">
      <IndiceFilterSegmented label={`${incidentDateLabel(report.from, locale)} — ${incidentDateLabel(report.to, locale)}`} tone="aqua" value={view}
        onValueChange={v => onView(v as 'summary' | 'detail')} options={[{ value: 'summary', label: copy.summary }, { value: 'detail', label: copy.detail }]} />
      {view === 'detail' && selected ? <IndiceFilterSelect label={copy.employee} tone="aqua" value={String(selected.person.id)}
        onValueChange={v => onEmployee(Number(v))} options={report.employees.map(e => ({ value: String(e.person.id), label: e.person.name }))} /> : null}
    </div>
    {report.employees.length === 0 ? <p className="rounded-2xl border border-dashed border-slate-200 p-8 text-center text-sm text-slate-500">{copy.empty}</p> : view === 'summary'
      ? <IncidentReportTable key="summary" columns={summaryColumns} rows={report.employees} rowKey={e => e.person.id} itemLabel={copy.people}
        mobile={e => <>{personLabel(e)}<dl className="grid grid-cols-3 gap-3 text-sm">{['on_time', 'late', 'absence', 'leave', 'rest', 'not_scheduled'].map(status => <div key={status}>
          <dt className="text-xs text-slate-500">{incidentStatusLabel(status, copy)}</dt><dd className="mt-1 font-medium">{counts(e)[status] ?? 0}</dd></div>)}</dl>
          <Button variant="outline" className="min-h-11 w-full rounded-xl" onClick={() => openEmployee(e)}>{copy.viewDays}</Button>{e.totals.incompleteDays ? <p className="text-sm text-amber-700 dark:text-amber-300">{copy.incomplete}: {e.totals.incompleteDays}</p> : null}</>} />
      : selected ? <div className="space-y-3"><div className="flex flex-wrap items-start justify-between gap-2 rounded-2xl border border-slate-200 p-4 dark:border-slate-700">
        {personLabel(selected)}<p className="text-sm text-slate-500">{copy.entries}: {selected.totals.daysWithEntry} · {copy.incomplete}: {selected.totals.incompleteDays}</p>
      </div><IncidentReportTable key={selected.person.id} columns={dailyColumns} rows={selected.days} rowKey={d => d.date} itemLabel={copy.periodDays}
        mobile={d => <><div className="flex flex-wrap items-center justify-between gap-2"><p className="font-medium">{incidentDateLabel(d.date, locale)}</p><IncidentStatus day={d} copy={copy} /></div>
          <dl className="grid grid-cols-2 gap-3 text-sm"><div><dt className="text-xs text-slate-500">{copy.checkIn}</dt><dd>{incidentTimeLabel(d.checkIn, locale, d.date)}</dd></div>
            <div><dt className="text-xs text-slate-500">{copy.checkOut}</dt><dd>{incidentTimeLabel(d.checkOut, locale, d.date)}</dd></div></dl>
          {d.correctedStatus ? <p className="text-xs text-slate-500">{copy.corrected}</p> : null}
          {d.status === 'late' ? <p className="text-sm text-slate-500">{copy.lateMinutes}: {d.minutesLate}</p> : null}
          {d.incomplete ? <p className="text-sm text-amber-700 dark:text-amber-300">{copy.incomplete}</p> : null}
          {d.notes ? <p className="break-words whitespace-pre-wrap text-sm text-slate-500">{d.notes}</p> : null}</>} /></div> : null}
  </div>;
}
