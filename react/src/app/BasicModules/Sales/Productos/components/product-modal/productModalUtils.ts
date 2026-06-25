import type {
  SalesCatalogItem,
  SalesProductBaseUnit,
  SalesProductPricingMode,
  SalesProductSaleUnit,
} from '../../../types';
import type { ProductFormState } from '../../types/productosTypes';
import { createProductImageGallery } from '../../utils/productImages';

export function moveArrayItem<TItem>(items: TItem[], fromIndex: number, toIndex: number) {
  const nextItems = [...items];
  const [item] = nextItems.splice(fromIndex, 1);
  nextItems.splice(toIndex, 0, item);
  return nextItems;
}

function normalizeSkuSegment(value: string, fallback: string) {
  const normalized = value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, ' ')
    .trim()
    .split(/\s+/)
    .map((word) => word.slice(0, 3).toUpperCase())
    .join('');

  return (normalized || fallback).slice(0, 8);
}

export function createAutomaticSku(form: ProductFormState) {
  const categorySegment = normalizeSkuSegment(form.category, 'CAT');
  const typeSegment = normalizeSkuSegment(form.type, 'ITM');
  const nameSegment = normalizeSkuSegment(form.name, 'NEW');
  const randomSegment = Math.floor(Math.random() * 10000).toString().padStart(4, '0');

  return `IDX-${categorySegment}-${typeSegment}-${nameSegment}-${randomSegment}`;
}

export function getPackagingSnapshot(form: ProductFormState) {
  const presentationPrice = Number(form.saleUnitPrice) || Number(form.price) || 0;
  const unitsPerSaleUnit = Math.max(Number(form.unitsPerSaleUnit) || 1, 1);
  const estimatedBaseUnitPrice = presentationPrice / unitsPerSaleUnit;
  const wholesalePrice = Number(form.wholesalePrice) || 0;
  const wholesaleMinimumQuantity = Number(form.wholesaleMinimumQuantity) || 0;

  return {
    presentationPrice,
    unitsPerSaleUnit,
    estimatedBaseUnitPrice,
    wholesalePrice,
    wholesaleMinimumQuantity,
  };
}

export function buildProductPackaging(form: ProductFormState) {
  return {
    baseUnit: form.baseUnit as SalesProductBaseUnit,
    saleUnit: form.saleUnit as SalesProductSaleUnit,
    unitsPerSaleUnit: Number(form.unitsPerSaleUnit) || 1,
    pricingMode: form.pricingMode as SalesProductPricingMode,
    saleUnitPrice: form.saleUnitPrice.trim() ? Number(form.saleUnitPrice) || 0 : undefined,
    minimumSaleQuantity: Number(form.minimumSaleQuantity) || 1,
    saleIncrement: Number(form.saleIncrement) || 1,
    wholesalePrice: form.wholesalePrice.trim() ? Number(form.wholesalePrice) || 0 : undefined,
    wholesaleMinimumQuantity: form.wholesaleMinimumQuantity.trim() ? Number(form.wholesaleMinimumQuantity) || 1 : undefined,
    barcode: form.packagingBarcode.trim() || undefined,
    notes: form.packagingNotes.trim() || undefined,
    bundleItems: form.bundleItems
      .filter((item) => item.name.trim())
      .map((item) => ({
        id: item.id,
        name: item.name.trim(),
        quantity: Number(item.quantity) || 1,
        unit: item.unit,
        notes: item.notes.trim() || undefined,
      })),
  };
}

export function buildPreviewProduct(form: ProductFormState): SalesCatalogItem {
  const images = createProductImageGallery({
    productId: 'preview',
    primaryImageUrl: form.imageUrl.trim() || undefined,
    primaryImageAlt: form.imageAlt.trim() || undefined,
    galleryUrls: form.galleryUrls,
    uploadedImages: form.uploadedImages,
    productName: form.name.trim() || 'Catalog item',
  });

  return {
    id: 'preview',
    name: form.name.trim() || 'Catalog item',
    sku: form.sku.trim() || 'SKU-000',
    category: form.category as SalesCatalogItem['category'],
    type: form.type,
    description: form.description.trim() || 'Commercial and operational description.',
    price: Number(form.price) || 0,
    cost: Number(form.cost) || 0,
    currency: form.currency,
    taxCategory: form.taxCategory,
    status: form.status,
    visibility: form.visibility,
    barcode: form.barcode.trim() || undefined,
    generatedLabels: form.generatedLabels,
    imageUrl: images.imageUrl,
    imageAlt: images.imageAlt,
    gallery: images.gallery,
    packaging: buildProductPackaging(form),
    thumbnailTone: 'coral',
    stockPrepared: form.usesInventory,
    warehousePrepared: form.usesInventory,
    posPrepared: form.visibility === 'POS ready',
    variantsPrepared: form.type === 'Subscription' || form.type === 'Package',
    lastUpdated: new Date().toISOString().slice(0, 10),
  };
}
