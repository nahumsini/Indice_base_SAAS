import { Clock3, ListChecks } from 'lucide-react';
import type { EmployeeTaskAgendaCopy } from '../employeeTaskAgendaTranslations';
import type { TaskKioskLocale, TaskKioskTranslations } from '../translations';
import type { PublicTaskKioskTask } from '../processTaskKioskApi';
import { PublicTaskKioskEmptyState, PublicTaskKioskTaskCard } from './PublicTaskKioskWorkspaceSections';
import { employeeTaskTypeLabel, formatEmployeeTaskDate } from '../employeeTaskMultiKioskWorkspaceUtils';
import { localEmployeeTaskDate } from '../hooks/useEmployeeTaskMultiKioskWorkspace';

function taskTime(task: PublicTaskKioskTask) {
  return task.agenda_start_time?.slice(0, 5) ?? '';
}

function scheduleLabel(task: PublicTaskKioskTask) {
  const start = taskTime(task);
  const end = task.agenda_end_time?.slice(0, 5);
  if (!start) return undefined;
  return end ? `${start}–${end}` : start;
}

function currentTime() {
  const now = new Date();
  return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
}

export function EmployeeTaskScheduleView({
  canReschedule,
  copy,
  locale,
  onOpen,
  onSchedule,
  referenceDate,
  taskCopy,
  tasks,
}: {
  canReschedule: boolean;
  copy: EmployeeTaskAgendaCopy;
  locale: TaskKioskLocale;
  onOpen: (task: PublicTaskKioskTask) => void;
  onSchedule: (task: PublicTaskKioskTask) => void;
  referenceDate: string;
  taskCopy: TaskKioskTranslations;
  tasks: PublicTaskKioskTask[];
}) {
  const scheduled = tasks
    .filter(task => Boolean(taskTime(task)))
    .sort((left, right) => taskTime(left).localeCompare(taskTime(right)) || left.title.localeCompare(right.title));
  const unscheduled = tasks.filter(task => !taskTime(task));
  const isToday = referenceDate === localEmployeeTaskDate();

  if (!tasks.length) {
    return <PublicTaskKioskEmptyState icon={<ListChecks className="h-7 w-7" />} title={taskCopy.empty.filteredTitle} body={taskCopy.empty.filteredBody} />;
  }

  const renderTask = (task: PublicTaskKioskTask, time?: string) => (
    <div key={task.id} className="grid grid-cols-[4.25rem_minmax(0,1fr)] gap-2">
      <div className="relative flex justify-end pr-3">
        <div aria-hidden="true" className="absolute bottom-[-0.75rem] right-0 top-5 w-px bg-slate-200 dark:bg-slate-800" />
        <button
          type="button"
          disabled={!canReschedule || !task.can_reschedule}
          className="relative z-10 h-10 rounded-xl bg-white px-2 text-xs font-medium text-[#7A5204] shadow-sm ring-1 ring-slate-200 transition hover:ring-[#F4C84A] disabled:cursor-default disabled:text-slate-500 dark:bg-slate-950 dark:text-[#FDE68A] dark:ring-slate-800"
          aria-label={`${copy.scheduleUi.edit}: ${task.title}`}
          onClick={() => onSchedule(task)}
        >
          {time || copy.scheduleUi.noTime}
        </button>
      </div>
      <PublicTaskKioskTaskCard
        attachmentsLabel={taskCopy.workspace.attachments}
        copy={taskCopy}
        dueLabel={taskCopy.task.due}
        formattedDueDate={formatEmployeeTaskDate(task.due_date, locale, taskCopy.errors.noDate)}
        onOpen={() => onOpen(task)}
        scheduleLabel={scheduleLabel(task)}
        task={task}
        taskType={employeeTaskTypeLabel(task, taskCopy)}
        viewLabel={taskCopy.workspace.view}
      />
    </div>
  );

  return (
    <section className="space-y-4" data-task-kiosk-schedule>
      <header className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#F4C84A]/20 text-[#7A5204] dark:text-[#FDE68A]"><Clock3 aria-hidden="true" className="h-5 w-5" /></span>
        <div>
          <h3 className="font-medium text-slate-950 dark:text-white">{copy.scheduleUi.label}</h3>
          <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">{copy.scheduleUi.description}</p>
        </div>
      </header>

      {isToday ? (
        <div className="grid grid-cols-[4.25rem_minmax(0,1fr)] items-center gap-2" aria-label={`${copy.scheduleUi.currentTime} ${currentTime()}`}>
          <span className="pr-3 text-right text-[11px] font-medium text-rose-600">{currentTime()}</span>
          <span className="h-px bg-rose-400"><span className="sr-only">{copy.scheduleUi.currentTime}</span></span>
        </div>
      ) : null}

      <div className="space-y-3">{scheduled.map(task => renderTask(task, taskTime(task)))}</div>

      {unscheduled.length ? (
        <div className="space-y-3 pt-2">
          <div className="grid grid-cols-[4.25rem_minmax(0,1fr)] items-center gap-2">
            <span className="pr-3 text-right text-[10px] font-medium text-slate-400">{copy.unscheduled}</span>
            <span className="h-px border-t border-dashed border-slate-300 dark:border-slate-700" />
          </div>
          {unscheduled.map(task => renderTask(task))}
        </div>
      ) : null}
    </section>
  );
}
