import { MapPinned } from 'lucide-react';
import { Badge } from '../../../../components/ui/badge';
import { cn } from '../../../../components/ui/utils';
import type { InventoryLocation, InventoryStockItem } from '../types/inventoryTypes';
import type { InventoryTranslations } from '../translations';
import { formatInventoryCurrency } from '../utils/inventoryFormatters';
import { getLocationStockSummary } from '../utils/inventoryLocationMetrics';

export function InventoryLocationCards({
  locations,
  stockItems,
  t,
}: {
  locations: InventoryLocation[];
  stockItems: InventoryStockItem[];
  t: InventoryTranslations;
}) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <h3 className="mb-4 text-lg font-black text-slate-950">{t.locationsView.cardsTitle}</h3>
      <div className="grid gap-4 lg:grid-cols-3">
        {locations.slice(0, 3).map((location) => {
          const summary = getLocationStockSummary(location, stockItems);

          return (
            <article key={location.id} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-start gap-3">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-[#FF6B5E]/25 bg-[#FF6B5E]/10 text-[#B63B32]">
                  <MapPinned className="h-5 w-5" />
                </span>
                <div className="min-w-0">
                  <p className="truncate font-black text-slate-950">{location.name}</p>
                  <p className="mt-1 text-sm font-semibold text-slate-500">{location.code}</p>
                </div>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <Badge className="rounded-full border border-[#FF6B5E]/25 bg-[#FF6B5E]/10 text-[#B63B32]">{t.locationTypes[location.type]}</Badge>
                <Badge className="rounded-full border border-slate-200 bg-slate-100 text-slate-600">{t.scopeTypes[location.scopeType]}</Badge>
                <Badge className={cn('rounded-full border', location.isVirtual ? 'border-[#2563EB]/25 bg-[#2563EB]/10 text-[#2563EB]' : 'border-emerald-200 bg-emerald-50 text-emerald-700')}>
                  {location.isVirtual ? t.locationLabels.virtual : t.locationLabels.physical}
                </Badge>
              </div>
              <div className="mt-4 grid grid-cols-3 gap-2 rounded-lg bg-slate-50 p-3">
                <div>
                  <p className="text-xs font-bold text-slate-500">{t.locationsView.trackedSkus}</p>
                  <p className="mt-1 font-black text-slate-950">{summary.trackedSkus}</p>
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-500">{t.locationsView.estimatedValue}</p>
                  <p className="mt-1 font-black text-slate-950">{formatInventoryCurrency(summary.estimatedValue)}</p>
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-500">{t.locationsView.lastMovement}</p>
                  <p className="mt-1 font-black text-slate-950">{summary.lastMovement ?? t.common.notAvailable}</p>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
