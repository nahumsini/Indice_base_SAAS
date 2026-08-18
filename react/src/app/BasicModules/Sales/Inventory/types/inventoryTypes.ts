import type { SalesProductCategory, SalesProductType } from '../../types';

export type InventoryStatus = 'healthy' | 'lowStock' | 'outOfStock' | 'needsReview' | 'inactive' | 'notTracked';
export type InventoryMovementType =
  | 'supplierReceipt'
  | 'transfer'
  | 'storeReplenishment'
  | 'sale'
  | 'return'
  | 'adjustment'
  | 'writeOff'
  | 'stockIn'
  | 'stockOut'
  | 'wasteLoss';
export type InventoryMovementStatus = 'recorded' | 'draft' | 'pendingSync' | 'inTransit' | 'received' | 'completed' | 'cancelled';
export type InventoryLocationType =
  | 'warehouse'
  | 'storeFloor'
  | 'onlineStock'
  | 'serviceUnit'
  | 'corporateOffice'
  | 'headquarters'
  | 'branchStorage'
  | 'damagedStock'
  | 'quarantine'
  | 'inTransit'
  | 'temporary';
export type InventoryScopeType = 'company' | 'businessUnit' | 'business';
export type InventoryTrackingFilter = 'all' | 'tracked' | 'notTracked';
export type InventorySubview = 'stock' | 'locations' | 'movements';
export type InventoryOperationalView = 'stock' | 'warehouses' | 'movements';
export type InventoryWarehouseType =
  | 'corporateWarehouse'
  | 'businessUnitWarehouse'
  | 'businessWarehouse'
  | 'temporaryStorage'
  | 'vehicleStorage';
export type InventoryWarehouseStatus = 'active' | 'inactive';
export type InventoryStockHealth = 'healthy' | 'lowStock' | 'outOfStock' | 'needsReview' | 'inactive';
export type InventoryTrackingMode = 'all' | 'tracked' | 'notTracked';

export type InventoryBusinessUnit = {
  id: string;
  name: string;
  code: string;
  city?: string;
  country?: string;
};

export type InventoryBusiness = {
  id: string;
  name: string;
  code: string;
  businessUnitId: string;
  businessUnitName: string;
  address?: string;
  city?: string;
  country?: string;
};

export type InventoryLocation = {
  id: string;
  name: string;
  code: string;
  type: InventoryLocationType;
  scopeType: InventoryScopeType;
  unitId?: string;
  businessId?: string;
  businessUnitId?: string;
  businessUnitName?: string;
  businessName?: string;
  address?: string;
  city?: string;
  country?: string;
  managerUserId?: string;
  managerName?: string;
  isVirtual: boolean;
  isSellable: boolean;
  isActive: boolean;
  notes?: string;
};

export type InventoryWarehouse = {
  id: string;
  name: string;
  type: InventoryWarehouseType;
  businessUnitId?: string;
  businessUnitName?: string;
  businessId?: string;
  businessName?: string;
  jurisdiction: string;
  responsibleUserId?: string;
  responsibleName: string;
  addressNote?: string;
  status: InventoryWarehouseStatus;
  lastMovementAt?: string;
};

export type InventoryWarehouseDistribution = {
  balanceId?: string;
  warehouseId: string;
  warehouseName: string;
  available: number;
  reserved: number;
  minimum: number;
};

export type InventoryMovementAttachment = {
  id: string;
  name: string;
  size: number;
  type: string;
};

export type InventoryStockRow = {
  id: string;
  productId: string;
  name: string;
  sku: string;
  category: SalesProductCategory;
  type: SalesProductType;
  description?: string;
  thumbnailUrl?: string;
  thumbnailAlt?: string;
  averageCost: number;
  minimumStock: number;
  distributions: InventoryWarehouseDistribution[];
  businessUnitId?: string;
  businessUnitName?: string;
  businessId?: string;
  businessName?: string;
  usesInventory: boolean;
  lastMovementAt?: string;
};

export type InventoryOperationalMovement = {
  id: string;
  groupId?: string;
  movementNumber?: string;
  productId: string;
  productName: string;
  productSku?: string;
  productImageUrl?: string;
  productImageAlt?: string;
  variantLabel?: string;
  movementType: InventoryMovementType;
  quantity: number;
  unitCost?: number;
  fromWarehouseId?: string;
  fromWarehouseName?: string;
  toWarehouseId?: string;
  toWarehouseName?: string;
  supplierName?: string;
  attachments?: InventoryMovementAttachment[];
  businessUnitId?: string;
  businessUnitName?: string;
  businessId?: string;
  businessName?: string;
  reason: string;
  reference?: string;
  responsibleName: string;
  movementDate: string;
  status: 'draft' | 'inTransit' | 'received' | 'completed' | 'cancelled';
};

export type InventoryOperationalFiltersState = {
  search: string;
  category: 'all' | SalesProductCategory;
  itemType: 'all' | SalesProductType;
  warehouseId: 'all' | string;
  status: 'all' | InventoryStockHealth;
  businessUnitId: 'all' | string;
  businessId: 'all' | string;
  tracking: InventoryTrackingMode;
};

export type InventoryWarehouseFiltersState = {
  search: string;
  type: 'all' | InventoryWarehouseType;
  businessUnitId: 'all' | string;
  businessId: 'all' | string;
  status: 'all' | InventoryWarehouseStatus;
  stockHealth: 'all' | InventoryStockHealth;
};

