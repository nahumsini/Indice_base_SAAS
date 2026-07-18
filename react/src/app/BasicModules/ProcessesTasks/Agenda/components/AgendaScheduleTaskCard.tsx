import { type DragEvent as ReactDragEvent } from 'react';
import { CheckCircle2, FolderOpen, GripVertical, Pencil, Trash2 } from 'lucide-react';
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
import type { TaskPayload, TaskStatus } from '../../Tasks/tasksApi';
import type { AgendaTaskItem } from '../agendaApi';
import type { AgendaSchedulePlacement, DisplayTaskStatus } from '../types';
import type { AgendaTranslations } from '../translations';
import { TableActionButton } from './AgendaTablePrimitives';
import { normalizeScheduleHourInput } from '../utils/agendaDateUtils';
import { clampPercent, getTaskDisplayStatus } from '../utils/agendaTaskStatus';
import { formatDate } from '../utils/agendaReports';

export type AgendaScheduleTaskCardOptions = {
  compact?: boolean;
  dateKey?: string;
  sidebar?: boolean;
};

type AgendaScheduleTaskCardProps = {
  copy: AgendaTranslations;
  displayStatusClasses: Record<DisplayTaskStatus, string>;
  isPending: boolean;
  onCancelTask: (task: AgendaTaskItem) => void;
  onCloseTask: (task: AgendaTaskItem) => void;
  onDeleteTask: (task: AgendaTaskItem) => void;
  onEditTask: (task: AgendaTaskItem) => void;
  onOpenAttachments: (task: AgendaTaskItem) => void;
  onPersistTaskChange: (task: AgendaTaskItem, patch: Partial<TaskPayload>) => void | Promise<void>;
  onScheduleDragEnd: () => void;
  onScheduleTaskDragStart: (event: ReactDragEvent<HTMLElement>, taskId: number) => void;
  onUpdateTaskSchedulePlacement: (taskId: number, dateKey: string, hour: string | null) => void;
  options?: AgendaScheduleTaskCardOptions;
  schedule: AgendaSchedulePlacement;
  scheduleDraggingTaskId: number | null;
  selectedScheduleDate: string;
  task: AgendaTaskItem;
};

