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
    <div className="rounded-xl border border-[#FF6B5E]/25 bg-[#FF6B5E]/10 px-6 py-6 shadow-sm shadow-[#FF6B5E]/10 dark:border-[#FF6B5E]/25 dark:bg-[#FF6B5E]/15">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <h2 className="mb-2 flex items-center gap-3 text-2xl font-bold tracking-tight text-slate-950 dark:text-white">
            <span className="text-xl leading-none" aria-hidden="true">{isMovementsView ? '🔁' : t.header.emoji}</span>
            {title}
          </h2>
          <p className="max-w-4xl text-sm font-semibold leading-6 text-slate-600 dark:text-slate-300">{subtitle}</p>
        </div>

        <div className="flex flex-wrap justify-start gap-2.5 lg:max-w-[720px] lg:justify-end">
          {showColumnsAction ? (
            <Button
              variant="outline"
              className="h-10 gap-2 rounded-xl border-[#FF6B5E]/25 bg-white px-4 text-sm font-bold text-[#B63B32] shadow-sm hover:bg-[#FF6B5E]/10 dark:border-[#FF6B5E]/30 dark:bg-slate-900 dark:text-[#FFB0AA] dark:hover:bg-[#FF6B5E]/15"
              onClick={onOpenColumns}
            >
              <Columns3 className="h-4 w-4" />
              {t.header.secondaryAction}
            </Button>
          ) : null}
          {!isMovementsView ? (
            <Button
              variant="outline"
              className="h-10 gap-2 rounded-xl border-[#FF6B5E]/25 bg-white px-4 text-sm font-bold text-[#B63B32] shadow-sm hover:bg-[#FF6B5E]/10 dark:border-[#FF6B5E]/30 dark:bg-slate-900 dark:text-[#FFB0AA] dark:hover:bg-[#FF6B5E]/15"
              onClick={onCreateWarehouse}
            >
              <Warehouse className="h-4 w-4" />
              {t.operational.actions.createWarehouse}
            </Button>
          ) : null}
          <Button
            variant="outline"
            className="h-10 gap-2 rounded-xl border-[#FF6B5E]/25 bg-white px-4 text-sm font-bold text-[#B63B32] shadow-sm hover:bg-[#FF6B5E]/10 dark:border-[#FF6B5E]/30 dark:bg-slate-900 dark:text-[#FFB0AA] dark:hover:bg-[#FF6B5E]/15"
            onClick={onTransferStock}
          >
            <ArrowRightLeft className="h-4 w-4" />
            {isMovementsView ? t.operational.actions.newTransfer : t.operational.actions.transferStock}
          </Button>
          {isMovementsView ? (
            <Button
              variant="outline"
              className="h-10 gap-2 rounded-xl border-[#FF6B5E]/25 bg-white px-4 text-sm font-bold text-[#B63B32] shadow-sm hover:bg-[#FF6B5E]/10 dark:border-[#FF6B5E]/30 dark:bg-slate-900 dark:text-[#FFB0AA] dark:hover:bg-[#FF6B5E]/15"
              onClick={onInventoryAdjustment}
            >
              <SlidersHorizontal className="h-4 w-4" />
              {t.operational.actions.inventoryAdjustment}
            </Button>
          ) : null}
          <Button
            className="h-10 gap-2 rounded-xl bg-[#FF6B5E] px-4 text-sm font-bold text-white shadow-sm shadow-[#FF6B5E]/25 hover:bg-[#E85C50]"
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
