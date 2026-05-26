import { Columns3, Eye, EyeOff, X } from 'lucide-react';
import { Button } from '../../../../components/ui/button';
import { Checkbox } from '../../../../components/ui/checkbox';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogTitle,
} from '../../../../components/ui/dialog';
import { defaultProcessesTranslations, type ProcessesTranslations } from '../translations';
import type { ProcessColumnConfig } from '../types';

interface ProcessColumnsDialogProps {
  columns: ProcessColumnConfig[];
  copy?: ProcessesTranslations;
  onColumnsChange: (columns: ProcessColumnConfig[]) => void;
  onOpenChange: (open: boolean) => void;
  open: boolean;
}

const cloneColumns = (columns: ProcessColumnConfig[]) => columns.map((column) => ({ ...column }));

export function ProcessColumnsDialog({
  columns,
  copy = defaultProcessesTranslations,
  onColumnsChange,
  onOpenChange,
  open,
}: ProcessColumnsDialogProps) {
  const dialogCopy = copy.columnsDialog;

  const showAllColumns = () => {
    onColumnsChange(
      columns.map((column) => ({
        ...column,
        visible: true,
      })),
    );
  };

  const showMinimumColumns = () => {
    onColumnsChange(
      columns.map((column) => ({
        ...column,
        visible: Boolean(column.locked),
      })),
    );
  };

  const toggleColumn = (columnId: ProcessColumnConfig['id'], checked: boolean) => {
    onColumnsChange(
      columns.map((column) =>
        column.id === columnId && !column.locked
          ? {
              ...column,
              visible: checked,
            }
          : column,
      ),
    );
  };

  const visibleCount = columns.filter((column) => column.visible).length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[640px] overflow-hidden rounded-[32px] border border-slate-200/80 bg-white p-0 shadow-[0_30px_80px_rgba(15,23,42,0.22)] dark:border-slate-700 dark:bg-slate-800 [&>button]:hidden">
        <div className="bg-[#F4C84A] px-6 py-4">
          <div className="flex items-center justify-between gap-4">
            <div className="pr-4">
              <DialogTitle className="flex items-center gap-2 text-[1.2rem] font-bold leading-tight text-slate-950">
                <Columns3 className="h-5 w-5" />
                {dialogCopy.title}
              </DialogTitle>
            </div>
            <DialogClose asChild>
              <button
                type="button"
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl border border-[#9A6B05]/25 bg-white/35 text-slate-950 shadow-sm transition-colors hover:bg-white/60"
              >
                <X className="h-4 w-4" />
              </button>
            </DialogClose>
          </div>
        </div>

        <div className="space-y-6 px-6 py-5">
          <div className="space-y-2">
            <DialogDescription className="max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-400">
              {dialogCopy.description}
            </DialogDescription>
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
              {dialogCopy.visibleCount(visibleCount, columns.length)}
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={showAllColumns}
              className="h-10 rounded-xl border-slate-200 bg-white px-4 text-sm font-semibold shadow-none dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100"
            >
              <Eye className="mr-2 h-4 w-4" />
              {dialogCopy.selectAll}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={showMinimumColumns}
              className="h-10 rounded-xl border-slate-200 bg-white px-4 text-sm font-semibold shadow-none dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100"
            >
              <EyeOff className="mr-2 h-4 w-4" />
              {dialogCopy.minimumSet}
            </Button>
          </div>

          <div className="space-y-3">
            {cloneColumns(columns).map((column) => (
              <label
                key={column.id}
                className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 transition-colors dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-200"
              >
                <Checkbox
                  checked={column.visible}
                  disabled={column.locked}
                  onCheckedChange={(checked) => toggleColumn(column.id, Boolean(checked))}
                  className="mt-0.5"
                />
                <div className="space-y-1">
                  <p className="font-semibold text-slate-900 dark:text-white">{column.label}</p>
                  <p className="text-xs leading-5 text-slate-500 dark:text-slate-400">
                    {column.locked ? dialogCopy.requiredColumn : dialogCopy.optionalColumn}
                  </p>
                </div>
              </label>
            ))}
          </div>
        </div>

        <DialogFooter className="border-t border-slate-200/80 bg-white px-6 py-4 dark:border-slate-700 dark:bg-slate-800">
          <DialogClose asChild>
            <Button
              type="button"
              variant="outline"
              className="h-10 rounded-xl border-slate-200 bg-white px-4 text-sm font-semibold shadow-none dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100"
            >
              {copy.common.close}
            </Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
