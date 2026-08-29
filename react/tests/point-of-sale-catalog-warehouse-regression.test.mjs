import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildPointOfSaleCatalogProducts,
} from '../src/app/BasicModules/CommerceCore/posCatalog.ts';

const baseProduct = {
  category: 'Retail',
  cost: 12,
  currency: 'MXN',
  description: 'Warehouse-scoped POS regression product',
  imageUrl: undefined,
  lastUpdated: '2026-08-29T00:00:00.000Z',
  packaging: {
    barcode: 'PKG-BASE',
    baseUnit: 'Piece',
    minimumSaleQuantity: 1,
    pricingMode: 'Per sale unit',
    saleIncrement: 1,
    saleUnit: 'Unit',
    saleUnitPrice: 25,
    unitsPerSaleUnit: 1,
  },
  posPrepared: true,
  price: 25,
  sku: 'POS-SKU',
  status: 'Active',
  stockPrepared: true,
  taxCategory: 'Standard VAT',
  thumbnailTone: 'coral',
  type: 'Product',
  variantsPrepared: false,
  visibility: 'POS ready',
  warehousePrepared: true,
};

function product(overrides) {
  return {
    ...baseProduct,
    ...overrides,
    packaging: {
      ...baseProduct.packaging,
      ...(overrides.packaging ?? {}),
    },
  };
}

test('POS catalog selected warehouse excludes inventory products without a warehouse balance', () => {
  const selectedWarehouseId = 7;
  const products = [
    product({
      backendId: 101,
      barcode: 'ASSOCIATED-101',
      id: 'local-associated',
      name: 'Associated product',
      sku: 'ASSOCIATED',
    }),
    product({
      backendId: 202,
      barcode: 'OTHER-202',
      id: 'local-other-warehouse',
      name: 'Other warehouse product',
      sku: 'OTHER-WAREHOUSE',
    }),
    product({
      backendId: 303,
      barcode: 'NO-BALANCE-303',
      id: 'local-no-balance',
      name: 'Unassigned inventory product',
      sku: 'NO-BALANCE',
    }),
  ];
  const balances = [
    {
      availableQuantity: 9,
      minimumQuantity: 1,
      productId: 101,
      reservedQuantity: 0,
      unitCost: 10,
      warehouseId: selectedWarehouseId,
    },
    {
      availableQuantity: 14,
      minimumQuantity: 1,
      productId: 202,
      reservedQuantity: 0,
      unitCost: 11,
      warehouseId: 8,
    },
  ];

  const catalog = buildPointOfSaleCatalogProducts(products, balances, selectedWarehouseId);

  assert.deepEqual(
    catalog.map((item) => item.salesProductBackendId),
    [101],
  );
  assert.equal(catalog[0].currentStock, 9);
});

test('POS catalog without selected warehouse preserves the current global POS-ready fallback', () => {
  const products = [
    product({ backendId: 101, id: 'local-associated', name: 'Associated product' }),
    product({ backendId: 202, id: 'local-other-warehouse', name: 'Other warehouse product' }),
    product({ backendId: 303, id: 'local-no-balance', name: 'Unassigned inventory product' }),
  ];
  const balances = [
    { availableQuantity: 9, productId: 101, warehouseId: 7 },
    { availableQuantity: 14, productId: 202, warehouseId: 8 },
  ];

  const catalog = buildPointOfSaleCatalogProducts(products, balances, null);

  assert.deepEqual(
    catalog.map((item) => item.salesProductBackendId),
    [101, 202, 303],
  );
});

test('POS catalog selected warehouse keeps non-inventory service items without warehouse stock', () => {
  const catalog = buildPointOfSaleCatalogProducts([
    product({
      backendId: 404,
      id: 'service-404',
      name: 'Installation service',
      packaging: undefined,
      stockPrepared: false,
      type: 'Service',
      warehousePrepared: false,
    }),
    product({
      backendId: 505,
      id: 'inventory-505',
      name: 'Unassigned stock product',
    }),
  ], [], 7);

  assert.deepEqual(
    catalog.map((item) => item.salesProductBackendId),
    [404],
  );
});