export function AgendaScheduleTaskCard({
  copy,
  displayStatusClasses,
  isPending,
  onCancelTask,
  onCloseTask,
  onDeleteTask,
  onEditTask,
  onOpenAttachments,
  onPersistTaskChange,
  onScheduleDragEnd,
  onScheduleTaskDragStart,
  onUpdateTaskSchedulePlacement,
  options = {},
  schedule,
  scheduleDraggingTaskId,
  selectedScheduleDate,
  task,
}: AgendaScheduleTaskCardProps) {
  const scheduleCopy = copy.schedule;
  const displayStatus = getTaskDisplayStatus(task, options.dateKey ?? selectedScheduleDate);
  const dueLabel = schedule.date
    ? formatDate(schedule.date)
    : task.dueDate
      ? formatDate(task.dueDate)
      : copy.common.noDate;
  const isSidebarCard = Boolean(options.sidebar);

  return (
    <article
      draggable
      onDragStart={(event) => onScheduleTaskDragStart(event, task.taskId)}
      onDragEnd={onScheduleDragEnd}
      className={cn(
        'select-none rounded-xl border bg-white shadow-sm transition hover:border-[#F4C84A]/60 hover:shadow-md active:cursor-grabbing dark:bg-slate-800',
        isPending ? 'cursor-wait opacity-70' : 'cursor-grab',
        scheduleDraggingTaskId === task.taskId && 'opacity-50',
        isSidebarCard
          ? 'space-y-3 border-[#F4C84A]/45 bg-[#FFFDF5] p-4 shadow-md shadow-[#F4C84A]/10 dark:border-[#F4C84A]/35 dark:bg-slate-800'
          : 'space-y-3 border-slate-200 p-3 dark:border-slate-700',
        options.compact && !isSidebarCard ? 'space-y-2' : '',
      )}
    >
      <div
        className={cn(
          'flex gap-3',
          options.compact || isSidebarCard ? 'flex-col' : 'flex-col xl:flex-row xl:items-start xl:justify-between',
        )}
      >
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={cn(
                'inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-slate-500 dark:text-slate-300',
                isSidebarCard
                  ? 'border-[#F4C84A]/40 bg-[#F4C84A]/15 text-[#9A6B05]'
                  : 'border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-900',
                options.compact && !isSidebarCard ? 'hidden' : '',
              )}
            >
              <GripVertical className="h-4 w-4" />
            </span>
            <h4
              className={cn(
                'min-w-0 font-bold leading-5 text-slate-900 dark:text-white',
                options.compact && !isSidebarCard ? 'line-clamp-2 text-xs' : 'line-clamp-2 text-sm',
                isSidebarCard && 'w-full min-w-full break-words text-base leading-6',
              )}
            >
              {task.title}
            </h4>
            {options.compact && !isSidebarCard ? null : (
              <Badge
                variant="outline"
                className={cn('rounded-full px-2.5 py-1 text-xs font-semibold', displayStatusClasses[displayStatus])}
              >
                {copy.statuses[displayStatus]}
              </Badge>
            )}
            {isSidebarCard ? (
              <Badge
                variant="outline"
                className="rounded-full border-[#F4C84A]/40 bg-[#F4C84A]/10 px-2.5 py-1 text-xs font-bold text-[#9A6B05]"
              >
                {scheduleCopy.noHourLabel}
              </Badge>
            ) : null}
          </div>
          <p className="mt-1 line-clamp-1 text-xs text-slate-500 dark:text-slate-400">
            {task.assignedName ?? copy.common.unassigned}
          </p>
          <p className="mt-1 line-clamp-1 text-xs font-semibold text-slate-500 dark:text-slate-400">
            {task.projectName ?? task.businessName ?? task.unitName ?? copy.common.noRecord}
          </p>
        </div>

        {!options.compact && !isSidebarCard ? (
          <div className="grid shrink-0 gap-2 sm:grid-cols-2 xl:w-[260px]">
            <Input
              type="date"
              value={schedule.date}
              onChange={(event) =>
                onUpdateTaskSchedulePlacement(task.taskId, event.target.value || selectedScheduleDate, schedule.hour)
              }
              className="h-9 rounded-lg border-slate-200 bg-slate-50 text-xs font-semibold shadow-none focus:border-[#F4C84A] focus:ring-[#F4C84A]/20 dark:border-slate-700 dark:bg-slate-900"
            />
            <Input
              type="time"
              step={3600}
              value={schedule.hour ?? ''}
              onChange={(event) =>
                onUpdateTaskSchedulePlacement(
                  task.taskId,
                  schedule.date || selectedScheduleDate,
                  normalizeScheduleHourInput(event.target.value),
                )
              }
              className="h-9 rounded-lg border-slate-200 bg-slate-50 text-xs font-semibold shadow-none focus:border-[#F4C84A] focus:ring-[#F4C84A]/20 dark:border-slate-700 dark:bg-slate-900"
            />
          </div>
        ) : null}
      </div>

      <div
        className={cn(
          'flex items-center justify-between gap-3 text-[11px] font-semibold text-slate-500 dark:text-slate-400',
          isSidebarCard &&
            'rounded-lg border border-[#F4C84A]/25 bg-white/80 px-3 py-2 dark:border-slate-700 dark:bg-slate-900/50',
        )}
      >
        <span>{dueLabel}</span>
        <span>{clampPercent(task.completionPercent)}%</span>
      </div>
      <div
        className={cn(
          'flex flex-wrap items-center gap-2 border-t border-slate-100 pt-2 dark:border-slate-700',
          isSidebarCard && 'items-stretch',
        )}
      >
        <Select
          value={task.status}
          disabled={isPending}
          onValueChange={(value) => {
            if (value === 'completed') {
              onCloseTask(task);
              return;
            }
            if (value === 'cancelled') {
              onCancelTask(task);
              return;
            }
            void onPersistTaskChange(task, { status: value as TaskStatus });
          }}
        >
          <SelectTrigger
            className={cn(
              'h-8 shrink-0 rounded-full px-3 text-xs font-semibold shadow-none',
              isSidebarCard ? 'w-full justify-between' : 'w-[126px]',
              displayStatusClasses[displayStatus],
            )}
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {(['pending', 'in_progress', 'paused', 'completed', 'cancelled'] as TaskStatus[]).map((value) => (
              <SelectItem key={value} value={value}>
                {copy.statuses[value]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <TableActionButton
          label={copy.actions.closeTask}
          onClick={() => onCloseTask(task)}
          disabled={isPending || task.status === 'completed' || task.status === 'cancelled'}
          className="border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:border-emerald-900/60 dark:bg-emerald-950/60 dark:text-emerald-300 dark:hover:bg-emerald-900/60"
          icon={<CheckCircle2 className="h-4 w-4" />}
        />
        <TableActionButton
          label={copy.actions.files}
          onClick={() => onOpenAttachments(task)}
          disabled={isPending}
          className="border-[#F4C84A]/30 bg-[#F4C84A]/10 text-[#9A6B05] hover:bg-[#F4C84A] hover:text-slate-950 dark:border-[#F4C84A]/40 dark:bg-[#F4C84A]/15 dark:text-[#FEF3C7] dark:hover:bg-[#F4C84A] dark:hover:text-slate-950"
          icon={<FolderOpen className="h-4 w-4" />}
        />
        <TableActionButton
          label={copy.actions.editTask}
          onClick={() => onEditTask(task)}
          disabled={isPending}
          className="border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100 dark:border-amber-900/60 dark:bg-amber-950/60 dark:text-amber-300 dark:hover:bg-amber-900/60"
          icon={<Pencil className="h-4 w-4" />}
        />
        <TableActionButton
          label={copy.actions.deleteTask}
          onClick={() => onDeleteTask(task)}
          disabled={isPending}
          className="border-red-200 bg-red-50 text-red-700 hover:bg-red-100 dark:border-red-900/60 dark:bg-red-950/60 dark:text-red-300 dark:hover:bg-red-900/60"
          icon={<Trash2 className="h-4 w-4" />}
        />
      </div>
    </article>
  );
}
