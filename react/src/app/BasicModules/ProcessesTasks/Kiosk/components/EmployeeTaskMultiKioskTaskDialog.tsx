import {
  CalendarDays,
  CheckCircle2,
  ClipboardCheck,
  LoaderCircle,
  UserRound,
} from 'lucide-react';
import { KioskModalFrame } from '../../../../components/kiosk-engine/KioskModalFrame';
import { Button } from '../../../../components/ui/button';
import { Textarea } from '../../../../components/ui/textarea';
import { ProgressSlider } from '../../shared/ProgressSlider';
import type { PublicTaskKioskTask } from '../processTaskKioskApi';
import type { TaskKioskLocale, TaskKioskTranslations } from '../translations';

const openTaskStatuses = new Set<PublicTaskKioskTask['status']>([
  'pending',
  'in_progress',
  'paused',
]);

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

interface EmployeeTaskMultiKioskTaskDialogProps {
  busy: boolean;
  canComplete: boolean;
  completionNotes: string;
  completionPercent: number;
  copy: TaskKioskTranslations;
  errorMessage: string;
  locale: TaskKioskLocale;
  onClose: () => void;
  onComplete: () => Promise<void>;
  onCompletionNotesChange: (value: string) => void;
  onCompletionPercentChange: (value: number) => void;
  task: PublicTaskKioskTask | null;
}

export function EmployeeTaskMultiKioskTaskDialog({
  busy,
  canComplete,
  completionNotes,
  completionPercent,
  copy,
  errorMessage,
  locale,
  onClose,
  onComplete,
  onCompletionNotesChange,
  onCompletionPercentChange,
  task,
}: EmployeeTaskMultiKioskTaskDialogProps) {
  if (!task) return null;

  const taskIsOpen = openTaskStatuses.has(task.status);
  const completionEnabled = canComplete && task.can_complete && taskIsOpen;
  const contributionFlow = task.completion_action === 'CONTRIBUTION_READY';
  const contributionIsReady = contributionFlow && task.current_contribution_status === 'ready';
  const closeButton = (
    <Button
      type="button"
      variant="outline"
      className="h-12 rounded-xl border-[#5F4003]/20 bg-white/90 px-4 text-sm font-medium text-[#5F4003] hover:bg-white"
      disabled={busy}
      onClick={onClose}
    >
      {copy.workspace.close}
    </Button>
  );

  return (
    <KioskModalFrame
      busy={busy}
      closeLabel={copy.selectedTask.closeModal}
      description={`${taskTypeLabel(task, copy)}. ${task.folio}`}
      eyebrow={copy.selectedTask.eyebrow}
      footer={completionEnabled ? (
        <Button
          type="button"
          className="h-12 rounded-xl bg-white px-5 text-sm font-medium text-[#7A5204] hover:bg-white/90"
          disabled={busy}
          onClick={() => void onComplete()}
        >
          {busy ? <LoaderCircle aria-hidden="true" className="mr-2 h-5 w-5 animate-spin" /> : <ClipboardCheck aria-hidden="true" className="mr-2 h-5 w-5" />}
          {contributionFlow
            ? copy.selectedTask.markContributionReady
            : copy.selectedTask.complete}
        </Button>
      ) : closeButton}
      footerLeading={completionEnabled ? closeButton : undefined}
      icon={<ClipboardCheck className="h-5 w-5" />}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      open
      size="form"
      surface="public"
      title={task.title}
      tone="yellow"
    >
      <div className="space-y-4">
        {errorMessage ? (
          <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm leading-5 text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-200">
            {errorMessage}
          </p>
        ) : null}

        <section aria-label={copy.workspace.taskDetails} className="space-y-3">
          {task.description ? (
            <p className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm leading-6 text-slate-700 shadow-sm dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300">
              {task.description}
            </p>
          ) : null}

          <div className="grid grid-cols-1 gap-2 text-xs text-slate-600 dark:text-slate-300 sm:grid-cols-2">
            <span className="flex min-w-0 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 dark:border-slate-800 dark:bg-slate-950">
              <CalendarDays aria-hidden="true" className="h-4 w-4 shrink-0 text-[#9A6B05]" />
              <span>{copy.task.start}: {formatTaskDate(task.start_date, locale, copy.errors.noDate)}</span>
            </span>
            <span className="flex min-w-0 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 dark:border-slate-800 dark:bg-slate-950">
              <CalendarDays aria-hidden="true" className="h-4 w-4 shrink-0 text-[#9A6B05]" />
              <span>{copy.task.due}: {formatTaskDate(task.due_date, locale, copy.errors.noDate)}</span>
            </span>
          </div>

          <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-950">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#F4C84A]/25 text-[#7A5204] dark:text-[#FDE68A]">
              <UserRound aria-hidden="true" className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">{copy.task.responsible}</p>
              <p className="mt-0.5 truncate text-sm font-medium text-slate-950 dark:text-white">
                {task.assigned_name || copy.identity.fallbackStatus}
              </p>
            </div>
          </div>
        </section>

        {completionEnabled ? (
          <section className="space-y-4 rounded-2xl border border-[#F4C84A]/35 bg-white p-4 shadow-sm dark:border-[#F4C84A]/20 dark:bg-slate-950">
            {contributionFlow ? (
              <p className="rounded-xl border border-blue-200 bg-blue-50 px-3 py-2.5 text-sm leading-5 text-blue-800 dark:border-blue-900/60 dark:bg-blue-950/40 dark:text-blue-200">
                {copy.selectedTask.contributionDescription}
              </p>
            ) : (
              <ProgressSlider
                disabled={busy}
                label={copy.selectedTask.completion}
                onChange={onCompletionPercentChange}
                value={completionPercent}
              />
            )}
            <label className="block">
              <span className="text-sm font-medium text-slate-700 dark:text-slate-200">
                {contributionFlow ? copy.selectedTask.contributionNotes : copy.selectedTask.notes}
              </span>
              <Textarea
                className="mt-2 min-h-24 rounded-xl"
                disabled={busy}
                placeholder={contributionFlow
                  ? copy.selectedTask.contributionNotesPlaceholder
                  : copy.selectedTask.notesPlaceholder}
                value={completionNotes}
                onChange={(event) => onCompletionNotesChange(event.target.value)}
              />
            </label>
          </section>
        ) : (
          <p className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-200">
            <CheckCircle2 aria-hidden="true" className="h-5 w-5" />
            {task.status === 'completed'
              ? copy.task.resolved
              : contributionIsReady
                ? copy.selectedTask.contributionReadyStatus
                : copy.identity.fallbackStatus}
          </p>
        )}
      </div>
    </KioskModalFrame>
  );
}
