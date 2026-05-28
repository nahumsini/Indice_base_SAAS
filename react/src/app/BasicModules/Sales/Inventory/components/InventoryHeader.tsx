import { ArrowRightLeft, Columns3, PackagePlus, SlidersHorizontal, Warehouse } from 'lucide-react';
import { Button } from '../../../../components/ui/button';
import type { InventoryTranslations } from '../translations';

export function InventoryHeader({
  t,
  isMovementsView = false,
  onAddInventory,
  onTransferStock,
  onCreateWarehouse,
  onInventoryAdjustment,
  onOpenColumns,
  showColumnsAction = true,
}: {
  t: InventoryTranslations;
  isMovementsView?: boolean;
  onAddInventory: () => void;
  onTransferStock: () => void;
  onCreateWarehouse: () => void;
  onInventoryAdjustment?: () => void;
  onOpenColumns: () => void;
  showColumnsAction?: boolean;
}) {
  const title = isMovementsView ? t.operational.movementsTitle : t.operational.title;
  const subtitle = isMovementsView ? t.operational.movementsSubtitle : t.operational.subtitle;

  return (
    <div className="rounded-lg border border-[#FF6B5E]/30 bg-[#FF6B5E]/10 p-6 shadow-sm">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <div className="mb-4 h-1 w-14 rounded-full bg-[#FF6B5E]" />
          <p className="mb-2 text-xs font-black uppercase tracking-[0.16em] text-[#B63B32]">{t.operational.badge}</p>
          <h2 className="mb-1 flex items-center gap-2 text-2xl font-bold tracking-tight text-slate-950">
            <span className="text-2xl leading-none" aria-hidden="true">{t.header.emoji}</span>
            {title}
          </h2>
          <p className="max-w-3xl text-sm font-medium leading-6 text-slate-600">{subtitle}</p>
        </div>

        <div className="flex flex-wrap gap-3">
          {showColumnsAction ? (
            <Button
              variant="outline"
              className="h-10 gap-2 rounded-xl border-[#FF6B5E]/25 bg-white px-4 text-sm font-bold text-[#B63B32] shadow-none hover:bg-[#FF6B5E]/10"
              onClick={onOpenColumns}
            >
              <Columns3 className="h-4 w-4" />
              {t.header.secondaryAction}
            </Button>
          ) : null}
          {!isMovementsView ? (
            <Button
              variant="outline"
              className="h-10 gap-2 rounded-xl border-[#FF6B5E]/25 bg-white px-4 text-sm font-bold text-[#B63B32] shadow-none hover:bg-[#FF6B5E]/10"
              onClick={onCreateWarehouse}
            >
              <Warehouse className="h-4 w-4" />
              {t.operational.actions.createWarehouse}
            </Button>
          ) : null}
          <Button
            variant="outline"
            className="h-10 gap-2 rounded-xl border-[#FF6B5E]/25 bg-white px-4 text-sm font-bold text-[#B63B32] shadow-none hover:bg-[#FF6B5E]/10"
            onClick={onTransferStock}
          >
            <ArrowRightLeft className="h-4 w-4" />
            {isMovementsView ? t.operational.actions.newTransfer : t.operational.actions.transferStock}
          </Button>
          {isMovementsView ? (
            <Button
              variant="outline"
              className="h-10 gap-2 rounded-xl border-[#FF6B5E]/25 bg-white px-4 text-sm font-bold text-[#B63B32] shadow-none hover:bg-[#FF6B5E]/10"
              onClick={onInventoryAdjustment}
            >
              <SlidersHorizontal className="h-4 w-4" />
              {t.operational.actions.inventoryAdjustment}
            </Button>
          ) : null}
          <Button
            className="h-10 gap-2 rounded-xl bg-[#FF6B5E] px-4 text-sm font-bold text-white shadow-sm shadow-[#FF6B5E]/20 hover:bg-[#E85C50]"
            onClick={onAddInventory}
          >
            <PackagePlus className="h-4 w-4" />
            {isMovementsView ? t.operational.actions.receiveStock : t.operational.actions.addInventory}
          </Button>
        </div>
      </div>
    </div>
  );
}
