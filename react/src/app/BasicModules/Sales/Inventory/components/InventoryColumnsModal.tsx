import { Columns3, X } from 'lucide-react';
import { Button } from '../../../../components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../../../../components/ui/dialog';
import { Checkbox } from '../../../../components/ui/checkbox';
import type { InventoryOperationalColumnId } from '../types/inventoryTypes';
import type { InventoryTranslations } from '../translations';

const protectedColumns: InventoryOperationalColumnId[] = ['selection', 'photo', 'product', 'actions'];
const configurableColumns: InventoryOperationalColumnId[] = [
  'sku',
  'category',
  'type',
  'totalStock',
  'available',
  'reserved',
  'minimum',
  'status',
  'warehouseDistribution',
  'estimatedValue',
  'lastMovement',
];
const allColumns: InventoryOperationalColumnId[] = [...protectedColumns, ...configurableColumns];

function columnLabel(column: InventoryOperationalColumnId, t: InventoryTranslations) {
  if (column === 'selection') return 'Selection';
  if (column === 'actions') return t.operational.columns.actions;
  return t.operational.columns[column];
}

export function InventoryColumnsModal({
  open,
  visibleColumns,
  t,
  onOpenChange,
  onVisibleColumnsChange,
}: {
  open: boolean;
  visibleColumns: InventoryOperationalColumnId[];
  t: InventoryTranslations;
  onOpenChange: (open: boolean) => void;
  onVisibleColumnsChange: (columns: InventoryOperationalColumnId[]) => void;
}) {
  const toggleColumn = (column: InventoryOperationalColumnId) => {
    if (protectedColumns.includes(column)) return;

    const nextVisible = visibleColumns.includes(column)
      ? visibleColumns.filter((item) => item !== column)
      : allColumns.filter((item) => item === column || visibleColumns.includes(item));

    onVisibleColumnsChange(Array.from(new Set([...protectedColumns, ...nextVisible])));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="overflow-hidden rounded-[30px] border border-slate-200/80 bg-white p-0 shadow-[0_30px_80px_rgba(15,23,42,0.22)] sm:max-w-[620px] [&>button]:hidden">
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
          {allColumns.map((column) => (
            <label key={column} className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm font-semibold text-slate-700 transition hover:border-[#FF6B5E]/40 hover:bg-[#FF6B5E]/5">
              <Checkbox
                checked={visibleColumns.includes(column)}
                disabled={protectedColumns.includes(column)}
                onCheckedChange={() => toggleColumn(column)}
                className="data-[state=checked]:border-[#FF6B5E] data-[state=checked]:bg-[#FF6B5E]"
              />
              {columnLabel(column, t)}
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
