import type { SalesCatalogItem } from '../../types';
import type { InventoryMovement, InventoryStockItem } from '../types/inventoryTypes';
import { initialInventoryLocations } from './inventoryLocationMocks';
import { getInventoryStatus } from '../utils/inventoryStatus';

export const inventoryLocations = initialInventoryLocations;

const stockBlueprints: Record<string, { available: number; reserved: number; minimum: number; locationId: string }> = {
  'PRD-003': { available: 2, reserved: 0, minimum: 1, locationId: 'loc-corporate-sample' },
  'PRD-004': { available: 4, reserved: 1, minimum: 6, locationId: 'loc-cancun-main' },
  'PRD-005': { available: 0, reserved: 0, minimum: 3, locationId: 'loc-vergel-cleaning' },
};

function getLocation(locationId: string) {
  return inventoryLocations.find((location) => location.id === locationId) ?? inventoryLocations[0];
}

export function buildInventoryStockFromProducts(products: SalesCatalogItem[]): InventoryStockItem[] {
  return products.map((product, index) => {
    const usesInventory = Boolean(product.stockPrepared || product.warehousePrepared);
    const defaultLocationId = usesInventory ? inventoryLocations[index % 5].id : 'loc-online-stock';
    const blueprint = stockBlueprints[product.id] ?? {
      available: usesInventory ? 12 + (index * 3) : 0,
      reserved: usesInventory ? index % 2 : 0,
      minimum: usesInventory ? 5 : 0,
      locationId: defaultLocationId,
    };
    const location = getLocation(blueprint.locationId);
    const averageCost = product.cost || Math.max(product.price * 0.45, 0);
    const status = getInventoryStatus({
      usesInventory,
      availableStock: blueprint.available,
      minimumStock: blueprint.minimum,
    });

    return {
      id: `inv-${product.id}`,
      productId: product.id,
      name: product.name,
      sku: product.sku,
      type: product.type,
      category: product.category,
      description: product.description,
      thumbnailUrl: product.imageUrl,
      thumbnailAlt: product.imageAlt,
      locationId: location.id,
      locationName: location.name,
      locationCode: location.code,
      locationType: location.type,
      scopeType: location.scopeType,
      businessUnitId: location.businessUnitId,
      businessUnitName: location.businessUnitName,
      businessId: location.businessId,
      businessName: location.businessName,
      availableStock: blueprint.available,
      reservedStock: blueprint.reserved,
      minimumStock: blueprint.minimum,
      unit: product.packaging?.baseUnit ?? (product.type === 'Service' ? 'Service' : 'Unit'),
      averageCost,
      estimatedValue: usesInventory ? blueprint.available * averageCost : 0,
      usesInventory,
      readyForSales: product.status === 'Active' && product.visibility !== 'Internal',
      readyForPOS: product.posPrepared || product.visibility === 'POS ready',
      lastMovementAt: usesInventory ? ['2026-05-27', '2026-05-25', '2026-05-21'][index % 3] : undefined,
      status,
      isPackage: product.type === 'Package',
    };
  });
}

export const initialInventoryMovements: InventoryMovement[] = [
  {
    id: 'mov-001',
    productId: 'PRD-004',
    productName: 'POS Enablement Kit',
    movementType: 'stockOut',
    sourceLocationId: 'loc-cancun-main',
    sourceLocationName: 'Cancun main warehouse',
    quantity: 2,
    reason: 'Demo kit assigned to sales floor',
    notes: 'Initial stock movement sample.',
    responsibleUserId: 'USR-0002',
    responsibleName: 'Nahum Pena',
    movementDate: '2026-05-27',
    status: 'recorded',
  },
  {
    id: 'mov-002',
    productId: 'PRD-005',
    productName: 'Implementation Field Pack',
    movementType: 'adjustment',
    sourceLocationId: 'loc-vergel-cleaning',
    sourceLocationName: 'Vergel cleaning supplies storage',
    quantity: 0,
    reason: 'Initial stock review',
    notes: 'Marked as out of stock during stock review.',
    responsibleUserId: 'USR-0004',
    responsibleName: 'Diana Cruz',
    movementDate: '2026-05-25',
    status: 'recorded',
  },
  {
    id: 'mov-003',
    productId: 'PRD-004',
    productName: 'POS Enablement Kit',
    movementType: 'stockIn',
    destinationLocationId: 'loc-cancun-main',
    destinationLocationName: 'Cancun main warehouse',
    quantity: 6,
    unitCost: 8100,
    reason: 'Opening balance',
    responsibleUserId: 'USR-0003',
    responsibleName: 'Ventas Norte',
    movementDate: '2026-05-21',
    status: 'recorded',
  },
];
