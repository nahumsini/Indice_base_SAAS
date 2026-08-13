import { salesApi } from '../../salesApi';
import type { SalesCatalogItem } from '../../types';
import type {
  InventoryOperationalMovement,
  InventoryStockRow,
  InventoryWarehouse,
  InventoryWarehouseDistribution,
} from '../types/inventoryTypes';
import { buildInventoryStockRows, syncInventoryStockRows } from '../data/inventoryMockData';

type ApiInventoryWarehouse = {
  id?: number | string;
  warehouseCode?: string;
  name?: string;
  type?: InventoryWarehouse['type'];
  businessUnitId?: string;
  businessUnitName?: string;
  businessId?: string;
  businessName?: string;
  jurisdiction?: string;
  responsibleUserId?: string;
  responsibleName?: string;
  addressNote?: string;
  status?: InventoryWarehouse['status'];
  lastMovementAt?: string;
};

type ApiInventoryBalance = {
  id?: number | string;
  productId?: number | string;
  warehouseId?: number | string;
  warehouseName?: string;
  availableQuantity?: number | string;
  reservedQuantity?: number | string;
  minimumQuantity?: number | string;
  unitCost?: number | string;
  usesInventory?: boolean;
  businessUnitId?: string;
  businessUnitName?: string;
  businessId?: string;
  businessName?: string;
  lastMovementAt?: string;
};

type ApiInventoryMovement = {
  id?: number | string;
  movementNumber?: string;
  groupId?: string;
  productId?: number | string;
  productName?: string;
  productSku?: string;
  productImageUrl?: string;
  productImageAlt?: string;
  variantLabel?: string;
  movementType?: InventoryOperationalMovement['movementType'];
  quantity?: number | string;
  unitCost?: number | string;
  fromWarehouseId?: number | string;
  fromWarehouseName?: string;
  toWarehouseId?: number | string;
  toWarehouseName?: string;
  supplierName?: string;
  businessUnitId?: string;
  businessUnitName?: string;
  businessId?: string;
  businessName?: string;
  reason?: string;
  reference?: string;
  responsibleName?: string;
  movementDate?: string;
  status?: InventoryOperationalMovement['status'];
  attachments?: InventoryOperationalMovement['attachments'];
};

const isDatabaseId = (value: string | number | undefined | null) => (
  value !== undefined && value !== null && /^\d+$/.test(String(value))
);

const toNumber = (value: number | string | undefined | null) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const toId = (value: number | string | undefined | null) => String(value ?? '');

function toWarehouse(row: ApiInventoryWarehouse): InventoryWarehouse {
  return {
    id: toId(row.id),
    name: row.name ?? 'Warehouse',
    type: row.type ?? 'businessWarehouse',
    businessUnitId: row.businessUnitId,
    businessUnitName: row.businessUnitName,
    businessId: row.businessId,
    businessName: row.businessName,
    jurisdiction: row.jurisdiction ?? '',
    responsibleUserId: row.responsibleUserId,
    responsibleName: row.responsibleName ?? '',
    addressNote: row.addressNote,
    status: row.status ?? 'active',
    lastMovementAt: row.lastMovementAt,
  };
}

function toWarehousePayload(warehouse: InventoryWarehouse) {
  return {
    name: warehouse.name,
    type: warehouse.type,
    businessUnitId: warehouse.businessUnitId,
    businessUnitName: warehouse.businessUnitName,
    businessId: isDatabaseId(warehouse.businessId) ? warehouse.businessId : undefined,
    businessName: warehouse.businessName,
    jurisdiction: warehouse.jurisdiction,
    responsibleUserId: warehouse.responsibleUserId,
    responsibleName: warehouse.responsibleName,
    addressNote: warehouse.addressNote,
    status: warehouse.status,
    lastMovementAt: warehouse.lastMovementAt,
  };
}

function toDistribution(row: ApiInventoryBalance): InventoryWarehouseDistribution {
  return {
    balanceId: toId(row.id),
    warehouseId: toId(row.warehouseId),
    warehouseName: row.warehouseName ?? 'Warehouse',
    available: toNumber(row.availableQuantity),
    reserved: toNumber(row.reservedQuantity),
    minimum: toNumber(row.minimumQuantity),
  };
}

