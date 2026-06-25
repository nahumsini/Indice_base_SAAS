import { CheckCircle2, ClipboardCheck, FolderOpen, Pencil } from 'lucide-react';
import { Badge } from '../../../../components/ui/badge';
import { cn } from '../../../../components/ui/utils';
import type { AgendaTaskItem } from '../agendaApi';
import type { AgendaTranslations } from '../translations';
import type { AgendaKanbanColumn, AgendaKanbanColumnId, AgendaLoadRange, DisplayTaskStatus } from '../types';
import { formatDate } from '../utils/agendaReports';
import {
  clampPercent,
  formatWeightingScore,
  getTaskDisplayStatus,
} from '../utils/agendaTaskStatus';
import { TableActionButton } from './AgendaTablePrimitives';

type AgendaKanbanViewProps = {
  columns: AgendaKanbanColumn[];
  copy: AgendaTranslations;
  displayStatusClasses: Record<DisplayTaskStatus, string>;
  draggingTaskId: number | null;
  isLoading: boolean;
  isTaskPending: (taskId: number) => boolean;
  kanbanTasksByColumn: Map<AgendaKanbanColumnId, AgendaTaskItem[]>;
  onAuditTask: (task: AgendaTaskItem) => void;
  onCloseTask: (task: AgendaTaskItem) => void;
  onDrop: (columnId: AgendaKanbanColumnId) => void;
  onEditTask: (task: AgendaTaskItem) => void;
  onOpenAttachments: (task: AgendaTaskItem) => void;
  onSetDraggingTaskId: (taskId: number | null) => void;
  sortedTaskCount: number;
  statusReferenceDate: string;
  statusReferenceRange: AgendaLoadRange;
};

