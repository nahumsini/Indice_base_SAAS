import { ArrowRightLeft, Columns3, PackagePlus, SlidersHorizontal } from 'lucide-react';
import { IndiceTitleBarOverflow } from '../../../../components/frontend-os';
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
  const eligibleActionCount = 2
    + Number(showColumnsAction)
    + Number(Boolean(isMovementsView && onInventoryAdjustment));
  const hasOverflow = eligibleActionCount > 3;

  return (
    <SalesTitleBar
      icon={isMovementsView ? '🔁' : '🏬'}
      rhIndent
      title={title}
      subtitle={subtitle}
      actions={(
        <>
          {showColumnsAction && !hasOverflow ? (
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
          {isMovementsView && onInventoryAdjustment ? (
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
          {hasOverflow ? (
            <IndiceTitleBarOverflow
              label={t.common.actions}
              items={showColumnsAction ? [{
                id: 'columns',
                icon: <Columns3 className="h-4 w-4" />,
                label: t.header.secondaryAction,
                onSelect: onOpenColumns,
              }] : []}
            />
          ) : null}
        </>
      )}
    />
  );
}