function applyBalancesToRows(products: SalesCatalogItem[], balances: ApiInventoryBalance[]) {
  const rows = buildInventoryStockRows(products);
  const rowsByProductId = new Map(rows.map((row) => [row.productId, row]));

  balances.forEach((balance) => {
    const productId = toId(balance.productId);
    const row = rowsByProductId.get(productId);
    if (!row) return;

    row.distributions.push(toDistribution(balance));
    row.minimumStock = Math.max(row.minimumStock, toNumber(balance.minimumQuantity));
    row.averageCost = toNumber(balance.unitCost) || row.averageCost;
    row.businessUnitId = balance.businessUnitId ?? row.businessUnitId;
    row.businessUnitName = balance.businessUnitName ?? row.businessUnitName;
    row.businessId = balance.businessId ?? row.businessId;
    row.businessName = balance.businessName ?? row.businessName;
    row.usesInventory = Boolean(balance.usesInventory) || row.distributions.length > 0;
    row.lastMovementAt = balance.lastMovementAt ?? row.lastMovementAt;
  });

  return rows;
}

function toMovement(row: ApiInventoryMovement): InventoryOperationalMovement {
  return {
    id: toId(row.id),
    groupId: row.groupId,
    movementNumber: row.movementNumber,
    productId: toId(row.productId),
    productName: row.productName ?? 'Inventory item',
    productSku: row.productSku,
    productImageUrl: row.productImageUrl,
    productImageAlt: row.productImageAlt,
    variantLabel: row.variantLabel,
    movementType: row.movementType ?? 'supplierReceipt',
    quantity: toNumber(row.quantity),
    unitCost: row.unitCost === undefined ? undefined : toNumber(row.unitCost),
    fromWarehouseId: row.fromWarehouseId === undefined || row.fromWarehouseId === null ? undefined : toId(row.fromWarehouseId),
    fromWarehouseName: row.fromWarehouseName,
    toWarehouseId: row.toWarehouseId === undefined || row.toWarehouseId === null ? undefined : toId(row.toWarehouseId),
    toWarehouseName: row.toWarehouseName,
    supplierName: row.supplierName,
    attachments: row.attachments,
    businessUnitId: row.businessUnitId,
    businessUnitName: row.businessUnitName,
    businessId: row.businessId,
    businessName: row.businessName,
    reason: row.reason ?? '',
    reference: row.reference,
    responsibleName: row.responsibleName ?? '',
    movementDate: row.movementDate ?? new Date().toISOString().slice(0, 10),
    status: row.status ?? 'draft',
  };
}

function toBalancePayload(row: InventoryStockRow, distribution: InventoryWarehouseDistribution) {
  return {
    productId: row.productId,
    warehouseId: distribution.warehouseId,
    warehouseName: distribution.warehouseName,
    availableQuantity: distribution.available,
    reservedQuantity: distribution.reserved,
    minimumQuantity: distribution.minimum,
    unitCost: row.averageCost,
    usesInventory: row.usesInventory || row.distributions.length > 0,
    businessUnitId: row.businessUnitId,
    businessUnitName: row.businessUnitName,
    businessId: row.businessId,
    businessName: row.businessName,
    lastMovementAt: row.lastMovementAt,
  };
}

function toMovementPayload(movement: InventoryOperationalMovement) {
  return {
    movementNumber: movement.movementNumber,
    groupId: movement.groupId,
    productId: isDatabaseId(movement.productId) ? movement.productId : undefined,
    productName: movement.productName,
    productSku: movement.productSku,
    productImageUrl: movement.productImageUrl,
    productImageAlt: movement.productImageAlt,
    variantLabel: movement.variantLabel,
    movementType: movement.movementType,
    quantity: movement.quantity,
    unitCost: movement.unitCost,
    fromWarehouseId: isDatabaseId(movement.fromWarehouseId) ? movement.fromWarehouseId : undefined,
    fromWarehouseName: movement.fromWarehouseName,
    toWarehouseId: isDatabaseId(movement.toWarehouseId) ? movement.toWarehouseId : undefined,
    toWarehouseName: movement.toWarehouseName,
    supplierName: movement.supplierName,
    businessUnitId: movement.businessUnitId,
    businessUnitName: movement.businessUnitName,
    businessId: movement.businessId,
    businessName: movement.businessName,
    reason: movement.reason,
    reference: movement.reference,
    responsibleName: movement.responsibleName,
    movementDate: movement.movementDate,
    status: movement.status,
    attachments: movement.attachments,
  };
}

