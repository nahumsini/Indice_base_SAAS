import type { Product } from '../../products';
import type { StockStatus } from '../types';

export function getCommercialStockStatus(product: Product): StockStatus {
  if (!product.useInventory) {
    return 'normal';
  }
  if (product.currentStock === 0) {
    return 'agotado';
  }
  if (product.currentStock < product.minStock) {
    return 'bajo';
  }
  if (product.currentStock >= product.maxStock) {
    return 'exceso';
  }
  return 'normal';
}
