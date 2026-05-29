import { Columns3, X } from 'lucide-react';
import { Button } from '../../../../components/ui/button';
import { Checkbox } from '../../../../components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../../../../components/ui/dialog';
import type { SalesRecordsTranslations } from '../translations';
import type { SalesColumnId } from '../types/salesTypes';
import { salesColumnConfigs } from '../utils/salesStatuses';

export function SalesColumnsModal({
  open,
  visibleColumns,
  t,
  onOpenChange,
  onVisibleColumnsChange,
}: {
  open: boolean;
  visibleColumns: SalesColumnId[];
  t: SalesRecordsTranslations;
  onOpenChange: (open: boolean) => void;
  onVisibleColumnsChange: (columns: SalesColumnId[]) => void;
}) {
  const toggleColumn = (columnId: SalesColumnId) => {
    const config = salesColumnConfigs.find((column) => column.id === columnId);
    if (config?.locked) return;

    const nextColumns = visibleColumns.includes(columnId)
      ? visibleColumns.filter((column) => column !== columnId)
      : salesColumnConfigs.map((column) => column.id).filter((column) => column === columnId || visibleColumns.includes(column));

    const lockedColumns = salesColumnConfigs.filter((column) => column.locked).map((column) => column.id);
    onVisibleColumnsChange(Array.from(new Set([...lockedColumns, ...nextColumns])));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="overflow-hidden rounded-[30px] border border-slate-200/80 bg-white p-0 shadow-[0_30px_80px_rgba(15,23,42,0.22)] sm:max-w-[660px] [&>button]:hidden">
        <DialogHeader className="bg-[#FF6B5E] px-6 py-4 text-left text-white">
          <div className="flex items-start justify-between gap-4">
            <div className="flex min-w-0 items-start gap-3">
              <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl border border-white/30 bg-white/15">
                <Columns3 className="h-5 w-5" />
              </span>
              <div className="min-w-0">
                <DialogTitle className="text-xl font-bold text-white">{t.columnsModal.title}</DialogTitle>
                <DialogDescription className="mt-1 text-sm font-medium leading-5 text-white/80">{t.columnsModal.description}</DialogDescription>
              </div>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-9 w-9 shrink-0 rounded-2xl border border-white/30 bg-white/10 text-white hover:bg-white/20"
              onClick={() => onOpenChange(false)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>

        <div className="bg-slate-50/70 px-6 py-5">
          <div className="grid gap-3 rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm sm:grid-cols-2">
            {salesColumnConfigs.map((column) => (
              <label key={column.id} className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm font-semibold text-slate-700 transition hover:border-[#FF6B5E]/40 hover:bg-[#FF6B5E]/5">
                <Checkbox
                  checked={visibleColumns.includes(column.id)}
                  disabled={column.locked}
                  onCheckedChange={() => toggleColumn(column.id)}
                  className="data-[state=checked]:border-[#FF6B5E] data-[state=checked]:bg-[#FF6B5E]"
                />
                {t.table.columns[column.id]}
              </label>
            ))}
          </div>
        </div>

        <DialogFooter className="bg-[#FF6B5E] px-6 py-4">
          <Button type="button" className="h-10 rounded-xl bg-white px-4 font-bold text-[#B63B32] shadow-sm hover:bg-white/90" onClick={() => onOpenChange(false)}>
            {t.common.close}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
