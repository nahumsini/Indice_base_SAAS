import type { SalesCatalogItem } from '../../types';
import type {
  InventoryOperationalMovement,
  InventoryStockRow,
  InventoryWarehouse,
  InventoryWarehouseDistribution,
} from '../types/inventoryTypes';

export const initialInventoryWarehouses: InventoryWarehouse[] = [
  {
    id: 'wh-corporate-office',
    name: 'Corporate Office',
    type: 'corporateWarehouse',
    businessUnitId: 'bu-corporate',
    businessUnitName: 'Corporate Office',
    jurisdiction: 'Monterrey, MX',
    responsibleName: 'Nahum Pena',
    addressNote: 'Main company warehouse',
    status: 'active',
    lastMovementAt: '2026-05-27',
  },
  {
    id: 'wh-cancun-store',
    name: 'Cancun Store',
    type: 'businessUnitWarehouse',
    businessUnitId: 'bu-cancun',
    businessUnitName: 'Cancun',
    businessId: 'biz-cancun-hq',
    businessName: 'Cancun headquarters',
    jurisdiction: 'Cancun, MX',
    responsibleName: 'Ventas Norte',
    addressNote: 'Store stock and pickup area',
    status: 'active',
    lastMovementAt: '2026-05-26',
  },
  {
    id: 'wh-vergel-heroes',
    name: 'Vergel Heroes',
    type: 'businessWarehouse',
    businessUnitId: 'bu-monterrey',
    businessUnitName: 'Monterrey',
    businessId: 'biz-vergel',
    businessName: 'Vergel Heroes',
    jurisdiction: 'Monterrey, MX',
    responsibleName: 'Ana Lopez',
    addressNote: 'Operations stock room',
    status: 'active',
    lastMovementAt: '2026-05-25',
  },
  {
    id: 'wh-linda-vista',
    name: 'Linda Vista',
    type: 'businessWarehouse',
    businessUnitId: 'bu-monterrey',
    businessUnitName: 'Monterrey',
    businessId: 'biz-linda-vista',
    businessName: 'Linda Vista',
    jurisdiction: 'Monterrey, MX',
    responsibleName: 'Diana Cruz',
    addressNote: 'Apartment supplies storage',
    status: 'active',
    lastMovementAt: '2026-05-21',
  },
];

const distributionSeeds = [
  [25, 12, 6, 0],
  [8, 4, 2, 1],
  [0, 0, 0, 0],
  [15, 3, 0, 2],
  [5, 1, 1, 0],
];

function buildDistribution(productIndex: number, warehouses: InventoryWarehouse[]): InventoryWarehouseDistribution[] {
  const seed = distributionSeeds[productIndex % distributionSeeds.length];

  return warehouses.filter((warehouse) => warehouse.status === 'active').map((warehouse, index) => ({
    warehouseId: warehouse.id,
    warehouseName: warehouse.name,
    available: seed[index % seed.length],
    reserved: seed[index % seed.length] > 3 ? index % 2 : 0,
    minimum: index === 0 ? 5 : 2,
  }));
}

export function buildInventoryStockRows(products: SalesCatalogItem[], warehouses: InventoryWarehouse[]): InventoryStockRow[] {
  return products.map((product, index) => {
    const usesInventory = Boolean(product.stockPrepared || product.warehousePrepared || product.type === 'Product' || product.type === 'Package');
    const distributions = usesInventory ? buildDistribution(index, warehouses) : [];
    const primaryWarehouse = warehouses[index % Math.max(warehouses.length, 1)];

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
      minimumStock: usesInventory ? 5 : 0,
      distributions,
      businessUnitId: primaryWarehouse?.businessUnitId,
      businessUnitName: primaryWarehouse?.businessUnitName,
      businessId: primaryWarehouse?.businessId,
      businessName: primaryWarehouse?.businessName,
      usesInventory,
      lastMovementAt: usesInventory ? ['2026-05-27', '2026-05-25', '2026-05-21'][index % 3] : undefined,
    };
  });
}

