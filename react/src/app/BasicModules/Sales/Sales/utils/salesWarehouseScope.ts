import type { InventoryWarehouse } from '../../Inventory/types/inventoryTypes';
import type { SaleRecordDraft } from '../types/salesTypes';

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

// Late catalog loads must fill only missing scope, never reset quote lines, payment or wizard progress.
export function hydrateSaleWarehouse(draft: SaleRecordDraft, warehouses: InventoryWarehouse[]): SaleRecordDraft {
  if (draft.warehouseId) return draft;
  const warehouse = warehouses.find(isSalesWarehouseReady);
  if (!warehouse) return draft;
  const scope = getSalesWarehouseScope(warehouse);
  return {
    ...draft,
    ...scope,
    warehouseId: warehouse.id,
    warehouseName: warehouse.name,
    saleLines: draft.saleLines.map((line) => ({
      ...line,
      warehouseId: warehouse.id,
      businessUnitId: scope.businessUnitId,
      businessId: scope.businessId,
    })),
  };
}
