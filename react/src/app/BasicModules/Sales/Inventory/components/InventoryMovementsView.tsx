import { useMemo, useState } from 'react';
import { Input } from '../../../../components/ui/input';
import {
  SalesFilterBar,
  SalesFilterSelect,
  salesFilterControlClassName,
} from '../../components/SalesFilterBar';
import type {
  InventoryLocation,
  InventoryMovement,
  InventoryMovementFiltersState,
  InventoryMovementStatus,
  InventoryMovementType,
  InventoryStockItem,
} from '../types/inventoryTypes';
import type { InventoryTranslations } from '../translations';
import { defaultInventoryMovementFilters, filterInventoryMovements } from '../utils/inventoryMovementFilters';
import { InventoryMovementHistory } from './InventoryMovementHistory';

export function InventoryMovementsView({
  movements,
  locations,
  stockItems,
  t,
}: {
  movements: InventoryMovement[];
  locations: InventoryLocation[];
  stockItems: InventoryStockItem[];
  t: InventoryTranslations;
}) {
  const [filters, setFilters] = useState<InventoryMovementFiltersState>(defaultInventoryMovementFilters);
  const filteredMovements = useMemo(() => filterInventoryMovements(movements, filters), [filters, movements]);
  const movementTypes: InventoryMovementType[] = ['stockIn', 'stockOut', 'adjustment', 'transfer'];
  const statuses: InventoryMovementStatus[] = ['recorded', 'draft', 'pendingSync'];

  return (
    <section className="space-y-5">
      <SalesFilterBar title={t.filters.title} gridClassName="xl:grid-cols-4">
        <label className="space-y-2">
          <span className="block text-sm font-medium text-slate-700 dark:text-slate-200">{t.filters.dateFrom}</span>
          <Input
            type="date"
            value={filters.dateFrom}
            onChange={(event) => setFilters({ ...filters, dateFrom: event.target.value })}
            className={salesFilterControlClassName}
          />
        </label>
        <label className="space-y-2">
          <span className="block text-sm font-medium text-slate-700 dark:text-slate-200">{t.filters.dateTo}</span>
          <Input
            type="date"
            value={filters.dateTo}
            onChange={(event) => setFilters({ ...filters, dateTo: event.target.value })}
            className={salesFilterControlClassName}
          />
        </label>
        <SalesFilterSelect
          label={t.locationLabels.status}
          value={filters.status}
          onValueChange={(value) => setFilters({ ...filters, status: value as 'all' | InventoryMovementStatus })}
          options={[{ value: 'all', label: t.common.all }, ...statuses.map((status) => ({ value: status, label: t.movementStatuses[status] }))]}
        />
        <SalesFilterSelect
            label={t.modal.movementType}
            value={filters.movementType}
            onValueChange={(value) => setFilters({ ...filters, movementType: value as 'all' | InventoryMovementType })}
            options={[{ value: 'all', label: t.common.all }, ...movementTypes.map((type) => ({ value: type, label: t.movementTypes[type] }))]}
        />
        <SalesFilterSelect
          label={t.filters.location}
          value={filters.locationId}
          onValueChange={(value) => setFilters({ ...filters, locationId: value })}
          options={[{ value: 'all', label: t.common.all }, ...locations.map((location) => ({ value: location.id, label: location.name }))]}
        />
        <SalesFilterSelect
          label={t.modal.item}
          value={filters.productId}
          onValueChange={(value) => setFilters({ ...filters, productId: value })}
          options={[{ value: 'all', label: t.common.all }, ...stockItems.map((item) => ({ value: item.productId, label: item.name }))]}
        />
      </SalesFilterBar>
      <InventoryMovementHistory movements={filteredMovements} t={t} />
    </section>
  );
}
