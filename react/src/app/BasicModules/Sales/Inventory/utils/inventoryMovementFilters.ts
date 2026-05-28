import type { InventoryMovement, InventoryMovementFiltersState } from '../types/inventoryTypes';

export const defaultInventoryMovementFilters: InventoryMovementFiltersState = {
  movementType: 'all',
  locationId: 'all',
  productId: 'all',
  status: 'all',
  dateFrom: '',
  dateTo: '',
};

export function filterInventoryMovements(movements: InventoryMovement[], filters: InventoryMovementFiltersState) {
  return movements.filter((movement) => {
    const matchesType = filters.movementType === 'all' || movement.movementType === filters.movementType;
    const matchesLocation = filters.locationId === 'all'
      || movement.sourceLocationId === filters.locationId
      || movement.destinationLocationId === filters.locationId;
    const matchesProduct = filters.productId === 'all' || movement.productId === filters.productId;
    const matchesStatus = filters.status === 'all' || movement.status === filters.status;
    const matchesFrom = !filters.dateFrom || movement.movementDate >= filters.dateFrom;
    const matchesTo = !filters.dateTo || movement.movementDate <= filters.dateTo;

    return matchesType && matchesLocation && matchesProduct && matchesStatus && matchesFrom && matchesTo;
  });
}
