import { CheckCircle2, ClipboardCheck, Copy, FileText, Pencil, Trash2 } from 'lucide-react';
import { TableActionButton } from './AgendaTablePrimitives';
import type { AgendaTaskActionsProps } from './AgendaTaskCellTypes';

export function AgendaTaskActions({
  copy,
  isPending,
  onAuditTask,
  onCloseTask,
  onCopyTask,
  onDeleteTask,
  onEditTask,
  onOpenReport,
  task,
}: AgendaTaskActionsProps) {
  return (
    <div className="flex w-full min-w-[310px] items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-700 dark:bg-slate-900/70">
      <TableActionButton
        label={copy.actions.closeTask}
        onClick={() => onCloseTask(task)}
        disabled={isPending || task.status === 'completed' || task.status === 'cancelled'}
        className="border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:border-emerald-900/60 dark:bg-emerald-950/60 dark:text-emerald-300 dark:hover:bg-emerald-900/60"
        icon={<CheckCircle2 className="h-4 w-4" />}
      />
      <TableActionButton
        label={copy.actions.taskReport}
        onClick={() => onOpenReport(task)}
        disabled={isPending}
        className="border-slate-200 bg-white text-slate-700 hover:bg-slate-100 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
        icon={<FileText className="h-4 w-4" />}
      />
      <TableActionButton
        label={task.audited ? copy.actions.correctAudit : copy.actions.auditTask}
        onClick={() => onAuditTask(task)}
        disabled={isPending || task.status !== 'completed'}
        className="border-violet-200 bg-violet-50 text-violet-700 hover:bg-violet-100 dark:border-violet-900/60 dark:bg-violet-950/60 dark:text-violet-300 dark:hover:bg-violet-900/60"
        icon={<ClipboardCheck className="h-4 w-4" />}
      />
      <TableActionButton
        label={copy.actions.editTask}
        onClick={() => onEditTask(task)}
        disabled={isPending}
        className="border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100 dark:border-amber-900/60 dark:bg-amber-950/60 dark:text-amber-300 dark:hover:bg-amber-900/60"
        icon={<Pencil className="h-4 w-4" />}
      />
      <TableActionButton
        label={copy.actions.copyTask}
        onClick={() => {
          void onCopyTask(task);
        }}
        disabled={isPending}
        className="border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100 dark:border-blue-900/60 dark:bg-blue-950/60 dark:text-blue-300 dark:hover:bg-blue-900/60"
        icon={<Copy className="h-4 w-4" />}
      />
      <TableActionButton
        label={copy.actions.deleteTask}
        onClick={() => onDeleteTask(task)}
        disabled={isPending}
        className="border-red-200 bg-red-50 text-red-700 hover:bg-red-100 dark:border-red-900/60 dark:bg-red-950/60 dark:text-red-300 dark:hover:bg-red-900/60"
        icon={<Trash2 className="h-4 w-4" />}
      />
    </div>
  );
}
