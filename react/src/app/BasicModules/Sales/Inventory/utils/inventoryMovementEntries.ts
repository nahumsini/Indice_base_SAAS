import type {
  InventoryMovementEntryLine,
  InventoryMovementAttachment,
  InventoryMovementEntryType,
  InventoryOperationalMovement,
  InventoryStockRow,
  InventoryWarehouse,
} from '../types/inventoryTypes';
import { updateWarehouseDistribution } from './inventoryOperationalState';

export const SUPPLIER_SOURCE_ID = 'supplier-source';

export type InventoryMovementEntryDraft = {
  movementType: InventoryMovementEntryType;
  items: InventoryMovementEntryLine[];
  fromWarehouseId: string;
  toWarehouseId: string;
  reason: string;
  reference: string;
  date: string;
  supplierName?: string;
  attachments?: InventoryMovementAttachment[];
};

const movementPrefix: Record<InventoryMovementEntryType, string> = {
  supplierReceipt: 'REC',
  transfer: 'TRF',
  storeReplenishment: 'REP',
  sale: 'SAL',
  return: 'RET',
  adjustment: 'ADJ',
  writeOff: 'WOF',
};

const movementStatus: Record<InventoryMovementEntryType, InventoryOperationalMovement['status']> = {
  supplierReceipt: 'received',
  transfer: 'inTransit',
  storeReplenishment: 'inTransit',
  sale: 'completed',
  return: 'received',
  adjustment: 'draft',
  writeOff: 'completed',
};

const staticMovementLocations: Record<InventoryMovementEntryType, { from?: string; to?: string }> = {
  supplierReceipt: { from: 'Supplier' },
  transfer: {},
  storeReplenishment: {},
  sale: { to: 'Customer' },
  return: { from: 'Customer' },
  adjustment: { to: 'Inventory correction' },
  writeOff: { to: 'Write off' },
};

export function isSupplierSource(sourceId: string) {
  return sourceId === SUPPLIER_SOURCE_ID;
}

export function getMovementSignedQuantity(type: InventoryMovementEntryType, quantity: number) {
  return type === 'sale' || type === 'adjustment' || type === 'writeOff' ? -quantity : quantity;
}

export function applyMovementEntryToStockRows(
  rows: InventoryStockRow[],
  draft: InventoryMovementEntryDraft,
  fromWarehouse?: InventoryWarehouse,
  toWarehouse?: InventoryWarehouse,
) {
  return draft.items.reduce((nextRows, item) => {
    const row = nextRows.find((stockRow) => stockRow.productId === item.productId);
    if (!row) return nextRows;

    if (isSupplierSource(draft.fromWarehouseId)) {
      return toWarehouse ? updateWarehouseDistribution(nextRows, item.productId, toWarehouse, item.quantity) : nextRows;
    }

    if (draft.movementType === 'transfer' || draft.movementType === 'storeReplenishment') {
      if (!fromWarehouse || !toWarehouse) return nextRows;
      return updateWarehouseDistribution(updateWarehouseDistribution(nextRows, item.productId, fromWarehouse, -item.quantity), item.productId, toWarehouse, item.quantity);
    }

    if (draft.movementType === 'supplierReceipt' || draft.movementType === 'return') {
      return toWarehouse ? updateWarehouseDistribution(nextRows, item.productId, toWarehouse, item.quantity) : nextRows;
    }

    return fromWarehouse ? updateWarehouseDistribution(nextRows, item.productId, fromWarehouse, -item.quantity) : nextRows;
  }, rows);
}

export function createInventoryMovementEntries({
  draft,
  rows,
  currentLength,
  fromWarehouse,
  toWarehouse,
}: {
  draft: InventoryMovementEntryDraft;
  rows: InventoryStockRow[];
  currentLength: number;
  fromWarehouse?: InventoryWarehouse;
  toWarehouse?: InventoryWarehouse;
}) {
  const prefix = movementPrefix[draft.movementType];
  const groupSequence = String(1400 + currentLength).padStart(6, '0');
  const groupId = `${prefix}-${groupSequence}`;

  return draft.items.flatMap((item, index) => {
    const row = rows.find((stockRow) => stockRow.productId === item.productId);
    if (!row) return [];

    const staticLocations = staticMovementLocations[draft.movementType];
    const locationOwner = toWarehouse ?? fromWarehouse;
    const fromName = isSupplierSource(draft.fromWarehouseId) ? draft.supplierName || 'Supplier' : staticLocations.from ?? fromWarehouse?.name;

    return [{
      id: `${groupId}-L${String(index + 1).padStart(2, '0')}`,
      groupId,
      movementNumber: groupId,
      productId: row.productId,
      productName: row.name,
      productSku: row.sku,
      productImageUrl: row.thumbnailUrl,
      productImageAlt: row.thumbnailAlt,
      variantLabel: row.type === 'Product' ? row.category : undefined,
      movementType: draft.movementType,
      quantity: getMovementSignedQuantity(draft.movementType, item.quantity),
      unitCost: row.averageCost,
      fromWarehouseId: fromWarehouse?.id,
      fromWarehouseName: fromName,
      toWarehouseId: toWarehouse?.id,
      toWarehouseName: staticLocations.to ?? toWarehouse?.name,
      supplierName: draft.supplierName,
      attachments: draft.attachments,
      businessUnitId: locationOwner?.businessUnitId ?? row.businessUnitId,
      businessUnitName: locationOwner?.businessUnitName ?? row.businessUnitName,
      businessId: locationOwner?.businessId ?? row.businessId,
      businessName: locationOwner?.businessName ?? row.businessName,
      reason: draft.reason,
      reference: draft.reference,
      responsibleName: locationOwner?.responsibleName ?? 'Nahum Pena',
      movementDate: draft.date,
      status: movementStatus[draft.movementType],
    } satisfies InventoryOperationalMovement];
  });
}

export function reverseInventoryMovement(
  rows: InventoryStockRow[],
  movement: InventoryOperationalMovement,
  warehouses: InventoryWarehouse[],
) {
  const fromWarehouse = warehouses.find((warehouse) => warehouse.id === movement.fromWarehouseId);
  const toWarehouse = warehouses.find((warehouse) => warehouse.id === movement.toWarehouseId);
  const quantity = Math.abs(movement.quantity);

  if (fromWarehouse && toWarehouse) {
    return updateWarehouseDistribution(updateWarehouseDistribution(rows, movement.productId, fromWarehouse, quantity), movement.productId, toWarehouse, -quantity);
  }

  if (movement.quantity < 0 && fromWarehouse) {
    return updateWarehouseDistribution(rows, movement.productId, fromWarehouse, quantity);
  }

  if (movement.quantity > 0 && toWarehouse) {
    return updateWarehouseDistribution(rows, movement.productId, toWarehouse, -quantity);
  }

  return rows;
}
