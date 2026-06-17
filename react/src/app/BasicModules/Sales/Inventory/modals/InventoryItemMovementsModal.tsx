import { Button } from '../../../../components/ui/button';
import { History } from 'lucide-react';
import { getSalesModalActionClassNames, SalesModalFrame } from '../../components/SalesModalFrame';
import type { InventoryMovement, InventoryStockItem } from '../types/inventoryTypes';
import type { InventoryTranslations } from '../translations';
import { InventoryMovementHistory } from '../components/InventoryMovementHistory';

const itemMovementsActionClassNames = getSalesModalActionClassNames('coral');

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
    <SalesModalFrame
      open={open}
      onOpenChange={onOpenChange}
      title={t.movementHistory.itemMovementsTitle}
      description={item?.name ?? t.common.notAvailable}
      icon={<History className="h-5 w-5" />}
      contentClassName="flex max-h-[90vh] max-w-3xl flex-col"
      bodyClassName="!max-h-none min-h-0 flex-1 overflow-y-auto bg-slate-50/70 p-6"
      footerClassName="sm:justify-end"
      footer={(
        <Button
          type="button"
          variant="outline"
          className={itemMovementsActionClassNames.secondary}
          onClick={() => onOpenChange(false)}
        >
          {t.common.close}
        </Button>
      )}
    >
          <InventoryMovementHistory movements={movements} t={t} />
    </SalesModalFrame>
  );
}
