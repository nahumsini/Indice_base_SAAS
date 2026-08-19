import { useCallback, useEffect, useMemo, useState } from 'react';
import { salesApi } from '../Sales/salesApi';
import { useSalesCrm } from '../Sales/salesCrmContext';
import {
  buildPointOfSaleCatalogProducts,
  buildPurchasingCatalogProducts,
  type CommerceInventoryBalanceSnapshot,
} from './posCatalog';

export function usePointOfSaleCatalogProducts(warehouseId?: number | string | null) {
  const { products: salesProducts } = useSalesCrm();
  const [inventoryBalances, setInventoryBalances] = useState<CommerceInventoryBalanceSnapshot[]>([]);
  const [balanceLoadError, setBalanceLoadError] = useState<string | null>(null);
  const [isLoadingInventoryBalances, setIsLoadingInventoryBalances] = useState(true);

  const reloadInventoryBalances = useCallback(async () => {
    setIsLoadingInventoryBalances(true);
    try {
      const response = await salesApi.list<CommerceInventoryBalanceSnapshot>(
        'inventory-balances',
        warehouseId == null || warehouseId === '' ? undefined : { warehouseId },
      );
      setInventoryBalances(response.items);
      setBalanceLoadError(null);
    } catch (error) {
      console.warn('[PointOfSale] Inventory balances could not be loaded.', error);
      setBalanceLoadError('No se pudieron cargar las existencias compartidas de inventario.');
    } finally {
      setIsLoadingInventoryBalances(false);
    }
  }, [warehouseId]);

  useEffect(() => {
    void reloadInventoryBalances();
  }, [reloadInventoryBalances]);

  const products = useMemo(
    () => buildPointOfSaleCatalogProducts(salesProducts, inventoryBalances, warehouseId),
    [inventoryBalances, salesProducts, warehouseId],
  );

  const purchasingProducts = useMemo(
    () => buildPurchasingCatalogProducts(salesProducts, inventoryBalances, warehouseId),
    [inventoryBalances, salesProducts, warehouseId],
  );

  const saleCurrency = useMemo(
    () => products.find((product) => product.currency)?.currency
      ?? purchasingProducts.find((product) => product.currency)?.currency
      ?? 'MXN',
    [products, purchasingProducts],
  );

  return {
    balanceLoadError,
    inventoryBalances,
    isLoadingInventoryBalances,
    products,
    purchasingProducts,
    reloadInventoryBalances,
    saleCurrency,
    salesProducts,
  };
}
