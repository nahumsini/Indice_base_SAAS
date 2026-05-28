import { useMemo } from 'react';
import type { InventoryMovement, InventoryStockItem } from '../types/inventoryTypes';
import { getInventoryMetrics, getInventoryStatusCounts } from '../utils/inventoryMetrics';

export function useInventoryMetrics(items: InventoryStockItem[], movements: InventoryMovement[]) {
  return useMemo(() => ({
    metrics: getInventoryMetrics(items, movements),
    statusCounts: getInventoryStatusCounts(items),
  }), [items, movements]);
}