export type InventoryOperationalMovementFiltersState = {
  search: string;
  movementType: 'all' | InventoryMovementType;
  productId: 'all' | string;
  fromWarehouseId: 'all' | string;
  toWarehouseId: 'all' | string;
  businessUnitId: 'all' | string;
  businessId: 'all' | string;
  responsible: string;
  status: 'all' | InventoryOperationalMovement['status'];
  dateFrom: string;
  dateTo: string;
};

export type InventoryOperationalColumnId =
  | 'selection'
  | 'photo'
  | 'product'
  | 'sku'
  | 'category'
  | 'type'
  | 'totalStock'
  | 'available'
  | 'reserved'
  | 'minimum'
  | 'status'
  | 'warehouseDistribution'
  | 'estimatedValue'
  | 'lastMovement'
  | 'actions';

export type InventoryKpiMetrics = {
  totalItems: number;
  totalUnits: number;
  lowStockItems: number;
  outOfStockItems: number;
  estimatedValue: number;
};

export type InventoryWarehouseMetrics = {
  activeWarehouses: number;
  storedItems: number;
  totalUnits: number;
  attentionWarehouses: number;
  estimatedValue: number;
};

export type InventoryMovementMetrics = {
  totalMovements: number;
  supplierReceipts: number;
  transfers: number;
  adjustments: number;
  inTransit: number;
  completed: number;
  inventoryValueInTransit: number;
  drafts: number;
  entries: number;
};

export type InventoryMovementEntryType =
  | 'supplierReceipt'
  | 'transfer'
  | 'storeReplenishment'
  | 'sale'
  | 'return'
  | 'adjustment'
  | 'writeOff';

export type InventoryMovementEntryLine = {
  id: string;
  productId: string;
  quantity: number;
};

export type InventoryStockItem = {
  id: string;
  productId: string;
  name: string;
  sku?: string;
  type: SalesProductType;
  category?: SalesProductCategory;
  description?: string;
  thumbnailUrl?: string;
  thumbnailAlt?: string;
  locationId: string;
  locationName: string;
  locationCode?: string;
  locationType?: InventoryLocationType;
  scopeType?: InventoryScopeType;
  businessUnitId?: string;
  businessUnitName?: string;
  businessId?: string;
  businessName?: string;
  availableStock: number;
  reservedStock: number;
  minimumStock: number;
  unit: string;
  averageCost: number;
  estimatedValue: number;
  usesInventory: boolean;
  readyForSales?: boolean;
  readyForPOS?: boolean;
  lastMovementAt?: string;
  status: InventoryStatus;
  isPackage?: boolean;
};

export type InventoryMovement = {
  id: string;
  productId: string;
  productName: string;
  movementType: InventoryMovementType;
  sourceLocationId?: string;
  sourceLocationName?: string;
  destinationLocationId?: string;
  destinationLocationName?: string;
  quantity: number;
  unitCost?: number;
  reason: string;
  notes?: string;
  responsibleUserId?: string;
  responsibleName?: string;
  movementDate: string;
  status: InventoryMovementStatus;
};

export type InventoryFiltersState = {
  search: string;
  category: 'all' | SalesProductCategory;
  locationId: 'all' | string;
  status: 'all' | InventoryStatus;
  itemType: 'all' | SalesProductType;
  tracking: InventoryTrackingFilter;
};

export type InventoryLocationFiltersState = {
  search: string;
  type: 'all' | InventoryLocationType;
  scopeType: 'all' | InventoryScopeType;
  businessUnitId: 'all' | string;
  businessId: 'all' | string;
  status: 'all' | 'active' | 'inactive';
  sellable: 'all' | 'sellable' | 'nonSellable';
  physicalMode: 'all' | 'physical' | 'virtual';
};

export type InventoryMovementFiltersState = {
  movementType: 'all' | InventoryMovementType;
  locationId: 'all' | string;
  productId: 'all' | string;
  status: 'all' | InventoryMovementStatus;
  dateFrom: string;
  dateTo: string;
};

export type InventoryColumnId =
  | 'item'
  | 'sku'
  | 'category'
  | 'location'
  | 'availableStock'
  | 'reservedStock'
  | 'minimumStock'
  | 'status'
  | 'estimatedValue'
  | 'lastMovement'
  | 'itemType'
  | 'unit'
  | 'averageCost'
  | 'usesInventory'
  | 'readyForPOS'
  | 'readyForSales'
  | 'actions';

export type InventoryMetrics = {
  trackedItems: number;
  lowStockItems: number;
  outOfStockItems: number;
  totalStockValue: number;
  recentMovements: number;
};

export type InventoryMovementDraft = {
  movementType: InventoryMovementType;
  productId: string;
  sourceLocationId: string;
  destinationLocationId: string;
  quantity: string;
  unitCost: string;
  reason: string;
  notes: string;
  movementDate: string;
  responsibleUserId: string;
  responsibleName: string;
};

export type InventoryLocationDraft = {
  name: string;
  code: string;
  type: InventoryLocationType;
  scopeType: InventoryScopeType;
  businessUnitId: string;
  businessId: string;
  address: string;
  city: string;
  country: string;
  managerUserId: string;
  managerName: string;
  isVirtual: boolean;
  isSellable: boolean;
  isActive: boolean;
  notes: string;
};
