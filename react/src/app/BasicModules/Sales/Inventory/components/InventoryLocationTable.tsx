import { Badge } from '../../../../components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../../../../components/ui/table';
import { cn } from '../../../../components/ui/utils';
import type { InventoryLocation, InventoryStockItem } from '../types/inventoryTypes';
import type { InventoryTranslations } from '../translations';
import { formatInventoryCurrency } from '../utils/inventoryFormatters';
import { getLocationStockSummary } from '../utils/inventoryLocationMetrics';

function linkedLabel(location: InventoryLocation, t: InventoryTranslations) {
  if (location.scopeType === 'business') {
    return `${location.businessUnitName ?? t.common.notAvailable} / ${location.businessName ?? t.common.notAvailable}`;
  }

  if (location.scopeType === 'businessUnit') {
    return location.businessUnitName ?? t.common.notAvailable;
  }

  return t.scopeTypes.company;
}

export function InventoryLocationTable({
  locations,
  stockItems,
  t,
}: {
  locations: InventoryLocation[];
  stockItems: InventoryStockItem[];
  t: InventoryTranslations;
}) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800">
      <div className="border-b border-slate-100 p-5 dark:border-slate-700">
        <h3 className="text-xl font-medium text-slate-950 dark:text-white">{t.locationsView.tableTitle}</h3>
      </div>
      <div className="overflow-x-auto">
        <Table className="min-w-[1280px] table-fixed">
          <TableHeader>
            <TableRow className="border-slate-200 bg-slate-50 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:hover:bg-slate-900">
              <TableHead className="w-[270px] px-5 py-5 text-xs font-medium tracking-normal text-slate-500 dark:text-slate-300">{t.locationLabels.name}</TableHead>
              <TableHead className="w-[150px] px-5 py-5 text-xs font-medium tracking-normal text-slate-500 dark:text-slate-300">{t.locationLabels.type}</TableHead>
              <TableHead className="w-[160px] px-5 py-5 text-xs font-medium tracking-normal text-slate-500 dark:text-slate-300">{t.locationLabels.scope}</TableHead>
              <TableHead className="w-[260px] px-5 py-5 text-xs font-medium tracking-normal text-slate-500 dark:text-slate-300">{t.locationLabels.linkedTo}</TableHead>
              <TableHead className="w-[160px] px-5 py-5 text-xs font-medium tracking-normal text-slate-500 dark:text-slate-300">{t.locationsView.trackedSkus}</TableHead>
              <TableHead className="w-[170px] px-5 py-5 text-xs font-medium tracking-normal text-slate-500 dark:text-slate-300">{t.locationsView.estimatedValue}</TableHead>
              <TableHead className="w-[160px] px-5 py-5 text-xs font-medium tracking-normal text-slate-500 dark:text-slate-300">{t.locationLabels.status}</TableHead>
              <TableHead className="w-[190px] px-5 py-5 text-xs font-medium tracking-normal text-slate-500 dark:text-slate-300">{t.locationsView.manager}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {locations.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="px-5 py-12 text-center text-sm font-medium text-slate-500 dark:text-slate-300">{t.locationsView.empty}</TableCell>
              </TableRow>
            ) : locations.map((location) => {
              const summary = getLocationStockSummary(location, stockItems);

              return (
                <TableRow key={location.id} className="border-slate-200 align-top hover:bg-slate-50/80 dark:border-slate-700 dark:hover:bg-slate-700/40">
                  <TableCell className="px-5 py-5">
                    <p className="font-medium text-slate-950 dark:text-white">{location.name}</p>
                    <p className="mt-1 text-sm font-medium text-slate-500">{location.code}</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <Badge className={cn('rounded-full border', location.isVirtual ? 'border-[#2563EB]/25 bg-[#2563EB]/10 text-[#2563EB]' : 'border-emerald-200 bg-emerald-50 text-emerald-700')}>
                        {location.isVirtual ? t.locationLabels.virtual : t.locationLabels.physical}
                      </Badge>
                      <Badge className={cn('rounded-full border', location.isSellable ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-slate-200 bg-slate-100 text-slate-600')}>
                        {location.isSellable ? t.locationLabels.sellable : t.locationLabels.nonSellable}
                      </Badge>
                    </div>
                  </TableCell>
                  <TableCell className="px-5 py-5 font-medium text-slate-700 dark:text-slate-300">{t.locationTypes[location.type]}</TableCell>
                  <TableCell className="px-5 py-5 font-medium text-slate-700 dark:text-slate-300">{t.scopeTypes[location.scopeType]}</TableCell>
                  <TableCell className="px-5 py-5 font-medium text-slate-700 dark:text-slate-300">{linkedLabel(location, t)}</TableCell>
                  <TableCell className="px-5 py-5 font-medium text-slate-950 dark:text-white">{summary.trackedSkus}</TableCell>
                  <TableCell className="px-5 py-5 font-medium text-slate-950 dark:text-white">{formatInventoryCurrency(summary.estimatedValue)}</TableCell>
                  <TableCell className="px-5 py-5">
                    <Badge className={cn('rounded-full border px-2 py-1 text-xs font-medium', location.isActive ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-slate-200 bg-slate-100 text-slate-600')}>
                      {location.isActive ? t.locationLabels.active : t.locationLabels.inactive}
                    </Badge>
                  </TableCell>
                  <TableCell className="px-5 py-5 font-medium text-slate-700 dark:text-slate-300">{location.managerName ?? t.common.notAvailable}</TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </section>
  );
}
