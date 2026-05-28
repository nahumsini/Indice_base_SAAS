import { cn } from '../../../../components/ui/utils';
import type { InventoryStatus, InventoryStockItem } from '../types/inventoryTypes';
import type { InventoryTranslations } from '../translations';
import { inventoryStatusBarTone } from '../utils/inventoryStatus';

const statusOrder: InventoryStatus[] = ['healthy', 'lowStock', 'outOfStock', 'notTracked'];

export function InventoryStatusBar({
  counts,
  total,
  t,
}: {
  counts: Record<InventoryStatus, number>;
  total: number;
  t: InventoryTranslations;
}) {
  return (
    <div className="grid grid-cols-1 gap-3 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-center">
      <div className="flex h-3 overflow-hidden rounded-full bg-slate-200">
        {statusOrder.map((status) => {
          const width = total > 0 ? (counts[status] / total) * 100 : 0;
          return <div key={status} className={cn('h-full', inventoryStatusBarTone[status])} style={{ width: `${width}%` }} aria-hidden="true" />;
        })}
      </div>
      <div className="flex flex-wrap gap-3 text-sm font-semibold text-slate-500">
        {statusOrder.map((status) => (
          <span key={status} className="inline-flex items-center gap-2">
            <span className={cn('h-2.5 w-2.5 rounded-full', inventoryStatusBarTone[status])} />
            {t.status[status]}
          </span>
        ))}
      </div>
    </div>
  );
}

export function hasOnlyUntrackedItems(items: InventoryStockItem[]) {
  return items.length > 0 && items.every((item) => !item.usesInventory);
}
