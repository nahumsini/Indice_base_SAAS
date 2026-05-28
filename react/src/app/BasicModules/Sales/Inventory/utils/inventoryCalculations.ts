import type {
  InventoryKpiMetrics,
  InventoryMovementMetrics,
  InventoryOperationalMovement,
  InventoryStockHealth,
  InventoryStockRow,
  InventoryWarehouse,
  InventoryWarehouseMetrics,
} from '../types/inventoryTypes';

export function getStockTotals(row: InventoryStockRow) {
  const available = row.distributions.reduce((total, distribution) => total + distribution.available, 0);
  const reserved = row.distributions.reduce((total, distribution) => total + distribution.reserved, 0);
  const totalStock = available + reserved;

  return {
    available,
    reserved,
    totalStock,
    estimatedValue: available * row.averageCost,
  };
}

export function getStockHealth(row: InventoryStockRow): InventoryStockHealth {
  if (!row.usesInventory) return 'inactive';

  const totals = getStockTotals(row);
  if (totals.available <= 0) return 'outOfStock';
  if (totals.available <= row.minimumStock) return 'lowStock';
  if (row.distributions.length === 0) return 'needsReview';
  return 'healthy';
}

export function getDistributionHealth(available: number, minimum: number): InventoryStockHealth {
  if (available <= 0) return 'outOfStock';
  if (available <= minimum) return 'lowStock';
  return 'healthy';
}

export function getWarehouseInventoryEntries(warehouseId: string, rows: InventoryStockRow[]) {
  return rows
    .map((row) => {
      const distribution = row.distributions.find((item) => item.warehouseId === warehouseId);

      if (!distribution) {
        return null;
      }

      return {
        row,
        distribution,
        health: getDistributionHealth(distribution.available, distribution.minimum),
        totalUnits: distribution.available + distribution.reserved,
        estimatedValue: distribution.available * row.averageCost,
      };
    })
    .filter((item): item is NonNullable<typeof item> => Boolean(item))
    .filter((item) => item.totalUnits > 0 || item.distribution.minimum > 0);
}

export function getWarehouseInventorySummary(warehouse: InventoryWarehouse, rows: InventoryStockRow[]) {
  const entries = getWarehouseInventoryEntries(warehouse.id, rows);
  const totalUnits = entries.reduce((total, item) => total + item.totalUnits, 0);
  const estimatedValue = entries.reduce((total, item) => total + item.estimatedValue, 0);
  const hasAttention = entries.some((item) => item.health !== 'healthy');

  return {
    storedItems: entries.filter((item) => item.distribution.available > 0 || item.distribution.reserved > 0).length,
    totalUnits,
    estimatedValue,
    stockHealth: warehouse.status === 'inactive' ? 'inactive' as const : hasAttention ? 'needsReview' as const : 'healthy' as const,
    lastMovement: warehouse.lastMovementAt ?? rows.find((row) => row.distributions.some((distribution) => distribution.warehouseId === warehouse.id))?.lastMovementAt,
  };
}

export function getStockMetrics(rows: InventoryStockRow[]): InventoryKpiMetrics {
  return rows.reduce<InventoryKpiMetrics>((metrics, row) => {
    const totals = getStockTotals(row);
    const health = getStockHealth(row);

    return {
      totalItems: metrics.totalItems + 1,
      totalUnits: metrics.totalUnits + totals.totalStock,
      lowStockItems: metrics.lowStockItems + (health === 'lowStock' ? 1 : 0),
      outOfStockItems: metrics.outOfStockItems + (health === 'outOfStock' ? 1 : 0),
      estimatedValue: metrics.estimatedValue + totals.estimatedValue,
    };
  }, {
    totalItems: 0,
    totalUnits: 0,
    lowStockItems: 0,
    outOfStockItems: 0,
    estimatedValue: 0,
  });
}

export function getWarehouseMetrics(warehouses: InventoryWarehouse[], rows: InventoryStockRow[]): InventoryWarehouseMetrics {
  const activeWarehouses = warehouses.filter((warehouse) => warehouse.status === 'active');
  const attentionWarehouses = activeWarehouses.filter((warehouse) => getWarehouseInventorySummary(warehouse, rows).stockHealth !== 'healthy');

  return {
    activeWarehouses: activeWarehouses.length,
    storedItems: activeWarehouses.reduce((total, warehouse) => total + getWarehouseInventorySummary(warehouse, rows).storedItems, 0),
    totalUnits: activeWarehouses.reduce((total, warehouse) => total + getWarehouseInventorySummary(warehouse, rows).totalUnits, 0),
    attentionWarehouses: attentionWarehouses.length,
    estimatedValue: activeWarehouses.reduce((total, warehouse) => total + getWarehouseInventorySummary(warehouse, rows).estimatedValue, 0),
  };
}

export function getMovementMetrics(movements: InventoryOperationalMovement[]): InventoryMovementMetrics {
  const groupedMovements = Array.from(new Map(movements.map((movement) => [movement.groupId ?? movement.id, movement])).values());
  const inTransitMovements = movements.filter((movement) => movement.status === 'inTransit');
  const inTransitGroups = groupedMovements.filter((movement) => movement.status === 'inTransit');

  return {
    totalMovements: groupedMovements.length,
    supplierReceipts: groupedMovements.filter((movement) => movement.movementType === 'supplierReceipt' || movement.movementType === 'stockIn').length,
    transfers: groupedMovements.filter((movement) => movement.movementType === 'transfer').length,
    adjustments: groupedMovements.filter((movement) => movement.movementType === 'adjustment' || movement.movementType === 'writeOff').length,
    inTransit: inTransitGroups.length,
    completed: groupedMovements.filter((movement) => movement.status === 'completed' || movement.status === 'received').length,
    inventoryValueInTransit: inTransitMovements.reduce((total, movement) => total + Math.abs(movement.quantity) * (movement.unitCost ?? 0), 0),
    drafts: groupedMovements.filter((movement) => movement.status === 'draft').length,
    entries: groupedMovements.filter((movement) => movement.movementType === 'supplierReceipt' || movement.movementType === 'stockIn').length,
  };
}
