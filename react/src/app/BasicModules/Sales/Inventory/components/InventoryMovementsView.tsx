import { useMemo, useState } from 'react';
import { Input } from '../../../../components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../../../components/ui/select';
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
      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="mb-4 text-lg font-bold text-slate-950">{t.filters.title}</h3>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
          <FilterSelect
            label={t.modal.movementType}
            value={filters.movementType}
            onValueChange={(value) => setFilters({ ...filters, movementType: value as 'all' | InventoryMovementType })}
            options={[{ value: 'all', label: t.common.all }, ...movementTypes.map((type) => ({ value: type, label: t.movementTypes[type] }))]}
          />
          <FilterSelect
            label={t.filters.location}
            value={filters.locationId}
            onValueChange={(value) => setFilters({ ...filters, locationId: value })}
            options={[{ value: 'all', label: t.common.all }, ...locations.map((location) => ({ value: location.id, label: location.name }))]}
          />
          <FilterSelect
            label={t.modal.item}
            value={filters.productId}
            onValueChange={(value) => setFilters({ ...filters, productId: value })}
            options={[{ value: 'all', label: t.common.all }, ...stockItems.map((item) => ({ value: item.productId, label: item.name }))]}
          />
          <FilterSelect
            label={t.locationLabels.status}
            value={filters.status}
            onValueChange={(value) => setFilters({ ...filters, status: value as 'all' | InventoryMovementStatus })}
            options={[{ value: 'all', label: t.common.all }, ...statuses.map((status) => ({ value: status, label: t.movementStatuses[status] }))]}
          />
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700">{t.filters.dateFrom}</label>
              <Input type="date" value={filters.dateFrom} onChange={(event) => setFilters({ ...filters, dateFrom: event.target.value })} className="h-11 rounded-lg border-slate-200" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700">{t.filters.dateTo}</label>
              <Input type="date" value={filters.dateTo} onChange={(event) => setFilters({ ...filters, dateTo: event.target.value })} className="h-11 rounded-lg border-slate-200" />
            </div>
          </div>
        </div>
      </section>
      <InventoryMovementHistory movements={filteredMovements} t={t} />
    </section>
  );
}
