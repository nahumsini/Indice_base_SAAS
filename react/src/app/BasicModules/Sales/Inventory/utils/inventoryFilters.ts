import type { InventoryFiltersState, InventoryStockItem } from '../types/inventoryTypes';

export const defaultInventoryFilters: InventoryFiltersState = {
  search: '',
  category: 'all',
  locationId: 'all',
  status: 'all',
  itemType: 'all',
  tracking: 'tracked',
};

export function filterInventoryItems(items: InventoryStockItem[], filters: InventoryFiltersState) {
  const normalizedSearch = filters.search.trim().toLowerCase();

  return items.filter((item) => {
    const matchesSearch = !normalizedSearch || [
      item.name,
      item.sku ?? '',
      item.category ?? '',
      item.type,
      item.locationName,
      item.description ?? '',
    ].some((value) => value.toLowerCase().includes(normalizedSearch));
    const matchesCategory = filters.category === 'all' || item.category === filters.category;
    const matchesLocation = filters.locationId === 'all' || item.locationId === filters.locationId;
    const matchesStatus = filters.status === 'all' || item.status === filters.status;
    const matchesType = filters.itemType === 'all' || item.type === filters.itemType;
    const matchesTracking = filters.tracking === 'all'
      || (filters.tracking === 'tracked' && item.usesInventory)
      || (filters.tracking === 'notTracked' && !item.usesInventory);

    return matchesSearch && matchesCategory && matchesLocation && matchesStatus && matchesType && matchesTracking;
  });
}
