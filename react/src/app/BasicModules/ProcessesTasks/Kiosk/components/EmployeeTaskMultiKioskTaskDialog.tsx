import {
  CalendarClock,
  CalendarDays,
  ClipboardCheck,
  Clock3,
  FileUp,
  FolderKanban,
  LoaderCircle,
  MapPin,
  Paperclip,
  UserRound,
} from 'lucide-react';
import {
  KioskFileDropzone,
  KioskWorkspaceFieldStatus,
  KioskWorkspaceNotice,
} from '../../../../components/kiosk-engine/KioskToolWorkspace';
import { KioskModalFrame } from '../../../../components/kiosk-engine/KioskModalFrame';
import { Button } from '../../../../components/ui/button';
import { Textarea } from '../../../../components/ui/textarea';
import { ProgressSlider } from '../../shared/ProgressSlider';
import type { EmployeeTaskAgendaCopy } from '../employeeTaskAgendaTranslations';
import { taskKioskFilesFromInput, taskKioskMaxEvidenceFiles } from '../publicTaskKioskEvidence';
import type { PublicTaskKioskTask } from '../processTaskKioskApi';
import type { TaskKioskLocale, TaskKioskTranslations } from '../translations';

const openTaskStatuses = new Set<PublicTaskKioskTask['status']>([
  'pending',
  'in_progress',
  'paused',
]);

const evidenceAccept = [
  'image/*', '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.csv', '.txt',
].join(',');

function formatTaskDate(value: string | null, locale: TaskKioskLocale, emptyLabel: string) {
  if (!value) return emptyLabel;
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleDateString(locale, { day: 'numeric', month: 'short', year: 'numeric' });
}

function taskTypeLabel(task: PublicTaskKioskTask, copy: TaskKioskTranslations) {
  return {
    task: copy.task.task,
    'project-task': copy.task.projectTask,
    process: copy.task.process,
  }[task.task_type];
}

function scheduleLabel(task: PublicTaskKioskTask, locale: TaskKioskLocale, emptyLabel: string) {
  if (!task.agenda_date) return emptyLabel;
  const date = formatTaskDate(task.agenda_date, locale, emptyLabel);
  const start = task.agenda_start_time?.slice(0, 5);
  const end = task.agenda_end_time?.slice(0, 5);
  return start ? `${date} · ${start}${end ? `–${end}` : ''}` : date;
}

interface EmployeeTaskMultiKioskTaskDialogProps {
  agendaCopy: EmployeeTaskAgendaCopy;
  busy: boolean;
  canComplete: boolean;
  canReschedule: boolean;
  completionNotes: string;
  completionPercent: number;
  copy: TaskKioskTranslations;
  errorMessage: string;
  evidenceBusy: boolean;
  locale: TaskKioskLocale;
  onClose: () => void;
  onComplete: () => Promise<void>;
  onCompletionNotesChange: (value: string) => void;
  onCompletionPercentChange: (value: number) => void;
  onEvidenceFiles: (task: PublicTaskKioskTask, files: File[]) => void;
  onOpenSchedule: (task: PublicTaskKioskTask) => void;
  task: PublicTaskKioskTask | null;
}

