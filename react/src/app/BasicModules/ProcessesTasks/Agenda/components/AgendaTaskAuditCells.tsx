import { ClipboardCheck, Pencil } from 'lucide-react';
import { Badge } from '../../../../components/ui/badge';
import { Button } from '../../../../components/ui/button';
import { cn } from '../../../../components/ui/utils';
import type { AgendaTaskCellProps } from './AgendaTaskCellTypes';
import { formatWeightingScore } from '../utils/agendaTaskStatus';

type TaskAuditCellProps = Pick<
  AgendaTaskCellProps,
  'auditStatusClasses' | 'copy' | 'isPending' | 'onAuditTask' | 'onEditTask' | 'task'
>;

export function NotesCell({ copy, isPending, onEditTask, task }: TaskAuditCellProps) {
  return (
    <div className="w-full space-y-2">
      <p
        className={cn(
          'line-clamp-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm leading-5 dark:border-slate-700 dark:bg-slate-900/70',
          task.notes ? 'text-slate-700 dark:text-slate-200' : 'text-slate-400 dark:text-slate-500',
        )}
      >
        {task.notes || copy.common.noNotes}
      </p>
      <Button
        type="button"
        variant="outline"
        disabled={isPending}
        className="h-8 rounded-xl border-amber-200 bg-amber-50 px-3 text-xs font-medium text-amber-700 shadow-none hover:bg-amber-100 dark:border-amber-900/60 dark:bg-amber-950/60 dark:text-amber-300 dark:hover:bg-amber-900/60"
        onClick={() => onEditTask(task)}
      >
        <Pencil className="h-3.5 w-3.5" />
        {copy.actions.editTask}
      </Button>
    </div>
  );
}

export function WeightingCell({ copy, isPending, onAuditTask, task }: TaskAuditCellProps) {
  return (
    <div className="flex w-full flex-col items-start gap-2">
      <Badge
        variant="outline"
        className={cn(
          'w-fit rounded-full px-3 py-1 font-medium',
          task.audited
            ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/60 dark:text-emerald-300'
            : 'border-slate-200 bg-slate-50 text-slate-500 dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-300',
        )}
      >
        {formatWeightingScore(task.weighting, copy.table.noWeighting)}
      </Badge>
      {task.status === 'completed' ? (
        <Button
          type="button"
          variant="outline"
          disabled={isPending}
          className="h-8 rounded-xl border-violet-200 bg-violet-50 px-3 text-xs font-medium text-violet-700 shadow-none hover:bg-violet-100 dark:border-violet-900/60 dark:bg-violet-950/60 dark:text-violet-300 dark:hover:bg-violet-900/60"
          onClick={() => onAuditTask(task)}
        >
          <ClipboardCheck className="h-3.5 w-3.5" />
          {task.audited ? copy.actions.correctAudit : copy.actions.auditTask}
        </Button>
      ) : (
        <p className="text-xs font-medium text-slate-500 dark:text-slate-400">{copy.auditStatuses.not_ready}</p>
      )}
    </div>
  );
}

export function AuditNotesCell({ auditStatusClasses, copy, isPending, onAuditTask, task }: TaskAuditCellProps) {
  return (
    <div className="flex w-full flex-col items-start gap-2">
      <Badge variant="outline" className={cn('rounded-full px-3 py-1 font-medium', auditStatusClasses[task.auditStatus])}>
        {copy.auditStatuses[task.auditStatus]}
      </Badge>
      {task.audited ? (
        <p
          className={cn(
            'line-clamp-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm leading-5 dark:border-slate-700 dark:bg-slate-900/70',
            task.auditNotes ? 'text-slate-700 dark:text-slate-200' : 'text-slate-400 dark:text-slate-500',
          )}
        >
          {task.auditNotes || copy.common.noAuditNotes}
        </p>
      ) : null}
      {task.status === 'completed' ? (
        <Button
          type="button"
          variant="outline"
          disabled={isPending}
          className="h-9 rounded-xl border-violet-200 bg-violet-50 px-3 text-sm font-medium text-violet-700 shadow-none hover:bg-violet-100 dark:border-violet-900/60 dark:bg-violet-950/60 dark:text-violet-300 dark:hover:bg-violet-900/60"
          onClick={() => onAuditTask(task)}
        >
          <ClipboardCheck className="h-4 w-4" />
          {task.audited ? copy.actions.correctAudit : copy.actions.auditTask}
        </Button>
      ) : (
        <p className="text-sm text-slate-500 dark:text-slate-400">{copy.auditStatuses.not_ready}</p>
      )}
    </div>
  );
}
