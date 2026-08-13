import type {
  InventoryMovementEntryLine,
  InventoryMovementEntryType,
  InventoryOperationalMovement,
  InventoryStockRow,
  InventoryWarehouse,
} from '../types/inventoryTypes';
import { getMovementSignedQuantity, isSupplierSource } from './inventoryMovementEntries';

export type InventoryMovementEditDraft = {
  movementType: InventoryMovementEntryType;
  adjustmentDirection?: 'increase' | 'decrease';
  items: InventoryMovementEntryLine[];
  fromWarehouseId: string;
  toWarehouseId: string;
  reason: string;
  reference: string;
  date: string;
};

const staticMovementLocationNames: Partial<Record<InventoryMovementEntryType, { from?: string; to?: string }>> = {
  supplierReceipt: { from: 'Supplier' },
  sale: { to: 'Customer' },
  return: { from: 'Customer' },
  adjustment: { to: 'Inventory correction' },
  writeOff: { to: 'Write off' },
};

export function getOperationalMovementGroupId(movement: InventoryOperationalMovement) {
  return movement.groupId ?? movement.movementNumber ?? movement.id;
}

export function getOperationalMovementGroupLines(
  movements: InventoryOperationalMovement[],
  movement: InventoryOperationalMovement | null,
) {
  if (!movement) {
    return [];
  }

  const movementGroupId = getOperationalMovementGroupId(movement);
  return movements.filter((item) => getOperationalMovementGroupId(item) === movementGroupId);
}

export function updateMovementGroupFromDraft({
  movements,
  movementId,
  draft,
  warehouses,
  stockRows,
}: {
  movements: InventoryOperationalMovement[];
  movementId: string;
  draft: InventoryMovementEditDraft;
  warehouses: InventoryWarehouse[];
  stockRows: InventoryStockRow[];
}) {
  const target = movements.find((movement) => movement.id === movementId);

  if (!target) {
    return movements;
  }

  const targetGroupId = getOperationalMovementGroupId(target);
  const targetLines = movements.filter((movement) => getOperationalMovementGroupId(movement) === targetGroupId);
  const sourceIsSupplier = isSupplierSource(draft.fromWarehouseId);
  const fromWarehouse = warehouses.find((warehouse) => warehouse.id === draft.fromWarehouseId);
  const toWarehouse = warehouses.find((warehouse) => warehouse.id === draft.toWarehouseId);
  const staticLocations = staticMovementLocationNames[draft.movementType] ?? {};
  const locationOwner = toWarehouse ?? fromWarehouse;

  return movements.map((movement) => {
    if (getOperationalMovementGroupId(movement) !== targetGroupId) {
      return movement;
    }

    const lineIndex = targetLines.findIndex((line) => line.id === movement.id);
    const draftItem = draft.items[lineIndex] ?? draft.items[0];
    const stockRow = stockRows.find((row) => row.productId === draftItem?.productId);

    return {
      ...movement,
      productId: stockRow?.productId ?? movement.productId,
      productName: stockRow?.name ?? movement.productName,
      productSku: stockRow?.sku ?? movement.productSku,
      productImageUrl: stockRow?.thumbnailUrl ?? movement.productImageUrl,
      productImageAlt: stockRow?.thumbnailAlt ?? movement.productImageAlt,
      variantLabel: stockRow?.type === 'Product' ? stockRow.category : movement.variantLabel,
      movementType: draft.movementType,
      quantity: draftItem ? getMovementSignedQuantity(draft.movementType, draftItem.quantity, draft.adjustmentDirection) : movement.quantity,
      unitCost: stockRow?.averageCost ?? movement.unitCost,
      fromWarehouseId: sourceIsSupplier ? undefined : fromWarehouse?.id ?? movement.fromWarehouseId,
      fromWarehouseName: sourceIsSupplier
        ? movement.supplierName ?? staticLocations.from ?? movement.fromWarehouseName
        : fromWarehouse?.name ?? staticLocations.from ?? movement.fromWarehouseName,
      toWarehouseId: toWarehouse?.id ?? movement.toWarehouseId,
      toWarehouseName: toWarehouse?.name ?? staticLocations.to ?? movement.toWarehouseName,
      businessUnitId: locationOwner?.businessUnitId ?? stockRow?.businessUnitId ?? movement.businessUnitId,
      businessUnitName: locationOwner?.businessUnitName ?? stockRow?.businessUnitName ?? movement.businessUnitName,
      businessId: locationOwner?.businessId ?? stockRow?.businessId ?? movement.businessId,
      businessName: locationOwner?.businessName ?? stockRow?.businessName ?? movement.businessName,
      reason: draft.reason,
      reference: draft.reference,
      movementDate: draft.date,
    };
  });
}
