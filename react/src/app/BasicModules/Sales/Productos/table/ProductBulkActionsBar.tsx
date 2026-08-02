import { CheckCircle2, EyeOff, Power, X } from 'lucide-react';
import { Badge } from '../../../../components/ui/badge';
import { Button } from '../../../../components/ui/button';
import type { ProductsTranslations } from '../translations';

type ProductBulkActionsBarProps = {
  selectedCount: number;
  t: ProductsTranslations;
  onSetActive: () => void;
  onSetInactive: () => void;
  onMarkAvailableForSales: () => void;
  onRemoveFromPublicCatalog: () => void;
  onClearSelection: () => void;
};

export function ProductBulkActionsBar({
  selectedCount,
  t,
  onSetActive,
  onSetInactive,
  onMarkAvailableForSales,
  onRemoveFromPublicCatalog,
  onClearSelection,
}: ProductBulkActionsBarProps) {
  if (selectedCount === 0) {
    return null;
  }

  return (
    <section className="rounded-lg border border-[#F4C84A]/30 bg-[#F4C84A]/10 px-4 py-3 shadow-sm">
      <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex flex-wrap items-center gap-2 text-sm font-medium text-slate-800">
          <Badge variant="outline" className="rounded-full border-[#F4C84A]/40 bg-white px-3 py-1 text-[#9A6B05]">
            {t.table.selection.selected(selectedCount)}
          </Badge>
          <span className="text-slate-500">{t.table.selection.bulkActions}</span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            className="h-9 rounded-lg border-emerald-200 bg-emerald-50 px-3 text-sm font-medium text-emerald-700 shadow-none hover:bg-emerald-100"
            onClick={onSetActive}
          >
            <CheckCircle2 className="h-4 w-4" />
            {t.table.selection.setActive}
          </Button>
          <Button
            type="button"
            variant="outline"
            className="h-9 rounded-lg border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 shadow-none hover:bg-slate-100"
            onClick={onSetInactive}
          >
            <Power className="h-4 w-4" />
            {t.table.selection.setInactive}
          </Button>
          <Button
            type="button"
            variant="outline"
            className="h-9 rounded-lg border-[#FF6B5E]/25 bg-white px-3 text-sm font-medium text-[#B63B32] shadow-none hover:bg-[#FF6B5E]/10"
            onClick={onMarkAvailableForSales}
          >
            {t.table.selection.markAvailableForSales}
          </Button>
          <Button
            type="button"
            variant="outline"
            className="h-9 rounded-lg border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 shadow-none hover:bg-slate-100"
            onClick={onRemoveFromPublicCatalog}
          >
            <EyeOff className="h-4 w-4" />
            {t.table.selection.removeFromPublicCatalog}
          </Button>
          <Button
            type="button"
            variant="outline"
            className="h-9 rounded-lg border-slate-200 bg-white px-3 text-sm font-medium text-slate-600 shadow-none hover:bg-slate-100"
            onClick={onClearSelection}
          >
            <X className="h-4 w-4" />
            {t.table.selection.clearSelection}
          </Button>
        </div>
      </div>
    </section>
  );
}
