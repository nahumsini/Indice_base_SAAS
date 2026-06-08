import { useMemo } from 'react';
import type { Product } from '../../Productos/types/product.types';
import {
  filterQuickProducts,
  getProductCategories,
  getQuickProducts,
  getStockSignals,
} from '../utils/saleCatalog';

export function useSaleCatalog(products: Product[], selectedCategory: string) {
  const quickProducts = useMemo(() => getQuickProducts(products), [products]);
  const categories = useMemo(() => getProductCategories(products), [products]);
  const filteredQuickProducts = useMemo(
    () => filterQuickProducts(quickProducts, selectedCategory),
    [quickProducts, selectedCategory],
  );
  const stockSignals = useMemo(() => getStockSignals(products), [products]);

  return {
    quickProducts,
    categories,
    filteredQuickProducts,
    stockSignals,
  };
}

