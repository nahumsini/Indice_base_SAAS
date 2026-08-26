import { useMemo } from 'react';
import type { Product } from '../../shared/commercial/products';
import {
  filterQuickProducts,
  getProductCategories,
  getQuickProducts,
  getStockSignals,
  isProductAvailableForSale,
} from '../utils/saleCatalog';

export function useSaleCatalog(products: Product[], selectedCategory: string) {
  const availableProducts = useMemo(
    () => products.filter(isProductAvailableForSale),
    [products],
  );
  const quickProducts = useMemo(() => getQuickProducts(availableProducts), [availableProducts]);
  const categories = useMemo(() => getProductCategories(availableProducts), [availableProducts]);
  const categoryProducts = useMemo(
    () => filterQuickProducts(availableProducts, selectedCategory),
    [availableProducts, selectedCategory],
  );
  const filteredQuickProducts = useMemo(
    () => getQuickProducts(categoryProducts),
    [categoryProducts],
  );
  const stockSignals = useMemo(() => getStockSignals(products), [products]);

  return {
    availableProducts,
    quickProducts,
    categories,
    filteredQuickProducts,
    stockSignals,
  };
}
