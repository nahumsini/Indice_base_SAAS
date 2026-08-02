import { Download, FileText } from 'lucide-react';
import { Badge } from '../../../../components/ui/badge';
import { Button } from '../../../../components/ui/button';
import { IndiceModalFrame, IndiceModalSummary } from '../../../../components/indice-modal';
import type { AgendaTaskItem } from '../agendaApi';
import type { AgendaTranslations } from '../translations';
import { clampPercent, formatWeightingScore, getTaskDisplayStatus } from '../utils/agendaTaskStatus';
import { formatDate, reportValue } from '../utils/agendaReports';

type AgendaReportDialogProps = {
  copy: AgendaTranslations;
  onDownload: (task: AgendaTaskItem) => void;
  onOpenChange: (open: boolean) => void;
  task: AgendaTaskItem | null;
};

const sectionClassName = 'rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900';
const headingClassName = 'text-sm font-medium text-slate-600 dark:text-slate-300';

export function AgendaReportDialog({ copy, onDownload, onOpenChange, task }: AgendaReportDialogProps) {
  const status = task ? getTaskDisplayStatus(task) : 'pending';

  return (
    <IndiceModalFrame
      closeLabel={copy.common.close}
      contentClassName="sm:!max-w-[920px]"
      description={copy.report.description}
      footer={task ? (
        <>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>{copy.common.close}</Button>
          <Button type="button" onClick={() => onDownload(task)}>
            <Download className="h-4 w-4" />
            {copy.report.downloadPdf}
          </Button>
        </>
      ) : undefined}
      footerSummary={task?.folio}
      icon={<FileText className="h-5 w-5" />}
      modalType="operational-workspace"
      onOpenChange={onOpenChange}
      open={Boolean(task)}
      title={copy.report.title}
      tone="yellow"
    >
      {task ? (
        <div className="space-y-5">
          <div className="flex flex-wrap items-center gap-2">
            {[task.folio, copy.taskTypes[task.taskType], copy.statuses[status], copy.priorities[task.priority]].map((value) => (
              <Badge key={value} variant="outline" className="rounded-full border-slate-200 bg-white px-3 py-1 font-medium text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200">
                {value}
              </Badge>
            ))}
          </div>

          <section className={sectionClassName}>
            <h3 className="text-lg font-medium text-slate-900 dark:text-white">{task.title}</h3>
            <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-400">{task.description ?? copy.common.noDescription}</p>
          </section>

          <IndiceModalSummary
            columns={3}
            items={[
              { label: copy.report.sections.progress, value: `${clampPercent(task.completionPercent)}%`, emphasized: true },
              { label: copy.report.sections.weighting, value: task.weighting == null ? '-' : formatWeightingScore(task.weighting, copy.table.noWeighting) },
              { label: copy.report.sections.audit, value: copy.auditStatuses[task.auditStatus] },
            ]}
          />

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <section className={sectionClassName}>
              <h3 className={headingClassName}>{copy.report.sections.context}</h3>
              <dl className="mt-3 space-y-2 text-sm text-slate-700 dark:text-slate-200">
                <ReportRow label={copy.report.fields.unit} value={reportValue(task.unitName ?? task.unitId, copy.common.noRecord)} />
                <ReportRow label={copy.report.fields.business} value={reportValue(task.businessName ?? task.businessId, copy.common.noRecord)} />
                <ReportRow label={copy.report.fields.project} value={reportValue(task.projectName ?? task.projectId, copy.common.noRecord)} />
                <ReportRow label={copy.report.fields.process} value={reportValue(task.processTitle ?? task.processId, copy.common.noRecord)} />
              </dl>
            </section>
            <section className={sectionClassName}>
              <h3 className={headingClassName}>{copy.report.sections.people}</h3>
              <dl className="mt-3 space-y-2 text-sm text-slate-700 dark:text-slate-200">
                <ReportRow label={copy.report.fields.creator} value={reportValue(task.createdByName ?? task.creator, copy.common.noRecord)} />
                <ReportRow label={copy.report.fields.responsible} value={reportValue(task.assignedName, copy.common.unassigned)} />
                <ReportRow label={copy.report.fields.completedBy} value={reportValue(task.closedByName ?? task.completedByName, copy.common.noRecord)} />
                <ReportRow label={copy.report.fields.auditedBy} value={reportValue(task.auditedByName, copy.common.noRecord)} />
              </dl>
            </section>
          </div>

          <section className={sectionClassName}>
            <h3 className={headingClassName}>{copy.report.sections.dates}</h3>
            <dl className="mt-3 grid grid-cols-1 gap-3 text-sm text-slate-700 md:grid-cols-2 dark:text-slate-200">
              <ReportRow label={copy.report.fields.createdAt} value={task.createdAt ? formatDate(task.createdAt, true) : copy.common.noDate} />
              <ReportRow label={copy.report.fields.startDate} value={task.startDate ? formatDate(task.startDate) : copy.common.noDate} />
              <ReportRow label={copy.report.fields.dueDate} value={task.dueDate ? formatDate(task.dueDate) : copy.common.noDate} />
              <ReportRow label={copy.report.fields.closedAt} value={task.completedAt ? formatDate(task.completedAt, true) : copy.common.pending} />
              <ReportRow label={copy.report.fields.auditedAt} value={task.auditedAt ? formatDate(task.auditedAt, true) : copy.common.pending} />
            </dl>
          </section>

          <section className={sectionClassName}>
            <h3 className={headingClassName}>{copy.report.sections.notes}</h3>
            <p className="mt-3 text-sm leading-6 text-slate-700 dark:text-slate-200">{task.notes ?? copy.common.noNotes}</p>
            <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 dark:border-slate-700 dark:bg-slate-800">
              <p className="text-sm font-medium text-slate-900 dark:text-white">{copy.report.sections.auditNotes}</p>
              <p className="mt-1 text-sm leading-6 text-slate-700 dark:text-slate-200">{task.auditNotes ?? copy.common.noAuditNotes}</p>
            </div>
          </section>
        </div>
      ) : null}
    </IndiceModalFrame>
  );
}

function ReportRow({ label, value }: { label: string; value: string }) {
  return <div><dt className="inline text-slate-500 dark:text-slate-400">{label}: </dt><dd className="inline font-medium">{value}</dd></div>;
}
