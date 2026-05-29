import { Search } from 'lucide-react';
import { Input } from '../../../../components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../../components/ui/select';
import { productCategories, productTypes } from '../../types';
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

function FilterSelect({
  label,
  value,
  onValueChange,
  options,
}: {
  label: string;
  value: string;
  onValueChange: (value: string) => void;
  options: Array<{ value: string; label: string }>;
}) {
  return (
    <label className="grid gap-2">
      <span className="text-sm font-bold text-slate-700 dark:text-slate-200">{label}</span>
      <Select value={value} onValueChange={onValueChange}>
        <SelectTrigger className="h-11 rounded-xl border-slate-200 bg-white text-sm font-bold text-slate-950 shadow-none focus:border-[#FF6B5E] focus:ring-[#FF6B5E]/20 dark:border-slate-700 dark:bg-slate-900 dark:text-white">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}
        </SelectContent>
      </Select>
    </label>
  );
}

export function InventoryFilters({
  activeView,
  filters,
  warehouses,
  locations,
  businessUnits,
  businesses,
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
  const searchLabel = activeView === 'warehouses'
    ? t.operational.filterLabels.searchWarehouse
    : activeView === 'movements'
      ? t.operational.filterLabels.searchMovement
      : t.operational.filterLabels.searchProduct;

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
      <h3 className="mb-5 text-xl font-bold text-slate-950 dark:text-white">{t.operational.filtersTitle}</h3>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-6">
        <label className="grid gap-2 xl:col-span-2">
          <span className="text-sm font-bold text-slate-700 dark:text-slate-200">{searchLabel}</span>
          <span className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              value={filters.search}
              onChange={(event) => onFiltersChange({ ...filters, search: event.target.value } as InventoryAnyFilters)}
              placeholder={searchLabel}
              className="h-11 rounded-xl border-slate-200 bg-white pl-10 text-sm font-semibold text-slate-950 shadow-none focus:border-[#FF6B5E] focus:ring-[#FF6B5E]/20 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
            />
          </span>
        </label>

        {view === 'stock' || view === 'warehouses' ? (
          <>
            <FilterSelect label={t.operational.filterLabels.category} value={(filters as InventoryOperationalFiltersState).category} onValueChange={(value) => onFiltersChange({ ...filters, category: value } as InventoryAnyFilters)} options={[{ value: 'all', label: t.filters.allCategories }, ...productCategories.map((category) => ({ value: category, label: category }))]} />
            <FilterSelect label={t.operational.filterLabels.itemType} value={(filters as InventoryOperationalFiltersState).itemType} onValueChange={(value) => onFiltersChange({ ...filters, itemType: value } as InventoryAnyFilters)} options={[{ value: 'all', label: t.filters.allTypes }, ...productTypes.map((type) => ({ value: type, label: type }))]} />
            <FilterSelect label={t.operational.filterLabels.businessUnit} value={(filters as InventoryOperationalFiltersState).businessUnitId ?? 'all'} onValueChange={(value) => onFiltersChange({ ...filters, businessUnitId: value } as InventoryAnyFilters)} options={[{ value: 'all', label: t.common.all }, ...unitOptions.map((unit) => ({ value: unit.id, label: unit.name }))]} />
            <FilterSelect label={t.operational.filterLabels.business} value={(filters as InventoryOperationalFiltersState).businessId ?? 'all'} onValueChange={(value) => onFiltersChange({ ...filters, businessId: value } as InventoryAnyFilters)} options={[{ value: 'all', label: t.common.all }, ...businessOptions.map((business) => ({ value: business.id, label: business.name }))]} />
          </>
        ) : null}

        {view === 'movements' ? (
          <>
            <FilterSelect label={t.operational.filterLabels.movementType} value={(filters as InventoryOperationalMovementFiltersState).movementType} onValueChange={(value) => onFiltersChange({ ...filters, movementType: value } as InventoryAnyFilters)} options={[{ value: 'all', label: t.common.all }, ...Object.entries(t.operational.movementTypes).map(([value, label]) => ({ value, label }))]} />
            <FilterSelect label={t.operational.filterLabels.status} value={(filters as InventoryOperationalMovementFiltersState).status} onValueChange={(value) => onFiltersChange({ ...filters, status: value } as InventoryAnyFilters)} options={[{ value: 'all', label: t.common.all }, ...Object.entries(t.operational.movementStatuses).map(([value, label]) => ({ value, label }))]} />
            <FilterSelect label={t.operational.filterLabels.fromWarehouse} value={(filters as InventoryOperationalMovementFiltersState).fromWarehouseId} onValueChange={(value) => onFiltersChange({ ...filters, fromWarehouseId: value } as InventoryAnyFilters)} options={[{ value: 'all', label: t.common.all }, ...warehouseOptions.map((warehouse) => ({ value: warehouse.id, label: warehouse.name }))]} />
            <FilterSelect label={t.operational.filterLabels.toWarehouse} value={(filters as InventoryOperationalMovementFiltersState).toWarehouseId} onValueChange={(value) => onFiltersChange({ ...filters, toWarehouseId: value } as InventoryAnyFilters)} options={[{ value: 'all', label: t.common.all }, ...warehouseOptions.map((warehouse) => ({ value: warehouse.id, label: warehouse.name }))]} />
            <FilterSelect
              label={t.operational.filterLabels.responsible}
              value={(filters as InventoryOperationalMovementFiltersState).responsible || 'all'}
              onValueChange={(value) => onFiltersChange({ ...filters, responsible: value === 'all' ? '' : value } as InventoryAnyFilters)}
              options={[{ value: 'all', label: t.common.all }, ...responsibleOptions.map((responsible) => ({ value: responsible, label: responsible }))]}
            />
            <label className="grid gap-2">
              <span className="text-sm font-bold text-slate-700 dark:text-slate-200">{t.filters.dateFrom}</span>
              <Input type="date" value={(filters as InventoryOperationalMovementFiltersState).dateFrom} onChange={(event) => onFiltersChange({ ...filters, dateFrom: event.target.value } as InventoryAnyFilters)} className="h-11 rounded-xl border-slate-200 text-sm font-semibold shadow-none focus:border-[#FF6B5E] focus:ring-[#FF6B5E]/20 dark:border-slate-700 dark:bg-slate-900 dark:text-white" />
            </label>
            <label className="grid gap-2">
              <span className="text-sm font-bold text-slate-700 dark:text-slate-200">{t.filters.dateTo}</span>
              <Input type="date" value={(filters as InventoryOperationalMovementFiltersState).dateTo} onChange={(event) => onFiltersChange({ ...filters, dateTo: event.target.value } as InventoryAnyFilters)} className="h-11 rounded-xl border-slate-200 text-sm font-semibold shadow-none focus:border-[#FF6B5E] focus:ring-[#FF6B5E]/20 dark:border-slate-700 dark:bg-slate-900 dark:text-white" />
            </label>
          </>
        ) : null}
      </div>
    </section>
  );
}
