import type { Product as PointOfSaleProduct } from '../PointOfSale/shared/commercial/products';
import {
  productCategories,
  type CreateProductInput,
  type SalesProductCategory,
  type SalesProductTaxCategory,
  type SalesProductType,
  type UpdateProductInput,
} from '../Sales/types';

function categoryFromDepartment(department?: string): SalesProductCategory {
  const normalizedDepartment = department?.trim();
  return productCategories.includes(normalizedDepartment as SalesProductCategory)
    ? normalizedDepartment as SalesProductCategory
    : 'Other';
}

function typeFromSaleType(saleType?: PointOfSaleProduct['saleType']): SalesProductType {
  return saleType === 'package' ? 'Package' : 'Product';
}

function taxCategoryFromRate(taxRate?: number): SalesProductTaxCategory {
  if (taxRate === 0) return 'Exempt';
  if (taxRate && taxRate <= 8) return 'Reduced VAT';
  return 'Standard VAT';
}

function skuFromProduct(product: Partial<PointOfSaleProduct>) {
  return product.sku || product.barcode || `POS-${Date.now()}`;
}

export function buildSalesProductInputFromPointOfSale(
  product: Partial<PointOfSaleProduct>,
  fallbackCurrency = 'MXN',
): CreateProductInput {
  const sku = skuFromProduct(product);
  const price = Number(product.salePrice) || 0;
  const cost = Number(product.costPrice) || 0;
  const baseUnit = product.saleType === 'bulk' ? 'Kilogram' : 'Piece';

  return {
    name: product.name?.trim() || sku,
    sku,
    category: categoryFromDepartment(product.department),
    type: typeFromSaleType(product.saleType),
    description: product.description?.trim() || 'Producto preparado para venta en punto de venta.',
    price,
    cost,
    currency: product.currency || fallbackCurrency,
    taxCategory: taxCategoryFromRate(product.taxRate),
    status: product.status === 'inactive' ? 'Inactive' : 'Active',
    visibility: 'POS ready',
    barcode: product.barcode,
    imageUrl: product.imageUrl,
    packaging: {
      baseUnit,
      saleUnit: product.saleType === 'package' ? 'Package' : 'Unit',
      unitsPerSaleUnit: 1,
      pricingMode: product.saleType === 'bulk' ? 'Per base unit' : 'Per sale unit',
      saleUnitPrice: price,
      wholesalePrice: product.wholesalePrice,
      barcode: product.barcode,
      notes: product.department ? `Departamento POS: ${product.department}` : undefined,
    },
    thumbnailTone: 'coral',
    stockPrepared: Boolean(product.useInventory),
    warehousePrepared: Boolean(product.useInventory),
    posPrepared: true,
    variantsPrepared: false,
  };
}

export function buildSalesProductPatchFromPointOfSale(
  product: Partial<PointOfSaleProduct>,
  fallbackCurrency = 'MXN',
): UpdateProductInput {
  return buildSalesProductInputFromPointOfSale(product, fallbackCurrency);
}
