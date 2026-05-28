import { Search } from 'lucide-react';
import { Input } from '../../../../components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../../../components/ui/select';
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

function FilterSelect({
  label,
  value,
  options,
  onValueChange,
}: {
  label: string;
  value: string;
  options: Array<{ value: string; label: string }>;
  onValueChange: (value: string) => void;
}) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-bold text-slate-700">{label}</label>
      <Select value={value} onValueChange={onValueChange}>
        <SelectTrigger className="h-11 rounded-lg border-slate-200 bg-white px-4 text-base font-semibold text-slate-950 shadow-none focus:border-[#FF6B5E] focus:ring-[#FF6B5E]/20">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}
        </SelectContent>
      </Select>
    </div>
  );
}

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
    <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <h3 className="mb-4 text-lg font-bold text-slate-950">{t.filters.title}</h3>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="space-y-2">
          <label className="text-sm font-bold text-slate-700">{t.filters.search}</label>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              value={filters.search}
              onChange={(event) => onFiltersChange({ ...filters, search: event.target.value })}
              placeholder={t.filters.searchPlaceholder}
              className="h-11 rounded-lg border-slate-200 bg-white pl-10 text-slate-900 shadow-none placeholder:text-slate-400 focus:border-[#FF6B5E] focus:ring-[#FF6B5E]/20"
            />
          </div>
        </div>
        <FilterSelect
          label={t.locationLabels.type}
          value={filters.type}
          onValueChange={(value) => onFiltersChange({ ...filters, type: value as InventoryLocationFiltersState['type'] })}
          options={[{ value: 'all', label: t.common.all }, ...locationTypes.map((type) => ({ value: type, label: t.locationTypes[type] }))]}
        />
        <FilterSelect
          label={t.locationLabels.scope}
          value={filters.scopeType}
          onValueChange={(value) => onFiltersChange({ ...filters, scopeType: value as InventoryLocationFiltersState['scopeType'] })}
          options={[{ value: 'all', label: t.common.all }, ...scopeTypes.map((scopeType) => ({ value: scopeType, label: t.scopeTypes[scopeType] }))]}
        />
        <FilterSelect
          label={t.locationLabels.businessUnit}
          value={filters.businessUnitId}
          onValueChange={(value) => onFiltersChange({ ...filters, businessUnitId: value })}
          options={[{ value: 'all', label: t.common.all }, ...businessUnits.map((unit) => ({ value: unit.id, label: unit.name }))]}
        />
        <FilterSelect
          label={t.locationLabels.business}
          value={filters.businessId}
          onValueChange={(value) => onFiltersChange({ ...filters, businessId: value })}
          options={[{ value: 'all', label: t.common.all }, ...businesses.map((business) => ({ value: business.id, label: business.name }))]}
        />
        <FilterSelect
          label={t.locationLabels.status}
          value={filters.status}
          onValueChange={(value) => onFiltersChange({ ...filters, status: value as InventoryLocationFiltersState['status'] })}
          options={[
            { value: 'all', label: t.common.all },
            { value: 'active', label: t.locationLabels.active },
            { value: 'inactive', label: t.locationLabels.inactive },
          ]}
        />
        <FilterSelect
          label={t.locationLabels.sellable}
          value={filters.sellable}
          onValueChange={(value) => onFiltersChange({ ...filters, sellable: value as InventoryLocationFiltersState['sellable'] })}
          options={[
            { value: 'all', label: t.common.all },
            { value: 'sellable', label: t.locationLabels.sellable },
            { value: 'nonSellable', label: t.locationLabels.nonSellable },
          ]}
        />
        <FilterSelect
          label={t.locationLabels.virtual}
          value={filters.physicalMode}
          onValueChange={(value) => onFiltersChange({ ...filters, physicalMode: value as InventoryLocationFiltersState['physicalMode'] })}
          options={[
            { value: 'all', label: t.common.all },
            { value: 'physical', label: t.locationLabels.physical },
            { value: 'virtual', label: t.locationLabels.virtual },
          ]}
        />
      </div>
    </section>
  );
}