export function AgendaKanbanView({
  columns,
  copy,
  displayStatusClasses,
  draggingTaskId,
  isLoading,
  isTaskPending,
  kanbanTasksByColumn,
  onAuditTask,
  onCloseTask,
  onDrop,
  onEditTask,
  onOpenAttachments,
  onSetDraggingTaskId,
  sortedTaskCount,
  statusReferenceDate,
  statusReferenceRange,
}: AgendaKanbanViewProps) {
  return (
    <section className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800">
      <div className="border-b border-slate-200 px-5 py-4 dark:border-slate-700">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">{copy.kanban.title}</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {copy.kanban.visibleTasks(sortedTaskCount)}
            </p>
          </div>
          <Badge
            variant="outline"
            className="w-fit rounded-full border-[#F4C84A]/30 bg-[#F4C84A]/10 px-3 py-1 font-semibold text-[#9A6B05]"
          >
            {copy.kanban.filteredBadge}
          </Badge>
        </div>
      </div>

      {isLoading ? (
        <div className="px-6 py-16 text-center text-base text-slate-500 dark:text-slate-400">
          {copy.kanban.loading}
        </div>
      ) : sortedTaskCount === 0 ? (
        <div className="px-6 py-16 text-center text-base text-slate-500 dark:text-slate-400">
          {copy.table.empty}
        </div>
      ) : (
        <div className="overflow-x-auto bg-slate-50/70 p-3 dark:bg-slate-900/40 sm:p-4">
          <div className="grid auto-cols-[minmax(280px,82vw)] grid-flow-col gap-3 sm:auto-cols-[300px] lg:min-w-[1560px] lg:grid-flow-row lg:grid-cols-6 lg:gap-4">
            {columns.map((column) => {
              const columnTasks = kanbanTasksByColumn.get(column.id) ?? [];
              const draggedTaskIsActive = draggingTaskId != null && column.acceptsDrop;

              return (
                <section
                  key={column.id}
                  className={cn(
                    'flex min-h-[460px] flex-col rounded-2xl border p-3 transition-colors lg:min-h-[520px]',
                    column.accentClassName,
                    draggedTaskIsActive && 'ring-2 ring-[#F4C84A]/25',
                  )}
                  onDragOver={(event) => {
                    if (column.acceptsDrop) {
                      event.preventDefault();
                    }
                  }}
                  onDrop={() => {
                    if (column.acceptsDrop) {
                      onDrop(column.id);
                    }
                  }}
                >
                  <div className="mb-3 flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={cn('h-2.5 w-2.5 rounded-full', column.dotClassName)} />
                        <h4 className="truncate text-sm font-bold text-slate-900 dark:text-white">
                          {column.label}
                        </h4>
                      </div>
                      <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">
                        {column.description}
                      </p>
                    </div>
                    <span className="rounded-full bg-white px-2.5 py-1 text-xs font-bold text-slate-700 shadow-sm ring-1 ring-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:ring-slate-700">
                      {columnTasks.length}
                    </span>
                  </div>

                  <div className="flex flex-1 flex-col gap-3">
                    {columnTasks.length === 0 ? (
                      <div className="flex min-h-[140px] items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white/70 px-4 text-center text-sm font-medium text-slate-400 dark:border-slate-700 dark:bg-slate-800/50 dark:text-slate-500">
                        {copy.kanban.emptyColumn}
                      </div>
                    ) : null}

                    {columnTasks.map((task) => {
                      const pending = isTaskPending(task.taskId);
                      const taskIsDragging = draggingTaskId === task.taskId;
                      const displayStatus = getTaskDisplayStatus(task, statusReferenceDate, statusReferenceRange);

                      return (
                        <article
                          key={task.taskId}
                          draggable={!pending}
                          onDragStart={() => onSetDraggingTaskId(task.taskId)}
                          onDragEnd={() => onSetDraggingTaskId(null)}
                          className={cn(
                            'rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition dark:border-slate-700 dark:bg-slate-800',
                            !pending && 'cursor-grab active:cursor-grabbing',
                            taskIsDragging && 'opacity-50',
                          )}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <Badge
                              variant="outline"
                              className="rounded-full border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-700 dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-200"
                            >
                              {task.folio}
                            </Badge>
                            <Badge
                              variant="outline"
                              className={cn(
                                'rounded-full px-2.5 py-1 text-xs font-semibold',
                                displayStatusClasses[displayStatus],
                              )}
                            >
                              {copy.statuses[displayStatus]}
                            </Badge>
                          </div>

                          <h4 className="mt-3 line-clamp-2 text-sm font-bold leading-5 text-slate-900 dark:text-white">
                            {task.title}
                          </h4>
                          <p className="mt-2 line-clamp-2 text-xs leading-5 text-slate-500 dark:text-slate-400">
                            {task.description || copy.common.noDescription}
                          </p>

                          <div className="mt-3 space-y-2 text-xs text-slate-600 dark:text-slate-300">
                            <p className="truncate">
                              {copy.kanban.responsible}: <span className="font-semibold">{task.assignedName ?? copy.common.unassigned}</span>
                            </p>
                            <p className={cn('truncate', displayStatus === 'overdue' && 'font-semibold text-rose-600 dark:text-rose-300')}>
                              {copy.kanban.due}: {task.dueDate ? formatDate(task.dueDate) : copy.common.noDate}
                            </p>
                            <p className="truncate">
                              {copy.kanban.priority}: <span className="font-semibold">{copy.priorities[task.priority]}</span>
                            </p>
                          </div>

                          <div className="mt-3">
                            <div className="mb-1 flex items-center justify-between text-xs font-semibold text-slate-500 dark:text-slate-400">
                              <span>{copy.kanban.progress}</span>
                              <span>{clampPercent(task.completionPercent)}%</span>
                            </div>
                            <div className="h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-700">
                              <div
                                className="h-full rounded-full bg-[#F4C84A]"
                                style={{ width: `${clampPercent(task.completionPercent)}%` }}
                              />
                            </div>
                          </div>

                          <div className="mt-3 flex flex-wrap items-center gap-2">
                            <Badge
                              variant="outline"
                              className="rounded-full border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-700 dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-200"
                            >
                              {task.attachments} {copy.columns.attachments.label.toLowerCase()}
                            </Badge>
                            <Badge
                              variant="outline"
                              className="rounded-full border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-700 dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-200"
                            >
                              {formatWeightingScore(task.weighting, copy.table.noWeighting)}
                            </Badge>
                          </div>

                          <div className="mt-4 grid grid-cols-4 gap-2">
                            <TableActionButton
                              label={copy.actions.editTask}
                              onClick={() => onEditTask(task)}
                              disabled={pending}
                              className="border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100 dark:border-amber-900/60 dark:bg-amber-950/60 dark:text-amber-300 dark:hover:bg-amber-900/60"
                              icon={<Pencil className="h-4 w-4" />}
                            />
                            <TableActionButton
                              label={copy.actions.files}
                              onClick={() => onOpenAttachments(task)}
                              disabled={pending}
                              className="border-[#F4C84A]/30 bg-[#F4C84A]/10 text-[#9A6B05] hover:bg-[#F4C84A] hover:text-slate-950"
                              icon={<FolderOpen className="h-4 w-4" />}
                            />
                            <TableActionButton
                              label={copy.actions.closeTask}
                              onClick={() => onCloseTask(task)}
                              disabled={pending || task.status === 'completed' || task.status === 'cancelled'}
                              className="border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:border-emerald-900/60 dark:bg-emerald-950/60 dark:text-emerald-300 dark:hover:bg-emerald-900/60"
                              icon={<CheckCircle2 className="h-4 w-4" />}
                            />
                            <TableActionButton
                              label={task.audited ? copy.actions.correctAudit : copy.actions.auditTask}
                              onClick={() => onAuditTask(task)}
                              disabled={pending || task.status !== 'completed'}
                              className="border-violet-200 bg-violet-50 text-violet-700 hover:bg-violet-100 dark:border-violet-900/60 dark:bg-violet-950/60 dark:text-violet-300 dark:hover:bg-violet-900/60"
                              icon={<ClipboardCheck className="h-4 w-4" />}
                            />
                          </div>
                        </article>
                      );
                    })}
                  </div>
                </section>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
}
