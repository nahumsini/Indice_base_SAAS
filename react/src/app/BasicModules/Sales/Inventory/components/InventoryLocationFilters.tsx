import {
  SalesFilterBar,
  SalesFilterSearch,
  SalesFilterSelect,
} from '../../components/SalesFilterBar';
import type {
  InventoryBusiness,
  InventoryBusinessUnit,
  InventoryLocationFiltersState,
  InventoryLocationType,
  InventoryScopeType,
} from '../types/inventoryTypes';
import type { InventoryTranslations } from '../translations';

const locationTypes: InventoryLocationType[] = [
  'warehouse',
  'storeFloor',
  'onlineStock',
  'serviceUnit',
  'corporateOffice',
  'headquarters',
  'branchStorage',
  'damagedStock',
  'quarantine',
  'inTransit',
  'temporary',
];

const scopeTypes: InventoryScopeType[] = ['company', 'businessUnit', 'business'];

export function InventoryLocationFilters({
  filters,
  businessUnits,
  businesses,
  t,
  onFiltersChange,
}: {
  filters: InventoryLocationFiltersState;
  businessUnits: InventoryBusinessUnit[];
  businesses: InventoryBusiness[];
  t: InventoryTranslations;
  onFiltersChange: (filters: InventoryLocationFiltersState) => void;
}) {
  return (
    <SalesFilterBar title={t.filters.title} gridClassName="xl:grid-cols-4 2xl:grid-cols-5">
      <SalesFilterSearch
        className="2xl:col-span-2"
        label={t.filters.search}
        value={filters.search}
        onValueChange={(value) => onFiltersChange({ ...filters, search: value })}
        placeholder={t.filters.searchPlaceholder}
      />
        <SalesFilterSelect
          label={t.locationLabels.businessUnit}
          value={filters.businessUnitId}
          onValueChange={(value) => onFiltersChange({ ...filters, businessUnitId: value })}
          options={[{ value: 'all', label: t.common.all }, ...businessUnits.map((unit) => ({ value: unit.id, label: unit.name }))]}
        />
        <SalesFilterSelect
          label={t.locationLabels.business}
          value={filters.businessId}
          onValueChange={(value) => onFiltersChange({ ...filters, businessId: value })}
          options={[{ value: 'all', label: t.common.all }, ...businesses.map((business) => ({ value: business.id, label: business.name }))]}
        />
        <SalesFilterSelect
          label={t.locationLabels.status}
          value={filters.status}
          onValueChange={(value) => onFiltersChange({ ...filters, status: value as InventoryLocationFiltersState['status'] })}
          options={[
            { value: 'all', label: t.common.all },
            { value: 'active', label: t.locationLabels.active },
            { value: 'inactive', label: t.locationLabels.inactive },
          ]}
        />
        <SalesFilterSelect
          label={t.locationLabels.type}
          value={filters.type}
          onValueChange={(value) => onFiltersChange({ ...filters, type: value as InventoryLocationFiltersState['type'] })}
          options={[{ value: 'all', label: t.common.all }, ...locationTypes.map((type) => ({ value: type, label: t.locationTypes[type] }))]}
        />
        <SalesFilterSelect
          label={t.locationLabels.scope}
          value={filters.scopeType}
          onValueChange={(value) => onFiltersChange({ ...filters, scopeType: value as InventoryLocationFiltersState['scopeType'] })}
          options={[{ value: 'all', label: t.common.all }, ...scopeTypes.map((scopeType) => ({ value: scopeType, label: t.scopeTypes[scopeType] }))]}
        />
        <SalesFilterSelect
          label={t.locationLabels.sellable}
          value={filters.sellable}
          onValueChange={(value) => onFiltersChange({ ...filters, sellable: value as InventoryLocationFiltersState['sellable'] })}
          options={[
            { value: 'all', label: t.common.all },
            { value: 'sellable', label: t.locationLabels.sellable },
            { value: 'nonSellable', label: t.locationLabels.nonSellable },
          ]}
        />
        <SalesFilterSelect
          label={t.locationLabels.virtual}
          value={filters.physicalMode}
          onValueChange={(value) => onFiltersChange({ ...filters, physicalMode: value as InventoryLocationFiltersState['physicalMode'] })}
          options={[
            { value: 'all', label: t.common.all },
            { value: 'physical', label: t.locationLabels.physical },
            { value: 'virtual', label: t.locationLabels.virtual },
          ]}
        />
    </SalesFilterBar>
  );
}
