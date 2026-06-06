import { CheckCircle2, Copy, Trash2 } from 'lucide-react';
import { Badge } from '../../../../components/ui/badge';
import { Button } from '../../../../components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../../../components/ui/select';
import type { TaskPriority } from '../../Tasks/tasksApi';
import type { AgendaTranslations } from '../translations';

type AgendaBulkActionsBarProps = {
  copy: AgendaTranslations;
  isRunning: boolean;
  onClearSelection: () => void;
  onComplete: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onOpenAssign: () => void;
  onOpenUnit: () => void;
  onPriorityChange: (priority: TaskPriority) => void;
  selectedCount: number;
};

export function AgendaBulkActionsBar({
  copy,
  isRunning,
  onClearSelection,
  onComplete,
  onDelete,
  onDuplicate,
  onOpenAssign,
  onOpenUnit,
  onPriorityChange,
  selectedCount,
}: AgendaBulkActionsBarProps) {
  return (
    <section className="mb-4 rounded-2xl border border-[#F4C84A]/30 bg-[#F4C84A]/10 px-4 py-3 shadow-sm dark:border-[#F4C84A]/40 dark:bg-[#F4C84A]/15">
      <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex flex-wrap items-center gap-2 text-sm font-semibold text-slate-800 dark:text-slate-100">
          <Badge variant="outline" className="rounded-full border-[#F4C84A]/40 bg-white px-3 py-1 text-[#9A6B05] dark:bg-slate-800 dark:text-[#FEF3C7]">
            {selectedCount} seleccionadas
          </Badge>
          <span className="text-slate-500 dark:text-slate-400">Acciones masivas</span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            className="h-9 rounded-xl border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 shadow-none hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
            disabled={isRunning}
            onClick={onDuplicate}
          >
            <Copy className="h-4 w-4" />
            {copy.actions.copyTask}
          </Button>
          <Button
            type="button"
            variant="outline"
            className="h-9 rounded-xl border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 shadow-none hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
            disabled={isRunning}
            onClick={onOpenAssign}
          >
            {copy.form.labels.responsible}
          </Button>
          <Button
            type="button"
            variant="outline"
            className="h-9 rounded-xl border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 shadow-none hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
            disabled={isRunning}
            onClick={onOpenUnit}
          >
            {copy.form.labels.unit}
          </Button>
          <Select disabled={isRunning} onValueChange={(value) => onPriorityChange(value as TaskPriority)}>
            <SelectTrigger className="h-9 w-[160px] rounded-xl border-slate-200 bg-white text-sm font-semibold text-slate-700 shadow-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100">
              <SelectValue placeholder={copy.form.labels.priority} />
            </SelectTrigger>
            <SelectContent>
              {(['low', 'medium', 'high'] as TaskPriority[]).map((priority) => (
                <SelectItem key={priority} value={priority}>
                  {copy.priorities[priority]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            type="button"
            variant="outline"
            className="h-9 rounded-xl border-emerald-200 bg-emerald-50 px-3 text-sm font-semibold text-emerald-700 shadow-none hover:bg-emerald-100 dark:border-emerald-900/60 dark:bg-emerald-950/60 dark:text-emerald-300"
            disabled={isRunning}
            onClick={onComplete}
          >
            <CheckCircle2 className="h-4 w-4" />
            {copy.actions.closeTask}
          </Button>
          <Button
            type="button"
            variant="outline"
            className="h-9 rounded-xl border-red-200 bg-red-50 px-3 text-sm font-semibold text-red-700 shadow-none hover:bg-red-100 dark:border-red-900/60 dark:bg-red-950/60 dark:text-red-300"
            disabled={isRunning}
            onClick={onDelete}
          >
            <Trash2 className="h-4 w-4" />
            {copy.actions.deleteTask}
          </Button>
          <Button
            type="button"
            variant="outline"
            className="h-9 rounded-xl border-slate-200 bg-white px-3 text-sm font-semibold text-slate-600 shadow-none hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
            disabled={isRunning}
            onClick={onClearSelection}
          >
            {copy.common.cancel}
          </Button>
        </div>
      </div>
    </section>
  );
}
