import { BadgeCheck, FileSpreadsheet, ShieldAlert } from 'lucide-react';
import { cn } from '../../../components/ui/utils';
import type { AccountingReportCopy } from './accountingReportTranslations';
import type { AccountingReport } from './accountingReportsApi';
import type { AccountingPrintView } from './InformesContables';

export function AccountingDocumentCanvas({ copy, data, report }: {
  copy: AccountingReportCopy;
  data: AccountingReport;
  report: AccountingPrintView;
}) {
  const ready = data.readiness.decisionReady;

  return (
    <article aria-labelledby="accounting-document-title" className="text-slate-950">
      <div className="flex items-start justify-between gap-8 border-b border-slate-200 pb-6">
        <div className="flex min-w-0 items-start gap-4">
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-blue-50 text-blue-700"><FileSpreadsheet className="h-6 w-6" /></span>
          <div>
            <h1 id="accounting-document-title" className="text-2xl font-medium leading-tight">{report.title}</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">{report.subtitle}</p>
          </div>
        </div>
        <span className={cn(
          'inline-flex shrink-0 items-center gap-2 rounded-full border px-3 py-2 text-xs font-medium',
          ready ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-amber-200 bg-amber-50 text-amber-800',
        )}>
          {ready ? <BadgeCheck className="h-4 w-4" /> : <ShieldAlert className="h-4 w-4" />}
          {copy.readiness[data.readiness.status]}
        </span>
      </div>

      <dl className="grid gap-3 border-b border-slate-200 py-6 sm:grid-cols-3">
        {report.metrics.map((metric, index) => (
          <div key={metric.label} className={cn('rounded-xl border p-4', index === 0 ? 'border-blue-200 bg-blue-50' : 'border-slate-200 bg-slate-50')}>
            <dt className="text-xs text-slate-500">{metric.label}</dt>
            <dd className="mt-2 text-xl font-medium tabular-nums text-slate-950">{metric.value}</dd>
          </div>
        ))}
      </dl>

      <section className="grid gap-3 border-b border-slate-200 py-5 sm:grid-cols-4">
        {[
          [copy.filters.period, `${data.context.from} / ${data.context.to}`],
          [copy.common.framework, data.context.reportingFramework.split('_').join(' ')],
          [copy.common.currency, data.context.presentationCurrency],
          [copy.readiness.coverage, `${data.readiness.coveragePercent}%`],
        ].map(([label, value]) => (
          <div key={label}><p className="text-xs text-slate-500">{label}</p><p className="mt-1 text-sm font-medium text-slate-800">{value}</p></div>
        ))}
      </section>

      <div className="space-y-7 pt-6">
        {report.tables.map((table) => (
          <section key={table.title} className="overflow-hidden rounded-xl border border-slate-200">
            <div className="border-b border-slate-200 bg-slate-50 px-4 py-3"><h2 className="text-base font-medium">{table.title}</h2></div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[680px] border-collapse text-xs">
                <thead className="bg-white text-slate-500"><tr>{table.headers.map((header, index) => <th key={header} className={cn('border-b border-slate-200 px-3 py-3 font-medium', index === 0 ? 'text-left' : 'text-right')}>{header}</th>)}</tr></thead>
                <tbody className="divide-y divide-slate-100">
                  {table.rows.length ? table.rows.map((row, rowIndex) => <tr key={`${table.title}-${rowIndex}`} className="odd:bg-white even:bg-slate-50/70">{row.map((cell, index) => <td key={`${rowIndex}-${index}`} className={cn('px-3 py-3 align-top', index === 0 ? 'text-left font-medium text-slate-800' : 'text-right tabular-nums text-slate-600')}>{cell}</td>)}</tr>) : <tr><td colSpan={table.headers.length} className="px-4 py-8 text-center text-slate-500">{table.emptyLabel}</td></tr>}
                </tbody>
              </table>
            </div>
          </section>
        ))}
      </div>

      <div className="mt-6 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-xs leading-5 text-blue-800">
        {data.readiness.message}
      </div>
      {data.preparationNotes?.length ? <div className="mt-5 space-y-2 border-t border-slate-200 pt-4 text-xs leading-5 text-slate-600">
        {data.preparationNotes.map(note => <p key={note}>{note}</p>)}
      </div> : null}
    </article>
  );
}
