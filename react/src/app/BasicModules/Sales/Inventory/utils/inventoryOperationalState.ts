import type {
  InventoryOperationalColumnId,
  InventoryOperationalFiltersState,
  InventoryOperationalMovementFiltersState,
  InventoryStockRow,
  InventoryWarehouse,
  InventoryWarehouseFiltersState,
} from '../types/inventoryTypes';

export const defaultOperationalColumns: InventoryOperationalColumnId[] = [
  'selection',
  'photo',
  'product',
  'sku',
  'category',
  'type',
  'totalStock',
  'available',
  'reserved',
  'minimum',
  'status',
  'warehouseDistribution',
  'estimatedValue',
  'lastMovement',
  'actions',
];

export const defaultStockFilters: InventoryOperationalFiltersState = {
  search: '',
  category: 'all',
  itemType: 'all',
  warehouseId: 'all',
  status: 'all',
  businessUnitId: 'all',
  businessId: 'all',
  tracking: 'all',
};

export const defaultWarehouseFilters: InventoryWarehouseFiltersState = {
  search: '',
  type: 'all',
  businessUnitId: 'all',
  businessId: 'all',
  status: 'all',
  stockHealth: 'all',
};

export const defaultMovementFilters: InventoryOperationalMovementFiltersState = {
  search: '',
  movementType: 'all',
  productId: 'all',
  fromWarehouseId: 'all',
  toWarehouseId: 'all',
  businessUnitId: 'all',
  businessId: 'all',
  responsible: '',
  status: 'all',
  dateFrom: '',
  dateTo: '',
};

export function createMovementId(length: number) {
  return `mov-${String(length + 1).padStart(3, '0')}`;
}

export function normalizeInventoryText(value: string | undefined) {
  return (value ?? '').trim().toLowerCase();
}

export function updateWarehouseDistribution(rows: InventoryStockRow[], productId: string, warehouse: InventoryWarehouse, quantity: number) {
  return rows.map((row) => {
    if (row.productId !== productId) return row;

    const hasDistribution = row.distributions.some((distribution) => distribution.warehouseId === warehouse.id);
    const distributions = hasDistribution
      ? row.distributions.map((distribution) => (
        distribution.warehouseId === warehouse.id
          ? { ...distribution, available: Math.max(distribution.available + quantity, 0) }
          : distribution
      ))
      : [...row.distributions, { warehouseId: warehouse.id, warehouseName: warehouse.name, available: Math.max(quantity, 0), reserved: 0, minimum: 2 }];

    return {
      ...row,
      distributions,
      minimumStock: distributions.length > 0 ? Math.max(row.minimumStock, 2) : row.minimumStock,
      businessUnitId: warehouse.businessUnitId ?? row.businessUnitId,
      businessUnitName: warehouse.businessUnitName ?? row.businessUnitName,
      businessId: warehouse.businessId ?? row.businessId,
      businessName: warehouse.businessName ?? row.businessName,
      usesInventory: true,
      lastMovementAt: new Date().toISOString().slice(0, 10),
    };
  });
}