export function EmployeeTaskMultiKioskTaskDialog({
  agendaCopy,
  busy,
  canComplete,
  canReschedule,
  completionNotes,
  completionPercent,
  copy,
  errorMessage,
  evidenceBusy,
  locale,
  onClose,
  onComplete,
  onCompletionNotesChange,
  onCompletionPercentChange,
  onEvidenceFiles,
  onOpenSchedule,
  task,
}: EmployeeTaskMultiKioskTaskDialogProps) {
  if (!task) return null;

  const taskIsOpen = openTaskStatuses.has(task.status);
  const evidenceSatisfied = task.evidence_satisfied || task.attachments > 0;
  const requiredEvidenceMissing = task.evidence_required && !evidenceSatisfied;
  const completionEnabled = canComplete && task.can_complete && taskIsOpen;
  const contributionFlow = task.completion_action === 'CONTRIBUTION_READY';
  const contributionIsReady = contributionFlow && task.current_contribution_status === 'ready';
  const interactionBusy = busy || evidenceBusy;
  // The task projection is the UX authority for this specific record. The
  // capability is still enforced by the kiosk backend when the upload is
  // requested, but it must not make an optional evidence section actionless.
  // The assignment fallback keeps sessions created before this field existed
  // usable while their child session is renewed by the workspace.
  const taskAllowsEvidence = task.can_add_evidence ?? task.is_assigned_to_current_user;
  const canAddEvidence = taskAllowsEvidence && taskIsOpen && task.attachments < taskKioskMaxEvidenceFiles;
  const location = [task.unit_name, task.business_name].filter(Boolean).join(' · ');
  const processPosition = task.process_step && task.process_total_steps
    ? agendaCopy.detailUi.step(task.process_step, task.process_total_steps)
    : task.process_stage ? agendaCopy.detailUi.stage(task.process_stage) : null;
  const closeButton = (
    <Button
      type="button"
      variant="outline"
      className="h-12 rounded-xl border-[#5F4003]/20 bg-white/90 px-4 text-sm font-medium text-[#5F4003] hover:bg-white"
      disabled={interactionBusy}
      onClick={onClose}
    >
      {copy.workspace.close}
    </Button>
  );

  return (
    <KioskModalFrame
      busy={interactionBusy}
      closeLabel={copy.selectedTask.closeModal}
      description={`${taskTypeLabel(task, copy)} · ${task.folio}`}
      eyebrow={copy.selectedTask.eyebrow}
      footer={completionEnabled ? (
        <Button
          type="button"
          className="h-12 rounded-xl bg-white px-5 text-sm font-medium text-[#7A5204] hover:bg-white/90"
          disabled={interactionBusy || requiredEvidenceMissing}
          onClick={() => void onComplete()}
        >
          {busy ? <LoaderCircle aria-hidden="true" className="mr-2 h-5 w-5 animate-spin" /> : <ClipboardCheck aria-hidden="true" className="mr-2 h-5 w-5" />}
          {contributionFlow ? copy.selectedTask.markContributionReady : copy.selectedTask.complete}
        </Button>
      ) : closeButton}
      footerLeading={completionEnabled ? closeButton : undefined}
      footerSummary={task.evidence_required ? agendaCopy.detailUi.evidenceRequired : agendaCopy.detailUi.evidenceOptional}
      icon={<ClipboardCheck className="h-5 w-5" />}
      onOpenChange={(open) => {
        if (!open && !interactionBusy) onClose();
      }}
      open
      size="form"
      surface="public"
      title={task.title}
      tone="yellow"
    >
      <div aria-busy={interactionBusy || undefined} className="space-y-4">
        {errorMessage ? (
          <KioskWorkspaceNotice kind="error">{errorMessage}</KioskWorkspaceNotice>
        ) : null}

        <section aria-labelledby="task-instructions-heading" className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950">
          <h3 id="task-instructions-heading" className="text-[11px] font-medium text-[#9A6B05] dark:text-[#FDE68A]">{agendaCopy.detailUi.instructions}</h3>
          <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-700 dark:text-slate-300">{task.description || agendaCopy.detailUi.noInstructions}</p>
        </section>

        {task.process_id ? (
          <section aria-labelledby="task-process-heading" className="rounded-2xl border border-amber-200 bg-amber-50/55 p-4 dark:border-amber-900/60 dark:bg-amber-950/20">
            <div className="flex items-start gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#F4C84A]/30 text-[#7A5204] dark:text-[#FDE68A]"><FolderKanban aria-hidden="true" className="h-5 w-5" /></span>
              <div className="min-w-0">
                <h3 id="task-process-heading" className="text-[11px] font-medium text-amber-700 dark:text-amber-200">{agendaCopy.detailUi.processContext}</h3>
                <p className="mt-1 font-medium text-slate-950 dark:text-white">{task.process_title || taskTypeLabel(task, copy)}</p>
                <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">{task.process_reference || task.process_run_folio || task.folio}</p>
                {processPosition ? <span className="mt-2 inline-flex rounded-lg bg-white/80 px-2 py-1 text-[10px] font-medium text-amber-800 dark:bg-slate-950/70 dark:text-amber-200">{processPosition}</span> : null}
              </div>
            </div>
          </section>
        ) : null}

        <section aria-labelledby="task-planning-heading" className="space-y-2">
          <div className="flex items-center justify-between gap-3 px-1">
            <h3 id="task-planning-heading" className="text-[11px] font-medium text-slate-500 dark:text-slate-400">{agendaCopy.scheduleUi.label}</h3>
            {canReschedule && task.can_reschedule ? (
              <Button type="button" variant="ghost" className="h-9 rounded-lg px-2 text-xs text-[#7A5204] dark:text-[#FDE68A]" disabled={interactionBusy} onClick={() => onOpenSchedule(task)}>
                <CalendarClock aria-hidden="true" className="h-4 w-4" />{agendaCopy.scheduleUi.edit}
              </Button>
            ) : null}
          </div>
          <div className="grid grid-cols-1 gap-2 text-xs text-slate-600 dark:text-slate-300 sm:grid-cols-2">
            <span className="flex min-w-0 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 dark:border-slate-800 dark:bg-slate-950">
              <Clock3 aria-hidden="true" className="h-4 w-4 shrink-0 text-[#9A6B05]" /><span>{scheduleLabel(task, locale, agendaCopy.unscheduled)}</span>
            </span>
            <span className="flex min-w-0 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 dark:border-slate-800 dark:bg-slate-950">
              <CalendarDays aria-hidden="true" className="h-4 w-4 shrink-0 text-[#9A6B05]" /><span>{copy.task.due}: {formatTaskDate(task.due_date, locale, copy.errors.noDate)}</span>
            </span>
          </div>
        </section>

        <section aria-labelledby="task-participation-heading" className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-950">
          <h3 id="task-participation-heading" className="px-1 text-[11px] font-medium text-slate-500 dark:text-slate-400">{agendaCopy.detailUi.participation}</h3>
          <div className="mt-3 flex items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#F4C84A]/25 text-[#7A5204] dark:text-[#FDE68A]"><UserRound aria-hidden="true" className="h-5 w-5" /></span>
            <div className="min-w-0 flex-1">
              <p className="text-[11px] text-slate-500 dark:text-slate-400">{copy.task.responsible}</p>
              <p className="truncate text-sm font-medium text-slate-950 dark:text-white">{task.assigned_name || copy.identity.fallbackStatus}</p>
              {location ? <p className="mt-1 flex items-center gap-1 text-[11px] text-slate-500 dark:text-slate-400"><MapPin aria-hidden="true" className="h-3.5 w-3.5" /><span className="truncate">{location}</span></p> : null}
            </div>
          </div>
        </section>

        <section aria-labelledby="task-evidence-heading" className={`rounded-2xl border p-4 shadow-sm ${requiredEvidenceMissing ? 'border-amber-300 bg-amber-50/60 dark:border-amber-800 dark:bg-amber-950/20' : 'border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950'}`}>
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#F4C84A]/25 text-[#7A5204] dark:text-[#FDE68A]"><Paperclip aria-hidden="true" className="h-5 w-5" /></span>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 id="task-evidence-heading" className="font-medium text-slate-950 dark:text-white">{task.evidence_required ? agendaCopy.detailUi.evidenceRequired : agendaCopy.detailUi.evidenceOptional}</h3>
                <span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">{task.attachments}/5</span>
              </div>
              <p className={`mt-1 text-xs leading-5 ${requiredEvidenceMissing ? 'text-amber-800 dark:text-amber-200' : 'text-slate-500 dark:text-slate-400'}`}>
                {task.evidence_required
                  ? evidenceSatisfied ? agendaCopy.detailUi.evidenceReady : agendaCopy.detailUi.evidenceMissing
                  : agendaCopy.detailUi.fileLimit}
              </p>
            </div>
          </div>
          {canAddEvidence ? (
            <KioskFileDropzone
              accept={evidenceAccept}
              className="mt-3"
              description={task.evidence_required ? agendaCopy.detailUi.fileLimit : undefined}
              disabled={interactionBusy}
              icon={evidenceBusy ? <LoaderCircle aria-hidden="true" className="h-5 w-5 animate-spin" /> : <FileUp aria-hidden="true" className="h-5 w-5" />}
              multiple
              onChange={(event) => {
                const files = taskKioskFilesFromInput(event.currentTarget.files);
                event.currentTarget.value = '';
                if (files.length) onEvidenceFiles(task, files);
              }}
              title={evidenceBusy ? agendaCopy.detailUi.uploading : agendaCopy.detailUi.upload}
              tone="yellow"
            />
          ) : null}
          {task.evidence_required && requiredEvidenceMissing ? (
            <KioskWorkspaceFieldStatus className="mt-3" kind="warning">{agendaCopy.detailUi.evidenceMissing}</KioskWorkspaceFieldStatus>
          ) : null}
        </section>

        {completionEnabled ? (
          <section className="space-y-4 rounded-2xl border border-[#F4C84A]/35 bg-white p-4 shadow-sm dark:border-[#F4C84A]/20 dark:bg-slate-950">
            {contributionFlow ? (
              <KioskWorkspaceFieldStatus>{copy.selectedTask.contributionDescription}</KioskWorkspaceFieldStatus>
            ) : (
              <ProgressSlider disabled={interactionBusy} label={copy.selectedTask.completion} onChange={onCompletionPercentChange} value={completionPercent} />
            )}
            <label className="block">
              <span className="text-sm font-medium text-slate-700 dark:text-slate-200">{contributionFlow ? copy.selectedTask.contributionNotes : copy.selectedTask.notes}</span>
              <Textarea
                className="mt-2 min-h-24 rounded-xl"
                disabled={interactionBusy}
                placeholder={contributionFlow ? copy.selectedTask.contributionNotesPlaceholder : copy.selectedTask.notesPlaceholder}
                value={completionNotes}
                onChange={(event) => onCompletionNotesChange(event.target.value)}
              />
            </label>
          </section>
        ) : (
          <KioskWorkspaceFieldStatus kind="success">
            {task.status === 'completed' ? copy.task.resolved : contributionIsReady ? copy.selectedTask.contributionReadyStatus : copy.identity.fallbackStatus}
          </KioskWorkspaceFieldStatus>
        )}
      </div>
    </KioskModalFrame>
  );
}
