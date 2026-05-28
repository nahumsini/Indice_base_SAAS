import type { SalesCatalogItem } from '../../../types';
import { getProductGalleryImages } from '../../utils/productImages';
import type {
  PublicCatalogConfig,
  PublicCatalogItem,
  PublicInventoryStatus,
} from '../types/publicCatalogTypes';

export function isProductReadyForPublicCatalog(product: SalesCatalogItem) {
  return product.status === 'Active'
    && product.visibility !== 'Internal'
    && product.price > 0;
}

export function getPublicInventoryStatus(product: SalesCatalogItem): PublicInventoryStatus {
  if (product.type === 'Service' || product.type === 'Subscription') {
    return 'serviceAvailability';
  }

  if (!product.stockPrepared && !product.warehousePrepared) {
    return 'noInventoryTracking';
  }

  if (product.visibility === 'Quote only') {
    return 'madeToOrder';
  }

  if (!product.posPrepared) {
    return 'askAvailability';
  }

  return 'inStock';
}

export function adaptProductToPublicCatalogItem(product: SalesCatalogItem): PublicCatalogItem {
  const gallery = getProductGalleryImages(product);
  const mainImage = gallery[0];

  return {
    id: product.id,
    name: product.name,
    sku: product.sku,
    type: product.type,
    category: product.category,
    description: product.description,
    thumbnailUrl: mainImage?.url,
    thumbnailAlt: mainImage?.alt ?? product.imageAlt,
    publicPrice: product.price,
    wholesalePrice: product.packaging?.wholesalePrice,
    wholesaleMinQuantity: product.packaging?.wholesaleMinimumQuantity,
    usesInventory: product.stockPrepared || product.warehousePrepared,
    publicInventoryStatus: getPublicInventoryStatus(product),
    readyForSales: isProductReadyForPublicCatalog(product),
  };
}

export function getProductsForPublicCatalog(products: SalesCatalogItem[], config: PublicCatalogConfig) {
  const selectedProducts = new Set(config.selectedProductIds);
  const selectedCategories = new Set(config.selectedCategoryIds);

  return products
    .filter((product) => (
      selectedProducts.has(product.id)
      && (selectedCategories.size === 0 || selectedCategories.has(product.category))
      && isProductReadyForPublicCatalog(product)
    ))
    .map(adaptProductToPublicCatalogItem);
}

export function createDefaultPublicCatalogConfig(products: SalesCatalogItem[], copy: {
  title: string;
  description: string;
  contactCta: string;
}): PublicCatalogConfig {
  const readyProducts = products.filter(isProductReadyForPublicCatalog);
  const categories = Array.from(new Set(readyProducts.map((product) => product.category)));

  return {
    title: copy.title,
    description: copy.description,
    coverImageUrl: '',
    contactCtaLabel: copy.contactCta,
    contactMethod: 'whatsapp',
    contactValue: '',
    showPrices: true,
    showWholesalePrices: true,
    showStockStatus: true,
    showItemTypeBadges: true,
    showCategories: true,
    allowCart: true,
    allowPurchaseRequest: true,
    showOnlinePaymentComingSoon: true,
    selectedCategoryIds: categories,
    selectedProductIds: readyProducts.map((product) => product.id),
    publicAccessToken: 'demo-token',
  };
}
