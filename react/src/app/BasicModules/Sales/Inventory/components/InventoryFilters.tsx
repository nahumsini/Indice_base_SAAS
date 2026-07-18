import { Input } from '../../../../components/ui/input';
import { productCategories, productTypes } from '../../types';
import {
  SalesFilterBar,
  SalesFilterSearch,
  SalesFilterSelect as FilterSelect,
  salesFilterControlClassName,
} from '../../components/SalesFilterBar';
import type {
  InventoryBusiness,
  InventoryBusinessUnit,
  InventoryFiltersState,
  InventoryLocation,
  InventoryOperationalFiltersState,
  InventoryOperationalMovementFiltersState,
  InventoryOperationalView,
  InventoryWarehouse,
  InventoryWarehouseFiltersState,
} from '../types/inventoryTypes';
import type { InventoryTranslations } from '../translations';

type InventoryAnyFilters = InventoryOperationalFiltersState | InventoryWarehouseFiltersState | InventoryOperationalMovementFiltersState;
type InventoryLegacyFilters = InventoryAnyFilters | InventoryFiltersState;

export function InventoryFilters({
  activeView,
  filters,
  warehouses,
  locations,
  businessUnits,
  businesses,
  categoryOptions,
  responsibleOptions = [],
  t,
  onFiltersChange,
}: {
  activeView?: InventoryOperationalView;
  filters: InventoryLegacyFilters;
  warehouses?: InventoryWarehouse[];
  locations?: InventoryLocation[];
  businessUnits?: InventoryBusinessUnit[];
  businesses?: InventoryBusiness[];
  categoryOptions?: string[];
  responsibleOptions?: string[];
  t: InventoryTranslations;
  onFiltersChange: (filters: InventoryLegacyFilters) => void;
}) {
  const view = activeView ?? 'stock';
  const warehouseOptions = warehouses ?? locations?.map((location) => ({
    id: location.id,
    name: location.name,
    type: 'businessWarehouse' as const,
    jurisdiction: location.city ?? '',
    responsibleName: location.managerName ?? '',
    status: location.isActive ? 'active' as const : 'inactive' as const,
  })) ?? [];
  const unitOptions = businessUnits ?? [];
  const businessOptions = businesses ?? [];
  const categories = categoryOptions ?? productCategories;
  const searchLabel = activeView === 'warehouses'
    ? t.operational.filterLabels.searchWarehouse
    : activeView === 'movements'
      ? t.operational.filterLabels.searchMovement
      : t.operational.filterLabels.searchProduct;
  const gridClassName = view === 'movements'
    ? 'xl:grid-cols-5'
    : 'xl:grid-cols-4 2xl:grid-cols-7';
  const searchClassName = view === 'movements' ? 'xl:col-span-2' : '2xl:col-span-2';

  return (
    <SalesFilterBar title={t.operational.filtersTitle} gridClassName={gridClassName}>
      <SalesFilterSearch
        className={searchClassName}
        label={searchLabel}
        value={filters.search}
        onValueChange={(value) => onFiltersChange({ ...filters, search: value } as InventoryAnyFilters)}
        placeholder={searchLabel}
      />

      {view === 'stock' || view === 'warehouses' ? (
        <>
            <FilterSelect label={t.operational.filterLabels.businessUnit} value={(filters as InventoryOperationalFiltersState).businessUnitId ?? 'all'} onValueChange={(value) => onFiltersChange({ ...filters, businessUnitId: value } as InventoryAnyFilters)} options={[{ value: 'all', label: t.common.all }, ...unitOptions.map((unit) => ({ value: unit.id, label: unit.name }))]} />
            <FilterSelect label={t.operational.filterLabels.business} value={(filters as InventoryOperationalFiltersState).businessId ?? 'all'} onValueChange={(value) => onFiltersChange({ ...filters, businessId: value } as InventoryAnyFilters)} options={[{ value: 'all', label: t.common.all }, ...businessOptions.map((business) => ({ value: business.id, label: business.name }))]} />
            <FilterSelect label={t.operational.filterLabels.category} value={(filters as InventoryOperationalFiltersState).category} onValueChange={(value) => onFiltersChange({ ...filters, category: value } as InventoryAnyFilters)} options={[{ value: 'all', label: t.filters.allCategories }, ...categories.map((category) => ({ value: category, label: category }))]} />
            <FilterSelect label={t.operational.filterLabels.warehouse} value={(filters as InventoryOperationalFiltersState).warehouseId ?? 'all'} onValueChange={(value) => onFiltersChange({ ...filters, warehouseId: value } as InventoryAnyFilters)} options={[{ value: 'all', label: t.common.all }, ...warehouseOptions.map((warehouse) => ({ value: warehouse.id, label: warehouse.name }))]} />
            <FilterSelect label={t.operational.filterLabels.itemType} value={(filters as InventoryOperationalFiltersState).itemType} onValueChange={(value) => onFiltersChange({ ...filters, itemType: value } as InventoryAnyFilters)} options={[{ value: 'all', label: t.filters.allTypes }, ...productTypes.map((type) => ({ value: type, label: type }))]} />
        </>
      ) : null}

      {view === 'movements' ? (
        <>
            <label className="space-y-2">
              <span className="block text-sm font-medium text-slate-700 dark:text-slate-200">{t.filters.dateFrom}</span>
              <Input type="date" value={(filters as InventoryOperationalMovementFiltersState).dateFrom} onChange={(event) => onFiltersChange({ ...filters, dateFrom: event.target.value } as InventoryAnyFilters)} className={salesFilterControlClassName} />
            </label>
            <label className="space-y-2">
              <span className="block text-sm font-medium text-slate-700 dark:text-slate-200">{t.filters.dateTo}</span>
              <Input type="date" value={(filters as InventoryOperationalMovementFiltersState).dateTo} onChange={(event) => onFiltersChange({ ...filters, dateTo: event.target.value } as InventoryAnyFilters)} className={salesFilterControlClassName} />
            </label>
            <FilterSelect label={t.operational.filterLabels.status} value={(filters as InventoryOperationalMovementFiltersState).status} onValueChange={(value) => onFiltersChange({ ...filters, status: value } as InventoryAnyFilters)} options={[{ value: 'all', label: t.common.all }, ...Object.entries(t.operational.movementStatuses).map(([value, label]) => ({ value, label }))]} />
            <FilterSelect label={t.operational.filterLabels.movementType} value={(filters as InventoryOperationalMovementFiltersState).movementType} onValueChange={(value) => onFiltersChange({ ...filters, movementType: value } as InventoryAnyFilters)} options={[{ value: 'all', label: t.common.all }, ...Object.entries(t.operational.movementTypes).map(([value, label]) => ({ value, label }))]} />
            <FilterSelect label={t.operational.filterLabels.fromWarehouse} value={(filters as InventoryOperationalMovementFiltersState).fromWarehouseId} onValueChange={(value) => onFiltersChange({ ...filters, fromWarehouseId: value } as InventoryAnyFilters)} options={[{ value: 'all', label: t.common.all }, ...warehouseOptions.map((warehouse) => ({ value: warehouse.id, label: warehouse.name }))]} />
            <FilterSelect label={t.operational.filterLabels.toWarehouse} value={(filters as InventoryOperationalMovementFiltersState).toWarehouseId} onValueChange={(value) => onFiltersChange({ ...filters, toWarehouseId: value } as InventoryAnyFilters)} options={[{ value: 'all', label: t.common.all }, ...warehouseOptions.map((warehouse) => ({ value: warehouse.id, label: warehouse.name }))]} />
            <FilterSelect
              label={t.operational.filterLabels.responsible}
              value={(filters as InventoryOperationalMovementFiltersState).responsible || 'all'}
              onValueChange={(value) => onFiltersChange({ ...filters, responsible: value === 'all' ? '' : value } as InventoryAnyFilters)}
              options={[{ value: 'all', label: t.common.all }, ...responsibleOptions.map((responsible) => ({ value: responsible, label: responsible }))]}
            />
        </>
      ) : null}
    </SalesFilterBar>
  );
}
