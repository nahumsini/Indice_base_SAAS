import { useCallback, useEffect, useMemo, useState } from 'react';
import { salesApi } from '../Sales/salesApi';
import { useSalesCrm } from '../Sales/salesCrmContext';
import { buildPointOfSaleCatalogProducts, type CommerceInventoryBalanceSnapshot } from './posCatalog';

export function usePointOfSaleCatalogProducts() {
  const { products: salesProducts } = useSalesCrm();
  const [inventoryBalances, setInventoryBalances] = useState<CommerceInventoryBalanceSnapshot[]>([]);
  const [balanceLoadError, setBalanceLoadError] = useState<string | null>(null);

  const reloadInventoryBalances = useCallback(async () => {
    try {
      const response = await salesApi.list<CommerceInventoryBalanceSnapshot>('inventory-balances');
      setInventoryBalances(response.items);
      setBalanceLoadError(null);
    } catch (error) {
      console.warn('[PointOfSale] Inventory balances could not be loaded.', error);
      setBalanceLoadError('No se pudieron cargar las existencias compartidas de inventario.');
    }
  }, []);

  useEffect(() => {
    void reloadInventoryBalances();
  }, [reloadInventoryBalances]);

  const products = useMemo(
    () => buildPointOfSaleCatalogProducts(salesProducts, inventoryBalances),
    [inventoryBalances, salesProducts],
  );

  const saleCurrency = useMemo(
    () => products.find((product) => product.currency)?.currency ?? 'MXN',
    [products],
  );

  return {
    balanceLoadError,
    inventoryBalances,
    products,
    reloadInventoryBalances,
    saleCurrency,
    salesProducts,
  };
}
