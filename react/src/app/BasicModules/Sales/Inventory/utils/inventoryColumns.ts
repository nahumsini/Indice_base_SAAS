import type { InventoryColumnId } from '../types/inventoryTypes';

export const defaultInventoryColumns: InventoryColumnId[] = [
  'item',
  'sku',
  'category',
  'location',
  'availableStock',
  'reservedStock',
  'minimumStock',
  'status',
  'estimatedValue',
  'lastMovement',
  'actions',
];

export const optionalInventoryColumns: InventoryColumnId[] = [
  'itemType',
  'unit',
  'averageCost',
  'usesInventory',
  'readyForPOS',
  'readyForSales',
];

export const allInventoryColumns: InventoryColumnId[] = [
  ...defaultInventoryColumns.filter((column) => column !== 'actions'),
  ...optionalInventoryColumns,
  'actions',
];
