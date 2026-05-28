import { Columns3, MapPinned, Plus } from 'lucide-react';
import { Button } from '../../../../components/ui/button';
import type {
  InventoryBusiness,
  InventoryBusinessUnit,
  InventoryLocation,
  InventoryLocationFiltersState,
  InventoryStockItem,
} from '../types/inventoryTypes';
import type { InventoryTranslations } from '../translations';
import { InventoryLocationCards } from './InventoryLocationCards';
import { InventoryLocationFilters } from './InventoryLocationFilters';
import { InventoryLocationTable } from './InventoryLocationTable';

export function InventoryLocationsView({
  locations,
  filteredLocations,
  stockItems,
  filters,
  businessUnits,
  businesses,
  t,
  onFiltersChange,
  onNewLocation,
}: {
  locations: InventoryLocation[];
  filteredLocations: InventoryLocation[];
  stockItems: InventoryStockItem[];
  filters: InventoryLocationFiltersState;
  businessUnits: InventoryBusinessUnit[];
  businesses: InventoryBusiness[];
  t: InventoryTranslations;
  onFiltersChange: (filters: InventoryLocationFiltersState) => void;
  onNewLocation: () => void;
}) {
  const active = locations.filter((location) => location.isActive).length;
  const unitLinked = locations.filter((location) => location.scopeType === 'businessUnit').length;
  const businessLinked = locations.filter((location) => location.scopeType === 'business').length;
  const virtual = locations.filter((location) => location.isVirtual).length;

  return (
    <section className="space-y-5">
      <div className="rounded-lg border border-[#FF6B5E]/30 bg-[#FF6B5E]/10 p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h3 className="mb-1 flex items-center gap-2 text-2xl font-semibold text-slate-900">
              <MapPinned className="h-6 w-6 text-[#B63B32]" />
              {t.locationsView.title}
            </h3>
            <p className="max-w-3xl text-sm font-medium leading-6 text-slate-600">{t.locationsView.subtitle}</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button variant="outline" className="h-10 gap-2 rounded-lg border-[#FF6B5E]/25 bg-white px-4 text-sm font-semibold text-[#B63B32] shadow-none hover:bg-[#FF6B5E]/10">
              <Columns3 className="h-4 w-4" />
              {t.locationsView.secondaryAction}
            </Button>
            <Button className="h-10 gap-2 rounded-lg bg-[#FF6B5E] px-4 text-sm font-semibold text-white shadow-sm shadow-[#FF6B5E]/20 hover:bg-[#E85C50]" onClick={onNewLocation}>
              <Plus className="h-4 w-4" />
              {t.locationsView.primaryAction}
            </Button>
          </div>
        </div>
      </div>

      <div className="flex items-start gap-3 rounded-lg border border-[#FF6B5E]/25 bg-[#FF6B5E]/10 px-5 py-4 text-sm font-semibold text-slate-700">
        <MapPinned className="mt-0.5 h-4 w-4 shrink-0 text-[#B63B32]" />
        <p>{t.locationsView.insight(active, unitLinked, businessLinked, virtual)}</p>
      </div>

      <InventoryLocationFilters
        filters={filters}
        businessUnits={businessUnits}
        businesses={businesses}
        t={t}
        onFiltersChange={onFiltersChange}
      />
      <InventoryLocationCards locations={filteredLocations} stockItems={stockItems} t={t} />
      <InventoryLocationTable locations={filteredLocations} stockItems={stockItems} t={t} />
    </section>
  );
}
