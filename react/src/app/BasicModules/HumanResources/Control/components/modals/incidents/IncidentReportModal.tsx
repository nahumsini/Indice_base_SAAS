import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, CalendarDays, Eye, Printer } from 'lucide-react';
import { IndiceModalFrame } from '../../../../../../components/indice-modal';
import { Button } from '../../../../../../components/ui/button';
import { useCompanyPrintIdentity } from '../../../../../shared/print/useCompanyPrintIdentity';
import { StandardDocumentPreview } from '../../../../../shared/print/StandardDocumentPreview';
import { printStandardDocumentHtml } from '../../../../../shared/print/standardDocumentHtml';
import { getWebPrintCopy } from '../../../../../shared/print/webPrintCopy';
import { useIncidentReport } from '../../../hooks/useIncidentReport';
import type { TimeTableModalProps } from '../../../types/timeTableTypes';
import { getIncidentReportCopy } from '../../../translations/incidentReportCopy';
import { incidentDateLabel } from '../../../utils/incidentReportPeriod';
import { buildIncidentReportDocument } from '../../../utils/incidentReportPrint';
import { IncidentReportFilters } from './IncidentReportFilters';
import { IncidentReportResults } from './IncidentReportResults';

export function IncidentReportModal({ assignments, date, locale, onClose }: TimeTableModalProps) {
  const copy = getIncidentReportCopy(locale);
  const printCopy = getWebPrintCopy(locale);
  const state = useIncidentReport(date);
  const { identity, isReady: companyReady } = useCompanyPrintIdentity();
  const { report, view, selectedId } = state;
  const [showPreview, setShowPreview] = useState(false);
  const definition = useMemo(() => {
    if (!report || !companyReady) return null;
    const selected = report.employees.find(e => e.person.id === selectedId) ?? report.employees[0];
    const employees = view === 'detail' ? (selected ? [selected] : []) : report.employees;
    return buildIncidentReportDocument(report, employees, copy, locale, identity);
  }, [report, view, selectedId, companyReady, identity, copy, locale]);
  const canPrint = Boolean(definition && report && report.employeeCount > 0 && !state.stale && !state.loading && !state.error);
  useEffect(() => { setShowPreview(false); }, [report, view, selectedId, state.stale, state.error]);
  return <IndiceModalFrame open onOpenChange={open => { if (!open) onClose(); }} title={copy.title} description={copy.description}
    closeLabel={copy.close} icon={<CalendarDays className="h-5 w-5" />} tone="aqua" modalType="operational-workspace"
    contentClassName="sm:max-w-[1180px]" footerLeading={<Button variant="outline" onClick={onClose}>{copy.close}</Button>}
    footerSummary={report && !state.stale ? `${incidentDateLabel(report.from, locale)} — ${incidentDateLabel(report.to, locale)}` : undefined}
    footer={<div className="flex min-w-0 flex-wrap gap-2">
      <Button variant="outline" className="min-h-11 whitespace-normal" disabled={!canPrint} onClick={() => setShowPreview(v => !v)}>
        {showPreview ? <ArrowLeft className="h-4 w-4" /> : <Eye className="h-4 w-4" />}{showPreview ? copy.backToReport : copy.preview}
      </Button>
      <Button className="min-h-11 whitespace-normal" disabled={!canPrint} onClick={() => { if (canPrint && definition) printStandardDocumentHtml(definition); }}>
        <Printer className="h-4 w-4" />{printCopy.action}
      </Button>
    </div>}>
    {showPreview && definition && canPrint ? <section className="min-w-0 space-y-3" aria-label={copy.preview}>
      <p className="text-sm text-slate-500 dark:text-slate-400">{printCopy.help}</p>
      <StandardDocumentPreview definition={definition} paperPreview className="h-[65dvh] min-h-[360px] w-full rounded-xl border border-slate-200 bg-white" />
    </section> : <div className="min-w-0 space-y-5" aria-busy={state.loading}>
      <IncidentReportFilters copy={copy} period={state.period} anchor={state.anchor} query={state.query} assignments={assignments}
        employees={report?.employees ?? []} loading={state.loading} valid={state.valid} onPeriod={state.changePeriod}
        onAnchor={state.changeAnchor} onQuery={state.setQuery} onGenerate={() => void state.generate()} />
      {state.error ? <p role="alert" className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800 dark:border-rose-900 dark:bg-rose-950 dark:text-rose-200">{copy.loadError}</p> : null}
      {state.stale ? <p role="status" className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200">{copy.stale}</p> : null}
      {report && !companyReady ? <p role="status" className="text-sm text-slate-500">{copy.preparingCompany}</p> : null}
      {state.loading ? <p role="status" className="p-6 text-center text-sm text-slate-500">{copy.loading}</p> : report && !state.stale && !state.error
        ? <IncidentReportResults report={report} copy={copy} locale={locale} view={view} selectedId={selectedId} onView={state.setView} onEmployee={state.setSelectedId} />
        : !state.stale && !state.error ? <div className="rounded-2xl border border-dashed border-slate-200 p-8 text-center dark:border-slate-700">
          <CalendarDays className="mx-auto mb-3 h-8 w-8 text-[#177D66] dark:text-[#8FE0CA]" /><p className="font-medium text-slate-900 dark:text-white">{copy.initial}</p>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">{copy.initialHint}</p>
        </div> : null}
    </div>}
  </IndiceModalFrame>;
}
