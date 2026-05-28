import type { InventoryTranslations } from '../../translations';
import type { InventoryWarehouseDistribution } from '../../types/inventoryTypes';
import { getDistributionHealth } from '../../utils/inventoryCalculations';

const toneByHealth = {
  healthy: 'border-emerald-200 bg-emerald-50 text-emerald-700 before:bg-emerald-500',
  lowStock: 'border-amber-200 bg-amber-50 text-amber-700 before:bg-amber-500',
  outOfStock: 'border-red-200 bg-red-50 text-red-700 before:bg-red-500',
  needsReview: 'border-blue-200 bg-blue-50 text-blue-700 before:bg-blue-500',
  inactive: 'border-slate-200 bg-slate-50 text-slate-500 before:bg-slate-400',
};

export function StockWarehouseDistribution({
  distributions,
  t,
}: {
  distributions: InventoryWarehouseDistribution[];
  t: InventoryTranslations;
}) {
  if (distributions.length === 0) {
    return <span className="text-xs font-bold text-slate-400">{t.common.notAvailable}</span>;
  }

  return (
    <div className="flex max-w-[360px] flex-wrap gap-1">
      {distributions.map((distribution) => {
        const health = getDistributionHealth(distribution.available, distribution.minimum);

        return (
          <span
            key={distribution.warehouseId}
            className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-[11px] font-black leading-none before:h-1.5 before:w-1.5 before:rounded-full ${toneByHealth[health]}`}
            title={`${distribution.warehouseName}: ${distribution.available}`}
          >
            <span className="max-w-[112px] truncate">{distribution.warehouseName}</span>
            <span className="tabular-nums">{distribution.available}</span>
          </span>
        );
      })}
    </div>
  );
}
