import { FolderOpen } from 'lucide-react';
import { Badge } from '../../../../components/ui/badge';
import { Input } from '../../../../components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../../../components/ui/select';
import { cn } from '../../../../components/ui/utils';
import type { TaskPriority, TaskStatus } from '../../Tasks/tasksApi';
import { ProgressSlider } from '../../shared/ProgressSlider';
import {
  InlineTextArea,
  InlineTextInput,
  tableInputClass,
  tableSelectTriggerClass,
} from './AgendaTablePrimitives';
import type { AgendaTaskCellProps } from './AgendaTaskCellTypes';
import { AuditNotesCell, NotesCell, WeightingCell } from './AgendaTaskAuditCells';
import { BusinessCell, ProjectCell, ResponsibleCell, UnitCell } from './AgendaTaskScopeCells';
import { normalizeScheduleHourInput } from '../utils/agendaDateUtils';
import { getTaskScheduleDateKey, getTaskScheduleHour } from '../utils/agendaScheduleUtils';
import { clampPercent, getTaskDisplayStatus } from '../utils/agendaTaskStatus';
import { formatDate } from '../utils/agendaReports';

export { AgendaTaskActions } from './AgendaTaskActions';

export function AgendaTaskCell({
  auditStatusClasses,
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
  onPersistTaskChange,
  onProjectChange,
  onResponsibleChange,
  onUnitChange,
  onUpdateSchedulePlacement,
  projects,
  scopedCatalogUnits,
  selectedScheduleDate,
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
    task,
  };

  switch (columnId) {
    case 'folio':
      return <div className="w-full text-sm font-semibold text-slate-900 dark:text-white">{task.folio}</div>;
    case 'type':
      return (
        <Badge variant="outline" className="w-full rounded-full border-slate-200 bg-slate-50 px-3 py-1 text-center font-semibold text-slate-700 dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-200">
          {copy.taskTypes[task.taskType]}
        </Badge>
      );
    case 'unit':
      return <UnitCell {...scopeCellProps} />;
    case 'business':
      return <BusinessCell {...scopeCellProps} />;
    case 'title':
      return (
        <InlineTextInput
          value={task.title}
          placeholder={copy.report.fields.title}
          disabled={isPending}
          className="w-full"
          onCommit={(title) => onPersistTaskChange(task, { title })}
        />
      );
    case 'description':
      return (
        <InlineTextArea
          value={task.description}
          placeholder={copy.common.noDescription}
          disabled={isPending}
          className="w-full"
          onCommit={(description) => onPersistTaskChange(task, { description: description || null })}
        />
      );
    case 'createdAt':
      return (
        <div className="w-full text-sm font-medium text-slate-900 dark:text-white">
          {task.createdAt ? formatDate(task.createdAt, true) : copy.common.noDate}
        </div>
      );
    case 'startDate':
      return (
        <Input
          type="date"
          value={task.startDate ?? ''}
          disabled={isPending}
          className={cn(tableInputClass, 'w-full')}
          onChange={(event) => void onPersistTaskChange(task, { startDate: event.target.value || null })}
        />
      );
    case 'dueDate':
      return (
        <Input
          type="date"
          value={task.dueDate ?? ''}
          disabled={isPending}
          className={cn(tableInputClass, 'w-full')}
          onChange={(event) => void onPersistTaskChange(task, { dueDate: event.target.value || null })}
        />
      );
    case 'agendaTime':
      return (
        <Input
          type="time"
          step={3600}
          value={getTaskScheduleHour(task, todayAgendaValue) ?? ''}
          disabled={isPending}
          className={cn(tableInputClass, 'w-full')}
          onChange={(event) =>
            onUpdateSchedulePlacement(
              task.taskId,
              getTaskScheduleDateKey(task, todayAgendaValue) ?? selectedScheduleDate,
              normalizeScheduleHourInput(event.target.value),
            )
          }
        />
      );
    case 'status': {
      const displayStatus = getTaskDisplayStatus(task);

      return (
        <Select
          value={displayStatus}
          disabled={isPending}
          onValueChange={(value) => {
            if (value === 'overdue' || value === 'audited') {
              return;
            }

            const nextStatus = value as TaskStatus;
            void onPersistTaskChange(task, {
              status: nextStatus,
              completionPercent: nextStatus === 'completed' ? 100 : task.completionPercent,
              ...(nextStatus === 'completed'
                ? {}
                : {
                    audited: false,
                    auditNotes: null,
                    weighting: null,
                  }),
            });
          }}
        >
          <SelectTrigger
            className={cn(
              tableSelectTriggerClass,
              'w-full',
              displayStatus === 'overdue' &&
                'border-red-200 bg-red-50 text-red-700 dark:border-red-900/60 dark:bg-red-950/60 dark:text-red-300',
            )}
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {displayStatus === 'overdue' ? (
              <SelectItem value="overdue" disabled>
                {copy.statuses.overdue}
              </SelectItem>
            ) : null}
            {displayStatus === 'audited' ? (
              <SelectItem value="audited" disabled>
                {copy.statuses.audited}
              </SelectItem>
            ) : null}
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
        <div className="w-full space-y-1 text-sm text-slate-700 dark:text-slate-200">
          <p className="font-medium text-slate-900 dark:text-white">
            {task.createdByName ?? task.creator ?? copy.common.noRecord}
          </p>
          {task.createdBy ? <p className="text-xs text-slate-500 dark:text-slate-400">Usuario #{task.createdBy}</p> : null}
        </div>
      );
    case 'responsible':
      return <ResponsibleCell {...scopeCellProps} />;
    case 'priority':
      return (
        <Select
          value={task.priority}
          disabled={isPending}
          onValueChange={(value) => void onPersistTaskChange(task, { priority: value as TaskPriority })}
        >
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
    case 'attachments':
      return (
        <button
          type="button"
          title={copy.actions.files}
          disabled={isPending}
          onClick={() => onOpenAttachments(task)}
          className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-[#F4C84A]/35 bg-[#F4C84A]/10 px-3 py-2 text-sm font-semibold text-[#9A6B05] transition-colors hover:border-[#F4C84A] hover:bg-[#F4C84A] hover:text-slate-950 disabled:cursor-not-allowed disabled:opacity-60 dark:border-[#F4C84A]/40 dark:bg-[#F4C84A]/15 dark:text-[#FEF3C7] dark:hover:bg-[#F4C84A] dark:hover:text-slate-950"
        >
          <FolderOpen className="h-4 w-4" />
          {task.attachments}
        </button>
      );
    case 'project':
      return <ProjectCell {...scopeCellProps} />;
    case 'completion':
      return (
        <div className="w-full min-w-[170px]">
          <ProgressSlider
            value={clampPercent(task.completionPercent)}
            label={copy.form.labels.completion}
            disabled={isPending}
            onCommit={(completionPercent) => onPersistTaskChange(task, { completionPercent })}
          />
        </div>
      );
    case 'notes':
      return <NotesCell {...auditCellProps} />;
    case 'weighting':
      return <WeightingCell {...auditCellProps} />;
    case 'auditNotes':
      return <AuditNotesCell {...auditCellProps} />;
  }
}