export const inventoryApi = {
  async loadWarehouses() {
    const response = await salesApi.list<ApiInventoryWarehouse>('inventory-warehouses');
    return response.items.map(toWarehouse);
  },

  async loadWorkspace(products: SalesCatalogItem[]) {
    const [warehousesResponse, balancesResponse, movementsResponse] = await Promise.all([
      salesApi.list<ApiInventoryWarehouse>('inventory-warehouses'),
      salesApi.list<ApiInventoryBalance>('inventory-balances'),
      salesApi.list<ApiInventoryMovement>('inventory-movements'),
    ]);

    const warehouses = warehousesResponse.items.map(toWarehouse);
    const warehouseIds = new Set(warehouses.map((warehouse) => warehouse.id));
    const activeBalances = balancesResponse.items.filter((balance) => warehouseIds.has(toId(balance.warehouseId)));
    const stockRows = applyBalancesToRows(products, activeBalances);
    const movements = movementsResponse.items.map(toMovement);

    return { warehouses, stockRows, movements };
  },

  buildRowsFromExisting(products: SalesCatalogItem[], currentRows: InventoryStockRow[]) {
    return syncInventoryStockRows(products, currentRows);
  },

  async createWarehouse(warehouse: InventoryWarehouse) {
    const row = await salesApi.create<ApiInventoryWarehouse>('inventory-warehouses', toWarehousePayload(warehouse));
    return toWarehouse(row);
  },

  async updateWarehouse(warehouse: InventoryWarehouse) {
    if (!isDatabaseId(warehouse.id)) return warehouse;
    const row = await salesApi.update<ApiInventoryWarehouse>('inventory-warehouses', warehouse.id, toWarehousePayload(warehouse));
    return toWarehouse(row);
  },

  async deleteWarehouse(warehouseId: string) {
    if (!isDatabaseId(warehouseId)) return;
    await salesApi.delete('inventory-warehouses', warehouseId);
  },

  async persistStockRows(rows: InventoryStockRow[]) {
    const balanceResults = await Promise.all(rows.flatMap((row) => (
      isDatabaseId(row.productId)
        ? row.distributions
          .filter((distribution) => isDatabaseId(distribution.warehouseId))
          .map(async (distribution) => {
            const payload = toBalancePayload(row, distribution);
            const response = distribution.balanceId && isDatabaseId(distribution.balanceId)
              ? await salesApi.update<ApiInventoryBalance>('inventory-balances', distribution.balanceId, payload)
              : await salesApi.create<ApiInventoryBalance>('inventory-balances', payload);
            return {
              productId: row.productId,
              warehouseId: distribution.warehouseId,
              balanceId: toId(response.id),
            };
          })
        : []
    )));

    if (balanceResults.length === 0) return rows;

    return rows.map((row) => ({
      ...row,
      distributions: row.distributions.map((distribution) => {
        const balance = balanceResults.find((item) => item.productId === row.productId && item.warehouseId === distribution.warehouseId);
        return balance ? { ...distribution, balanceId: balance.balanceId } : distribution;
      }),
    }));
  },

  async createMovements(movements: InventoryOperationalMovement[]) {
    const persistableMovements = movements.filter((movement) => isDatabaseId(movement.productId));
    if (persistableMovements.length === 0) return movements;

    return Promise.all(persistableMovements.map(async (movement) => {
      const row = await salesApi.create<ApiInventoryMovement>('inventory-movements', toMovementPayload(movement));
      return toMovement(row);
    }));
  },

  async updateMovement(movement: InventoryOperationalMovement) {
    if (!isDatabaseId(movement.id)) return movement;
    const row = await salesApi.update<ApiInventoryMovement>('inventory-movements', movement.id, toMovementPayload(movement));
    return toMovement(row);
  },
};
