import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '../../../../components/ui/dialog';
import type { InventoryMovement, InventoryStockItem } from '../types/inventoryTypes';
import type { InventoryTranslations } from '../translations';
import { InventoryMovementHistory } from '../components/InventoryMovementHistory';

export function InventoryItemMovementsModal({
  open,
  item,
  movements,
  t,
  onOpenChange,
}: {
  open: boolean;
  item: InventoryStockItem | null;
  movements: InventoryMovement[];
  t: InventoryTranslations;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto rounded-xl border-slate-200 bg-white p-0 shadow-2xl">
        <DialogHeader className="rounded-t-xl bg-[#FF6B5E] px-6 py-5 text-left text-white">
          <DialogTitle className="text-xl font-black">{t.movementHistory.itemMovementsTitle}</DialogTitle>
          <DialogDescription className="text-sm font-medium text-white/85">{item?.name ?? t.common.notAvailable}</DialogDescription>
        </DialogHeader>
        <div className="p-6">
          <InventoryMovementHistory movements={movements} t={t} />
        </div>
      </DialogContent>
    </Dialog>
  );
}
