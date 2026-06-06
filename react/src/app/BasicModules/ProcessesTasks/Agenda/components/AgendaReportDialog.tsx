import { Download, FileText } from 'lucide-react';
import { Badge } from '../../../../components/ui/badge';
import { Button } from '../../../../components/ui/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogTitle,
} from '../../../../components/ui/dialog';
import { cn } from '../../../../components/ui/utils';
import type { AgendaTaskItem } from '../agendaApi';
import type { AgendaTranslations } from '../translations';
import { clampPercent, formatWeightingScore, getTaskDisplayStatus } from '../utils/agendaTaskStatus';
import { formatDate, reportValue } from '../utils/agendaReports';

type AgendaReportDialogProps = {
  accentButtonClassName: string;
  copy: AgendaTranslations;
  onDownload: (task: AgendaTaskItem) => void;
  onOpenChange: (open: boolean) => void;
  task: AgendaTaskItem | null;
};

export function AgendaReportDialog({
  accentButtonClassName,
  copy,
  onDownload,
  onOpenChange,
  task,
}: AgendaReportDialogProps) {
  return (
    <Dialog open={Boolean(task)} onOpenChange={onOpenChange}>
      <DialogContent
        hideCloseButton
        className="!flex h-[min(88vh,860px)] w-[calc(100vw-2rem)] !max-w-[920px] max-h-[calc(100vh-3rem)] flex-col gap-0 overflow-hidden rounded-[32px] border border-slate-200/80 bg-white p-0 shadow-[0_30px_80px_rgba(15,23,42,0.22)] sm:!max-w-[920px] dark:border-slate-700 dark:bg-slate-800"
      >
        <div className="shrink-0 bg-[#F4C84A] px-6 py-4">
          <div className="flex items-center justify-between gap-4">
            <div className="pr-4">
              <DialogTitle className="flex items-center gap-2 text-[1.2rem] font-bold leading-tight text-slate-950 sm:text-[1.4rem]">
                <FileText className="h-5 w-5" />
                {copy.report.title}
              </DialogTitle>
            </div>
            <DialogClose asChild>
              <Button
                type="button"
                variant="outline"
                className="h-9 rounded-2xl border-[#9A6B05]/25 bg-white/35 px-3 text-slate-950 hover:bg-white/60 hover:text-slate-950"
              >
                {copy.common.close}
              </Button>
            </DialogClose>
          </div>
        </div>

        {task ? (
          <>
            <div className="shrink-0 border-b border-slate-200/80 bg-white px-6 py-4 dark:border-slate-700 dark:bg-slate-800">
              <DialogDescription className="max-w-3xl text-sm leading-6 text-slate-600 dark:text-slate-400">
                {copy.report.description}
              </DialogDescription>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <Badge variant="outline" className="rounded-full border-slate-200 bg-slate-50 px-3 py-1 font-semibold text-slate-700 dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-200">
                  {task.folio}
                </Badge>
                <Badge variant="outline" className="rounded-full border-slate-200 bg-slate-50 px-3 py-1 font-semibold text-slate-700 dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-200">
                  {copy.taskTypes[task.taskType]}
                </Badge>
                <Badge variant="outline" className="rounded-full border-slate-200 bg-slate-50 px-3 py-1 font-semibold text-slate-700 dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-200">
                  {copy.statuses[getTaskDisplayStatus(task)]}
                </Badge>
                <Badge variant="outline" className="rounded-full border-slate-200 bg-slate-50 px-3 py-1 font-semibold text-slate-700 dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-200">
                  {copy.priorities[task.priority]}
                </Badge>
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto bg-slate-50/70 px-5 py-5 dark:bg-slate-900/60">
              <div className="space-y-5">
                <section className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800">
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">{task.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-400">
                    {task.description ?? copy.common.noDescription}
                  </p>
                </section>

                <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
                  <div className="rounded-2xl border border-slate-200/80 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
                    <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">{copy.report.sections.progress}</p>
                    <p className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">
                      {clampPercent(task.completionPercent)}%
                    </p>
                  </div>
                  <div className="rounded-2xl border border-slate-200/80 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
                    <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">{copy.report.sections.weighting}</p>
                    <p className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">
                      {task.weighting == null ? '-' : formatWeightingScore(task.weighting, copy.table.noWeighting)}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-slate-200/80 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
                    <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">{copy.report.sections.audit}</p>
                    <p className="mt-1 text-base font-bold text-slate-900 dark:text-white">
                      {copy.auditStatuses[task.auditStatus]}
                    </p>
                  </div>
                </section>

                <section className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="rounded-2xl border border-slate-200/80 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
                    <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">{copy.report.sections.context}</p>
                    <div className="mt-3 space-y-2 text-sm text-slate-700 dark:text-slate-200">
                      <p>{copy.report.fields.unit}: {reportValue(task.unitName ?? task.unitId, copy.common.noRecord)}</p>
                      <p>{copy.report.fields.business}: {reportValue(task.businessName ?? task.businessId, copy.common.noRecord)}</p>
                      <p>{copy.report.fields.project}: {reportValue(task.projectName ?? task.projectId, copy.common.noRecord)}</p>
                      <p>{copy.report.fields.process}: {reportValue(task.processTitle ?? task.processId, copy.common.noRecord)}</p>
                    </div>
                  </div>
                  <div className="rounded-2xl border border-slate-200/80 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
                    <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">{copy.report.sections.people}</p>
                    <div className="mt-3 space-y-2 text-sm text-slate-700 dark:text-slate-200">
                      <p>{copy.report.fields.creator}: {reportValue(task.createdByName ?? task.creator, copy.common.noRecord)}</p>
                      <p>{copy.report.fields.responsible}: {reportValue(task.assignedName, copy.common.unassigned)}</p>
                      <p>{copy.report.fields.completedBy}: {reportValue(task.closedByName ?? task.completedByName, copy.common.noRecord)}</p>
                      <p>{copy.report.fields.auditedBy}: {reportValue(task.auditedByName, copy.common.noRecord)}</p>
                    </div>
                  </div>
                </section>

                <section className="rounded-2xl border border-slate-200/80 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
                  <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">{copy.report.sections.dates}</p>
                  <div className="mt-3 grid grid-cols-1 gap-3 text-sm text-slate-700 dark:text-slate-200 md:grid-cols-2">
                    <p>{copy.report.fields.createdAt}: {task.createdAt ? formatDate(task.createdAt, true) : copy.common.noDate}</p>
                    <p>{copy.report.fields.startDate}: {task.startDate ? formatDate(task.startDate) : copy.common.noDate}</p>
                    <p>{copy.report.fields.dueDate}: {task.dueDate ? formatDate(task.dueDate) : copy.common.noDate}</p>
                    <p>{copy.report.fields.closedAt}: {task.completedAt ? formatDate(task.completedAt, true) : copy.common.pending}</p>
                    <p>{copy.report.fields.auditedAt}: {task.auditedAt ? formatDate(task.auditedAt, true) : copy.common.pending}</p>
                  </div>
                </section>

                <section className="rounded-2xl border border-slate-200/80 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
                  <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">{copy.report.sections.notes}</p>
                  <div className="mt-3 space-y-3 text-sm leading-6 text-slate-700 dark:text-slate-200">
                    <p>{task.notes ?? copy.common.noNotes}</p>
                    <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 dark:border-slate-700 dark:bg-slate-900/70">
                      <p className="font-semibold text-slate-900 dark:text-white">{copy.report.sections.auditNotes}</p>
                      <p className="mt-1">{task.auditNotes ?? copy.common.noAuditNotes}</p>
                    </div>
                  </div>
                </section>
              </div>
            </div>

            <DialogFooter className="shrink-0 border-t border-slate-200/80 bg-white px-6 py-4 dark:border-slate-700 dark:bg-slate-800">
              <DialogClose asChild>
                <Button type="button" variant="outline" className="h-10 rounded-xl border-slate-200 bg-white px-6 text-sm font-semibold dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100">
                  {copy.common.close}
                </Button>
              </DialogClose>
              <Button
                type="button"
                className={cn('h-10 rounded-xl px-6 text-sm font-semibold', accentButtonClassName)}
                onClick={() => onDownload(task)}
              >
                <Download className="h-4 w-4" />
                {copy.report.downloadPdf}
              </Button>
            </DialogFooter>
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
