import type { InventoryLocation, InventoryLocationFiltersState } from '../types/inventoryTypes';

export const defaultInventoryLocationFilters: InventoryLocationFiltersState = {
  search: '',
  type: 'all',
  scopeType: 'all',
  businessUnitId: 'all',
  businessId: 'all',
  status: 'all',
  sellable: 'all',
  physicalMode: 'all',
};

export function filterInventoryLocations(locations: InventoryLocation[], filters: InventoryLocationFiltersState) {
  const search = filters.search.trim().toLowerCase();

  return locations.filter((location) => {
    const matchesSearch = !search || [
      location.name,
      location.code,
      location.type,
      location.scopeType,
      location.businessUnitName ?? '',
      location.businessName ?? '',
      location.city ?? '',
      location.country ?? '',
      location.managerName ?? '',
    ].some((value) => value.toLowerCase().includes(search));
    const matchesType = filters.type === 'all' || location.type === filters.type;
    const matchesScope = filters.scopeType === 'all' || location.scopeType === filters.scopeType;
    const matchesUnit = filters.businessUnitId === 'all' || location.businessUnitId === filters.businessUnitId;
    const matchesBusiness = filters.businessId === 'all' || location.businessId === filters.businessId;
    const matchesStatus = filters.status === 'all'
      || (filters.status === 'active' && location.isActive)
      || (filters.status === 'inactive' && !location.isActive);
    const matchesSellable = filters.sellable === 'all'
      || (filters.sellable === 'sellable' && location.isSellable)
      || (filters.sellable === 'nonSellable' && !location.isSellable);
    const matchesPhysical = filters.physicalMode === 'all'
      || (filters.physicalMode === 'virtual' && location.isVirtual)
      || (filters.physicalMode === 'physical' && !location.isVirtual);

    return matchesSearch && matchesType && matchesScope && matchesUnit && matchesBusiness && matchesStatus && matchesSellable && matchesPhysical;
  });
}
