import { ArrowRightLeft, Columns3, PackagePlus, SlidersHorizontal, Warehouse } from 'lucide-react';
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
  const warehouseActionLabel = t.operational.actions.createWarehouse === 'Crear almacén'
    ? 'Administrar almacenes'
    : t.operational.actions.createWarehouse === 'Create warehouse'
      ? 'Manage warehouses'
      : t.operational.actions.createWarehouse;

  return (
    <SalesTitleBar
      icon={isMovementsView ? '🔁' : t.header.emoji}
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
          {!isMovementsView ? (
            <Button
              variant="outline"
              className={salesTitleBarSecondaryActionClassName}
              onClick={onCreateWarehouse}
            >
              <Warehouse className="h-4 w-4" />
              {warehouseActionLabel}
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
