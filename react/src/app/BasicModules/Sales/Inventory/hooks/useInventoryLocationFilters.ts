import { useMemo, useState } from 'react';
import type { InventoryLocation, InventoryLocationFiltersState } from '../types/inventoryTypes';
import { defaultInventoryLocationFilters, filterInventoryLocations } from '../utils/inventoryLocationFilters';

export function useInventoryLocationFilters(locations: InventoryLocation[]) {
  const [filters, setFilters] = useState<InventoryLocationFiltersState>(defaultInventoryLocationFilters);
  const filteredLocations = useMemo(() => filterInventoryLocations(locations, filters), [filters, locations]);

  return {
    filters,
    filteredLocations,
    setFilters,
  };
}
