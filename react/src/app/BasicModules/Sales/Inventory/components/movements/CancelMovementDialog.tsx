import { AlertTriangle } from 'lucide-react';
import { IndiceModalSummary } from '../../../../../components/indice-modal';
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
      modalType="confirmation"
      bodyClassName="bg-slate-50/70 px-7 py-6"
      footerLeading={(
        <Button type="button" variant="outline" className={cancelMovementActionClassNames.secondary} onClick={onClose}>
          {t.common.cancel}
        </Button>
      )}
      footer={(
        <Button type="button" className="h-11 rounded-lg bg-red-600 px-5 font-semibold text-white shadow-sm hover:bg-red-700" onClick={handleConfirm}>
          {t.operational.modals.confirmCancelMovement}
        </Button>
      )}
    >
      <IndiceModalSummary
        columns={2}
        items={[
          { id: 'movement', label: t.operational.columns.movement, value: movement?.movementNumber ?? movement?.id ?? t.common.notAvailable, emphasized: true },
          { id: 'reference', label: t.operational.columns.reference, value: movement?.reference ?? t.common.notAvailable },
        ]}
        variant="accent"
      />
    </SalesModalFrame>
  );
}
