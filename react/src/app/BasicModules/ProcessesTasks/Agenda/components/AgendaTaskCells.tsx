import type { ReactNode } from 'react';
import { CheckCircle2, FolderOpen, UsersRound } from 'lucide-react';
import { Badge } from '../../../../components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../../../components/ui/select';
import { cn } from '../../../../components/ui/utils';
import type { TaskPriority, TaskStatus } from '../../Tasks/tasksApi';
import { tableSelectTriggerClass } from './AgendaTablePrimitives';
import type { AgendaTaskCellProps } from './AgendaTaskCellTypes';
import { AuditNotesCell, NotesCell, WeightingCell } from './AgendaTaskAuditCells';
import { BusinessCell, ProjectCell, ResponsibleCell, UnitCell } from './AgendaTaskScopeCells';
import { getTaskScheduleHour } from '../utils/agendaScheduleUtils';
import { clampPercent, getTaskDisplayStatus } from '../utils/agendaTaskStatus';
import { formatDate } from '../utils/agendaReports';

export { AgendaTaskActions } from './AgendaTaskActions';

export function AgendaTaskCell({
  auditStatusClasses,
  agendaStatusDate,
  agendaStatusRange,
  businessOptionsForUnit,
  collaboratorOptionsForScope,
  columnId,
  copy,
  isPending,
  noBusinessValue,
  noProjectValue,
  noUnitValue,
  onAuditTask,
  onBusinessChange,
  onEditTask,
  onOpenAttachments,
  onOpenFollowUps,
  onOpenTeam,
  onPersistTaskChange,
  onRequestCancel,
  onRequestComplete,
  onPriorityChange,
  onProjectChange,
  onResponsibleChange,
  onUnitChange,
  projects,
  scopedCatalogUnits,
  task,
  todayAgendaValue,
  unassignedResponsibleValue,
}: AgendaTaskCellProps) {
  const scopeCellProps = {
    businessOptionsForUnit,
    collaboratorOptionsForScope,
    copy,
    isPending,
    noBusinessValue,
    noProjectValue,
    noUnitValue,
    onBusinessChange,
    onProjectChange,
    onResponsibleChange,
    onUnitChange,
    projects,
    scopedCatalogUnits,
    task,
    unassignedResponsibleValue,
  };
  const auditCellProps = {
    auditStatusClasses,
    copy,
    isPending,
    onAuditTask,
    onEditTask,
    onOpenFollowUps,
    task,
  };

  switch (columnId) {
    case 'folio':
      return <div className="w-full whitespace-normal break-words text-sm font-medium text-slate-900 [overflow-wrap:anywhere] dark:text-white">{task.folio}</div>;
    case 'type':
      return (
        <Badge variant="outline" className="w-full rounded-full border-slate-200 bg-slate-50 px-3 py-1 text-center font-medium text-slate-700 dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-200">
          {copy.taskTypes[task.taskType]}
        </Badge>
      );
    case 'unit':
      return <UnitCell {...scopeCellProps} />;
    case 'business':
      return <BusinessCell {...scopeCellProps} />;
    case 'title':
      return <ReadonlyValue>{task.title || copy.common.noRecord}</ReadonlyValue>;
    case 'description':
      return <ReadonlyValue muted={!task.description}>{task.description || copy.common.noDescription}</ReadonlyValue>;
    case 'createdAt':
      return (
        <div className="w-full whitespace-normal break-words text-sm font-medium text-slate-900 [overflow-wrap:anywhere] dark:text-white">
          {task.createdAt ? formatDate(task.createdAt, true) : copy.common.noDate}
        </div>
      );
    case 'startDate':
      return <ReadonlyValue muted={!task.startDate}>{task.startDate ? formatDate(task.startDate) : copy.common.noDate}</ReadonlyValue>;
    case 'dueDate': {
      const scheduleHour = getTaskScheduleHour(task, todayAgendaValue);

      return (
        <ReadonlyValue muted={!task.dueDate && !scheduleHour}>
          <span className="inline-flex flex-wrap items-center gap-x-2 gap-y-1">
            <span>{task.dueDate ? formatDate(task.dueDate) : copy.common.noDate}</span>
            {scheduleHour ? (
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                {scheduleHour}
              </span>
            ) : null}
          </span>
        </ReadonlyValue>
      );
    }
    case 'predecessor':
      return (
        <ReadonlyValue muted={!task.predecessorTaskFolio && !task.predecessorTaskTitle}>
          {task.predecessorTaskFolio
            ? `${task.predecessorTaskFolio}${task.predecessorTaskTitle ? ` - ${task.predecessorTaskTitle}` : ''}`
            : copy.common.noRecord}
        </ReadonlyValue>
      );
    case 'agendaTime':
      return (
        <ReadonlyValue muted={!getTaskScheduleHour(task, todayAgendaValue)}>
          {getTaskScheduleHour(task, todayAgendaValue) ?? copy.schedule.noHourLabel}
        </ReadonlyValue>
      );
    case 'status': {
      const displayStatus = getTaskDisplayStatus(task, agendaStatusDate, agendaStatusRange);

      return (
        <Select
          value={task.status}
          disabled={isPending}
          onValueChange={(value) => {
            const nextStatus = value as TaskStatus;
            if (nextStatus === 'completed') {
              onRequestComplete(task);
              return;
            }
            if (nextStatus === 'cancelled') {
              onRequestCancel(task);
              return;
            }
            void onPersistTaskChange(task, {
              status: nextStatus,
              completionPercent: task.completionPercent,
              audited: false,
              auditNotes: null,
              weighting: null,
            });
          }}
        >
          <SelectTrigger
            title={displayStatus === 'overdue' ? copy.messages.overdueDragBlocked : undefined}
            className={cn(
              tableSelectTriggerClass,
              'w-full',
              displayStatus === 'overdue' &&
                'border-red-200 bg-red-50 text-red-700 dark:border-red-900/60 dark:bg-red-950/60 dark:text-red-300',
            )}
          >
            <span className="truncate">{copy.statuses[displayStatus]}</span>
          </SelectTrigger>
          <SelectContent>
            {(['pending', 'in_progress', 'paused', 'completed', 'cancelled'] as TaskStatus[]).map((value) => (
              <SelectItem key={value} value={value}>
                {copy.statuses[value]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      );
    }
    case 'creator':
      return (
        <div className="w-full space-y-1 whitespace-normal break-words text-sm text-slate-700 [overflow-wrap:anywhere] dark:text-slate-200">
          <p className="font-medium text-slate-900 dark:text-white">
            {task.createdByName ?? task.creator ?? copy.common.noRecord}
          </p>
          {task.createdBy ? <p className="text-xs text-slate-500 dark:text-slate-400">Usuario #{task.createdBy}</p> : null}
        </div>
      );
    case 'responsible':
      return task.teamSize > 1 ? (
        <button
          type="button"
          disabled={isPending}
          onClick={() => onOpenTeam(task)}
          className="flex w-full min-w-0 items-center gap-3 rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-left text-blue-900 transition-colors hover:bg-blue-100 disabled:opacity-60 dark:border-blue-900/60 dark:bg-blue-950/40 dark:text-blue-100"
        >
          <UsersRound className="h-4 w-4 shrink-0" />
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-medium">{task.assignedName || `${task.teamSize} personas`}</span>
            <span className="flex items-center gap-1 text-xs text-blue-600 dark:text-blue-300">
              {task.teamAllReady ? <CheckCircle2 className="h-3 w-3" /> : null}
              {task.teamReadyCount}/{task.teamSize} partes listas
            </span>
          </span>
        </button>
      ) : <ResponsibleCell {...scopeCellProps} />;
    case 'priority':
      return (
        <PriorityCell
          copy={copy}
          isPending={isPending}
          onPriorityChange={onPriorityChange}
          task={task}
        />
      );
    case 'attachments':
      return (
        <button
          type="button"
          title={copy.actions.files}
          disabled={isPending}
          onClick={() => onOpenAttachments(task)}
          className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-[#F4C84A]/35 bg-[#F4C84A]/10 px-3 py-2 text-sm font-medium text-[#9A6B05] transition-colors hover:border-[#F4C84A] hover:bg-[#F4C84A] hover:text-slate-950 disabled:cursor-not-allowed disabled:opacity-60 dark:border-[#F4C84A]/40 dark:bg-[#F4C84A]/15 dark:text-[#FEF3C7] dark:hover:bg-[#F4C84A] dark:hover:text-slate-950"
        >
          <FolderOpen className="h-4 w-4" />
          {task.attachments}
        </button>
      );
    case 'project':
      return <ProjectCell {...scopeCellProps} />;
    case 'completion':
      return <ReadonlyValue>{clampPercent(task.completionPercent)}%</ReadonlyValue>;
    case 'notes':
      return <NotesCell {...auditCellProps} />;
    case 'weighting':
      return <WeightingCell {...auditCellProps} />;
    case 'auditNotes':
      return <AuditNotesCell {...auditCellProps} />;
  }
}

function PriorityCell({
  copy,
  isPending,
  onPriorityChange,
  task,
}: Pick<AgendaTaskCellProps, 'copy' | 'isPending' | 'onPriorityChange' | 'task'>) {
  return (
    <Select value={task.priority} disabled={isPending} onValueChange={(value) => onPriorityChange(task, value)}>
      <SelectTrigger className={cn(tableSelectTriggerClass, 'w-full')}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {(['low', 'medium', 'high'] as TaskPriority[]).map((priority) => (
          <SelectItem key={priority} value={priority}>
            {copy.priorities[priority]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function ReadonlyValue({ children, muted = false }: { children: ReactNode; muted?: boolean }) {
  return (
    <div
      className={cn(
        'w-full whitespace-normal rounded-xl border border-transparent px-3 py-2 text-sm font-medium leading-5 break-words [overflow-wrap:anywhere]',
        muted ? 'text-slate-400 dark:text-slate-500' : 'text-slate-800 dark:text-slate-100',
      )}
    >
      {children}
    </div>
  );
}
