import type { InventoryMetrics, InventoryMovement, InventoryStatus, InventoryStockItem } from '../types/inventoryTypes';

export function getInventoryMetrics(items: InventoryStockItem[], movements: InventoryMovement[]): InventoryMetrics {
  return {
    trackedItems: items.filter((item) => item.usesInventory).length,
    lowStockItems: items.filter((item) => item.status === 'lowStock').length,
    outOfStockItems: items.filter((item) => item.status === 'outOfStock').length,
    totalStockValue: items.reduce((total, item) => total + (item.usesInventory ? item.estimatedValue : 0), 0),
    recentMovements: movements.length,
  };
}

export function getInventoryStatusCounts(items: InventoryStockItem[]): Record<InventoryStatus, number> {
  return items.reduce<Record<InventoryStatus, number>>((counts, item) => {
    counts[item.status] += 1;
    return counts;
  }, {
    healthy: 0,
    lowStock: 0,
    outOfStock: 0,
    needsReview: 0,
    inactive: 0,
    notTracked: 0,
  });
}
