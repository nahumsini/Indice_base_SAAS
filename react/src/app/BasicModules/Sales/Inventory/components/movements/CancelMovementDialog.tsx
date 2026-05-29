import { AlertTriangle } from 'lucide-react';
import { Button } from '../../../../../components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../../../../../components/ui/dialog';
import type { InventoryOperationalMovement } from '../../types/inventoryTypes';
import type { InventoryTranslations } from '../../translations';

export function CancelMovementDialog({
  movement,
  t,
  onClose,
  onConfirm,
}: {
  movement: InventoryOperationalMovement | null;
  t: InventoryTranslations;
  onClose: () => void;
  onConfirm: (movement: InventoryOperationalMovement) => void;
}) {
  const handleConfirm = () => {
    if (!movement) return;
    onConfirm(movement);
  };

  return (
    <Dialog open={Boolean(movement)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="rounded-2xl border border-red-200 bg-white p-0 shadow-2xl sm:max-w-[460px]">
        <DialogHeader className="border-b border-red-100 bg-red-50 px-5 py-4">
          <DialogTitle className="flex items-center gap-3 text-lg font-black text-red-800">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-red-200 bg-white text-red-600">
              <AlertTriangle className="h-4 w-4" />
            </span>
            {t.operational.modals.cancelMovementTitle}
          </DialogTitle>
          <DialogDescription className="pt-2 text-sm font-semibold leading-6 text-red-700">
            {t.operational.modals.cancelMovementDescription}
          </DialogDescription>
        </DialogHeader>
        <div className="px-5 py-4">
          <p className="text-sm font-black text-slate-950">{movement?.movementNumber ?? movement?.id}</p>
          <p className="mt-1 text-xs font-semibold text-slate-500">{movement?.reference ?? t.common.notAvailable}</p>
        </div>
        <DialogFooter className="border-t border-slate-200 bg-slate-50 px-5 py-4">
          <Button type="button" variant="outline" className="h-10 rounded-xl border-slate-200 bg-white px-4 font-semibold" onClick={onClose}>
            {t.common.cancel}
          </Button>
          <Button type="button" className="h-10 rounded-xl bg-red-600 px-4 font-black text-white hover:bg-red-700" onClick={handleConfirm}>
            {t.operational.modals.confirmCancelMovement}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
