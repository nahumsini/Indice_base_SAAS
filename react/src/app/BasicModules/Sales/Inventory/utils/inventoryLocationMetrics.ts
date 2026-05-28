import type { InventoryLocation, InventoryStockItem } from '../types/inventoryTypes';

export function getLocationStockSummary(location: InventoryLocation, stockItems: InventoryStockItem[]) {
  const items = stockItems.filter((item) => item.locationId === location.id);
  const movementDates = items
    .map((item) => item.lastMovementAt)
    .filter(Boolean)
    .sort();

  return {
    trackedSkus: items.filter((item) => item.usesInventory).length,
    estimatedValue: items.reduce((total, item) => total + item.estimatedValue, 0),
    lastMovement: movementDates[movementDates.length - 1],
  };
}
