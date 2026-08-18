import type { InventoryWarehouse } from '../../Inventory/types/inventoryTypes';

function isDatabaseId(value?: string) {
  return /^\d+$/.test(value?.trim() ?? '');
}

export function isSalesWarehouseReady(warehouse?: InventoryWarehouse | null): warehouse is InventoryWarehouse {
  return Boolean(
    warehouse
    && warehouse.status === 'active'
    && isDatabaseId(warehouse.id)
    && isDatabaseId(warehouse.businessUnitId)
    && warehouse.businessUnitName?.trim()
    && isDatabaseId(warehouse.businessId)
    && warehouse.businessName?.trim(),
  );
}

export function getSalesWarehouseScope(warehouse?: InventoryWarehouse | null) {
  if (!isSalesWarehouseReady(warehouse)) {
    return {
      businessUnitId: '',
      businessUnitName: '',
      businessId: '',
      businessName: '',
    };
  }

  return {
    businessUnitId: warehouse.businessUnitId ?? '',
    businessUnitName: warehouse.businessUnitName ?? '',
    businessId: warehouse.businessId ?? '',
    businessName: warehouse.businessName ?? '',
  };
}

export function warehouseMatchesSaleScope(
  warehouse: InventoryWarehouse | undefined,
  sale: {
    warehouseId?: string;
    businessUnitId?: string;
    businessId?: string;
  },
) {
  return isSalesWarehouseReady(warehouse)
    && warehouse.id === sale.warehouseId
    && warehouse.businessUnitId === sale.businessUnitId
    && warehouse.businessId === sale.businessId;
}
