import { ArrowRightLeft, Columns3, PackagePlus, SlidersHorizontal } from 'lucide-react';
import { Button } from '../../../../components/ui/button';
import {
  SalesTitleBar,
  salesTitleBarPrimaryActionClassName,
  salesTitleBarSecondaryActionClassName,
} from '../../components/SalesTitleBar';
import type { InventoryTranslations } from '../translations';

export function InventoryHeader({
  t,
  isMovementsView = false,
  onAddInventory,
  onTransferStock,
  onInventoryAdjustment,
  onOpenColumns,
  showColumnsAction = true,
}: {
  t: InventoryTranslations;
  isMovementsView?: boolean;
  onAddInventory: () => void;
  onTransferStock: () => void;
  onInventoryAdjustment?: () => void;
  onOpenColumns: () => void;
  showColumnsAction?: boolean;
}) {
  const title = isMovementsView ? t.operational.movementsTitle : t.operational.title;
  const subtitle = isMovementsView ? t.operational.movementsSubtitle : t.operational.subtitle;

  return (
    <SalesTitleBar
      icon={isMovementsView ? '🔁' : '🏬'}
      rhIndent
      title={title}
      subtitle={subtitle}
      actions={(
        <>
          {showColumnsAction ? (
            <Button
              variant="outline"
              className={salesTitleBarSecondaryActionClassName}
              onClick={onOpenColumns}
            >
              <Columns3 className="h-4 w-4" />
              {t.header.secondaryAction}
            </Button>
          ) : null}
          <Button
            variant="outline"
            className={salesTitleBarSecondaryActionClassName}
            onClick={onTransferStock}
          >
            <ArrowRightLeft className="h-4 w-4" />
            {isMovementsView ? t.operational.actions.newTransfer : t.operational.actions.transferStock}
          </Button>
          {isMovementsView ? (
            <Button
              variant="outline"
              className={salesTitleBarSecondaryActionClassName}
              onClick={onInventoryAdjustment}
            >
              <SlidersHorizontal className="h-4 w-4" />
              {t.operational.actions.inventoryAdjustment}
            </Button>
          ) : null}
          <Button
            className={salesTitleBarPrimaryActionClassName}
            onClick={onAddInventory}
          >
            <PackagePlus className="h-4 w-4" />
            {isMovementsView ? t.operational.actions.receiveStock : t.operational.actions.addInventory}
          </Button>
        </>
      )}
    />
  );
}
