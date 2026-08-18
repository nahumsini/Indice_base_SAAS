import type { Product as PointOfSaleProduct } from '../PointOfSale/shared/commercial/products';
import type { SalesCatalogItem, SalesProductTaxCategory } from '../Sales/types';

export type CommerceInventoryBalanceSnapshot = {
  productId?: number | string;
  warehouseId?: number | string;
  availableQuantity?: number | string;
  reservedQuantity?: number | string;
  minimumQuantity?: number | string;
  unitCost?: number | string;
};

type StockSnapshot = {
  available: number;
  reserved: number;
  minimum: number;
  unitCost: number;
};

const numberFrom = (value: unknown) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const taxRateByCategory: Record<SalesProductTaxCategory, number> = {
  'Standard VAT': 16,
  'Reduced VAT': 8,
  'Zero rated': 0,
  Exempt: 0,
  'Service tax': 16,
};

function saleTypeFromProduct(product: SalesCatalogItem): PointOfSaleProduct['saleType'] {
  if (product.type === 'Package') return 'package';
  return product.packaging?.pricingMode === 'Per base unit' ? 'bulk' : 'unit';
}

function shouldExposeInPointOfSale(product: SalesCatalogItem) {
  return product.status === 'Active' && (product.posPrepared || product.visibility === 'POS ready');
}

function buildStockByProductId(balances: CommerceInventoryBalanceSnapshot[]) {
  return balances.reduce<Map<string, StockSnapshot>>((stockByProductId, balance) => {
    const productId = String(balance.productId ?? '');
    if (!productId) return stockByProductId;

    const current = stockByProductId.get(productId) ?? {
      available: 0,
      reserved: 0,
      minimum: 0,
      unitCost: 0,
    };

    stockByProductId.set(productId, {
      available: current.available + numberFrom(balance.availableQuantity),
      reserved: current.reserved + numberFrom(balance.reservedQuantity),
      minimum: Math.max(current.minimum, numberFrom(balance.minimumQuantity)),
      unitCost: numberFrom(balance.unitCost) || current.unitCost,
    });

    return stockByProductId;
  }, new Map());
}

function stockForProduct(product: SalesCatalogItem, stockByProductId: Map<string, StockSnapshot>) {
  const keys = [product.id, product.backendId === undefined ? '' : String(product.backendId)].filter(Boolean);
  return keys.reduce<StockSnapshot | undefined>((found, key) => found ?? stockByProductId.get(key), undefined);
}

export function toPointOfSaleProduct(
  product: SalesCatalogItem,
  stock?: StockSnapshot,
): PointOfSaleProduct {
  const salePrice = product.packaging?.saleUnitPrice ?? product.price;
  const costPrice = stock?.unitCost || product.cost || 0;
  const currentStock = stock?.available ?? 0;
  const minStock = stock?.minimum ?? 0;

  return {
    id: product.id,
    salesProductId: product.id,
    salesProductBackendId: product.backendId,
    barcode: product.barcode || product.packaging?.barcode || product.sku,
    sku: product.sku,
    name: product.name,
    description: product.description,
    saleType: saleTypeFromProduct(product),
    costPrice,
    profitMargin: salePrice > 0 ? Math.max(((salePrice - costPrice) / salePrice) * 100, 0) : 0,
    salePrice,
    wholesalePrice: product.packaging?.wholesalePrice ?? salePrice,
    department: product.category,
    taxRate: taxRateByCategory[product.taxCategory] ?? 0,
    cfdi: product.taxCategory,
    status: product.status === 'Active' ? 'active' : 'inactive',
    useInventory: product.type === 'Product' || product.stockPrepared || product.warehousePrepared || currentStock > 0,
    currentStock,
    minStock,
    maxStock: Math.max(currentStock, minStock),
    isComposite: product.type === 'Package',
    currency: product.currency,
    imageUrl: product.imageUrl,
    source: 'sales',
    createdAt: new Date(product.lastUpdated || Date.now()),
    updatedAt: new Date(product.lastUpdated || Date.now()),
  };
}

export function buildPointOfSaleCatalogProducts(
  products: SalesCatalogItem[],
  balances: CommerceInventoryBalanceSnapshot[],
  warehouseId?: number | string | null,
) {
  const selectedWarehouseId = warehouseId == null ? '' : String(warehouseId);
  const warehouseBalances = selectedWarehouseId
    ? balances.filter((balance) => String(balance.warehouseId ?? '') === selectedWarehouseId)
    : balances;
  const stockByProductId = buildStockByProductId(warehouseBalances);

  return products
    .filter(shouldExposeInPointOfSale)
    .map((product) => toPointOfSaleProduct(product, stockForProduct(product, stockByProductId)));
}
