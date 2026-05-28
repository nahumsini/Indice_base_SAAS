import { useMemo, useState } from 'react';
import type { InventoryFiltersState, InventoryStockItem } from '../types/inventoryTypes';
import { defaultInventoryFilters, filterInventoryItems } from '../utils/inventoryFilters';

export function useInventoryFilters(items: InventoryStockItem[]) {
  const [filters, setFilters] = useState<InventoryFiltersState>(defaultInventoryFilters);
  const filteredItems = useMemo(() => filterInventoryItems(items, filters), [filters, items]);

  return {
    filters,
    filteredItems,
    setFilters,
  };
}