export function buildInitialInventoryMovements(rows: InventoryStockRow[], warehouses: InventoryWarehouse[]): InventoryOperationalMovement[] {
  const [corporateWarehouse, cancunStore, vergelStore, lindaVistaStore] = warehouses;
  const movementBlueprints = [
    {
      prefix: 'REC',
      type: 'supplierReceipt' as const,
      from: 'Samsung Supplier',
      to: corporateWarehouse?.name,
      toId: corporateWarehouse?.id,
      status: 'received' as const,
      reference: 'PO-10045',
      reason: 'Supplier receipt for electronics floor.',
      quantity: 25,
    },
    {
      prefix: 'TRF',
      type: 'transfer' as const,
      from: corporateWarehouse?.name,
      fromId: corporateWarehouse?.id,
      to: cancunStore?.name,
      toId: cancunStore?.id,
      status: 'inTransit' as const,
      reference: 'TRF-00012',
      reason: 'Regional replenishment for Cancun store.',
      quantity: 12,
    },
    {
      prefix: 'REP',
      type: 'storeReplenishment' as const,
      from: corporateWarehouse?.name,
      fromId: corporateWarehouse?.id,
      to: vergelStore?.name,
      toId: vergelStore?.id,
      status: 'completed' as const,
      reference: 'REP-00044',
      reason: 'Store shelf replenishment.',
      quantity: 8,
    },
    {
      prefix: 'SAL',
      type: 'sale' as const,
      from: lindaVistaStore?.name,
      fromId: lindaVistaStore?.id,
      to: 'Customer',
      status: 'completed' as const,
      reference: 'INV-55321',
      reason: 'POS sale completed.',
      quantity: -3,
    },
    {
      prefix: 'RET',
      type: 'return' as const,
      from: 'Customer',
      to: cancunStore?.name,
      toId: cancunStore?.id,
      status: 'received' as const,
      reference: 'RET-00108',
      reason: 'Customer return received.',
      quantity: 2,
    },
    {
      prefix: 'ADJ',
      type: 'adjustment' as const,
      from: 'System',
      to: 'Inventory correction',
      status: 'draft' as const,
      reference: 'ADJ-00031',
      reason: 'Cycle count variance pending review.',
      quantity: -1,
    },
    {
      prefix: 'WOF',
      type: 'writeOff' as const,
      from: 'Damaged stock',
      to: 'Write off',
      status: 'completed' as const,
      reference: 'WOF-00018',
      reason: 'Damaged item removed from sellable stock.',
      quantity: -4,
    },
  ];

  return rows.slice(0, 7).map((row, index) => {
    const blueprint = movementBlueprints[index % movementBlueprints.length];

    return {
    id: blueprint.prefix + `-${String(1241 + index).padStart(6, '0')}`,
    movementNumber: blueprint.prefix + `-${String(1241 + index).padStart(6, '0')}`,
    productId: row.productId,
    productName: row.name,
    productSku: row.sku,
    productImageUrl: row.thumbnailUrl,
    productImageAlt: row.thumbnailAlt,
    variantLabel: row.type === 'Product' ? row.category : undefined,
    movementType: blueprint.type,
    quantity: blueprint.quantity,
    unitCost: row.averageCost,
    fromWarehouseId: blueprint.fromId,
    fromWarehouseName: blueprint.from,
    toWarehouseId: blueprint.toId,
    toWarehouseName: blueprint.to,
    businessUnitId: row.businessUnitId,
    businessUnitName: row.businessUnitName,
    businessId: row.businessId,
    businessName: row.businessName,
    reason: blueprint.reason,
    reference: blueprint.reference,
    responsibleName: index % 2 === 0 ? 'Nahum Pena' : 'Ventas Norte',
    movementDate: ['2026-05-28', '2026-05-28', '2026-05-27', '2026-05-27', '2026-05-26', '2026-05-25', '2026-05-24'][index],
    status: blueprint.status,
  };
  });
}
