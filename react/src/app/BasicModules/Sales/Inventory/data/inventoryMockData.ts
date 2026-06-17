import type { SalesCatalogItem } from '../../types';
import type {
  InventoryOperationalMovement,
  InventoryStockRow,
  InventoryWarehouse,
} from '../types/inventoryTypes';

export const initialInventoryWarehouses: InventoryWarehouse[] = [];

function buildEmptyInventoryStockRow(product: SalesCatalogItem): InventoryStockRow {
  return {
    id: `stock-${product.id}`,
    productId: product.id,
    name: product.name,
    sku: product.sku,
    category: product.category,
    type: product.type,
    description: product.description,
    thumbnailUrl: product.imageUrl,
    thumbnailAlt: product.imageAlt,
    averageCost: product.cost || Math.max(product.price * 0.45, 0),
    minimumStock: 0,
    distributions: [],
    usesInventory: false,
  };
}

export function buildInventoryStockRows(products: SalesCatalogItem[]): InventoryStockRow[] {
  return products.map(buildEmptyInventoryStockRow);
}

export function syncInventoryStockRows(products: SalesCatalogItem[], currentRows: InventoryStockRow[]): InventoryStockRow[] {
  const currentByProductId = new Map(currentRows.map((row) => [row.productId, row]));

  return products.map((product) => {
    const baseRow = buildEmptyInventoryStockRow(product);
    const currentRow = currentByProductId.get(product.id);

    if (!currentRow) return baseRow;

    return {
      ...baseRow,
      averageCost: product.cost || currentRow.averageCost || baseRow.averageCost,
      minimumStock: currentRow.minimumStock,
      distributions: currentRow.distributions,
      businessUnitId: currentRow.businessUnitId,
      businessUnitName: currentRow.businessUnitName,
      businessId: currentRow.businessId,
      businessName: currentRow.businessName,
      usesInventory: currentRow.usesInventory || currentRow.distributions.length > 0,
      lastMovementAt: currentRow.lastMovementAt,
    };
  });
}

export function buildInitialInventoryMovements(): InventoryOperationalMovement[] {
  return [];
}
