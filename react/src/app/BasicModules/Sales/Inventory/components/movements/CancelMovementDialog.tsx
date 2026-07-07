import { AlertTriangle } from 'lucide-react';
import { Button } from '../../../../../components/ui/button';
import { SalesModalFrame } from '../../../components/SalesModalFrame';
import { getSalesModalActionClassNames } from '../../../salesModalStyles';
import type { InventoryOperationalMovement } from '../../types/inventoryTypes';
import type { InventoryTranslations } from '../../translations';

const cancelMovementActionClassNames = getSalesModalActionClassNames('coral');

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
    <SalesModalFrame
      open={Boolean(movement)}
      onOpenChange={(open) => !open && onClose()}
      title={t.operational.modals.cancelMovementTitle}
      description={t.operational.modals.cancelMovementDescription}
      icon={<AlertTriangle className="h-5 w-5" />}
      contentClassName="sm:max-w-[460px]"
      bodyClassName="bg-slate-50/70 px-7 py-6"
      footerClassName="sm:justify-end"
      footer={(
        <>
          <Button type="button" variant="outline" className={cancelMovementActionClassNames.secondary} onClick={onClose}>
            {t.common.cancel}
          </Button>
          <Button type="button" className={cancelMovementActionClassNames.primary} onClick={handleConfirm}>
            {t.operational.modals.confirmCancelMovement}
          </Button>
        </>
      )}
    >
      <div className="rounded-2xl border border-red-200 bg-red-50 p-5">
        <p className="text-sm font-black text-slate-950">{movement?.movementNumber ?? movement?.id}</p>
        <p className="mt-1 text-xs font-semibold text-red-700">{movement?.reference ?? t.common.notAvailable}</p>
      </div>
    </SalesModalFrame>
  );
}
