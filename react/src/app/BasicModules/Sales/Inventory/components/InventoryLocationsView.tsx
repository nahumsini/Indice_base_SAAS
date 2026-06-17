import { Columns3, MapPinned, Plus } from 'lucide-react';
import { Button } from '../../../../components/ui/button';
import {
  SalesTitleBar,
  salesTitleBarPrimaryActionClassName,
  salesTitleBarSecondaryActionClassName,
} from '../../components/SalesTitleBar';
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
  onOpenColumns,
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
  onOpenColumns?: () => void;
}) {
  const active = locations.filter((location) => location.isActive).length;
  const unitLinked = locations.filter((location) => location.scopeType === 'businessUnit').length;
  const businessLinked = locations.filter((location) => location.scopeType === 'business').length;
  const virtual = locations.filter((location) => location.isVirtual).length;

  return (
    <section className="space-y-5">
      <SalesTitleBar
        icon={<MapPinned className="h-7 w-7" />}
        title={t.locationsView.title}
        subtitle={t.locationsView.subtitle}
        actions={(
          <>
            {onOpenColumns ? (
              <Button variant="outline" className={salesTitleBarSecondaryActionClassName} onClick={onOpenColumns}>
                <Columns3 className="h-4 w-4" />
                {t.locationsView.secondaryAction}
              </Button>
            ) : null}
            <Button className={salesTitleBarPrimaryActionClassName} onClick={onNewLocation}>
              <Plus className="h-4 w-4" />
              {t.locationsView.primaryAction}
            </Button>
          </>
        )}
      />

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
