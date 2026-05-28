import { ArrowRightLeft, Boxes, MapPinned } from 'lucide-react';
import { cn } from '../../../../components/ui/utils';
import type { InventorySubview } from '../types/inventoryTypes';
import type { InventoryTranslations } from '../translations';

const tabIcons = {
  stock: Boxes,
  locations: MapPinned,
  movements: ArrowRightLeft,
};

export function InventoryInternalTabs({
  activeView,
  t,
  onViewChange,
}: {
  activeView: InventorySubview;
  t: InventoryTranslations;
  onViewChange: (view: InventorySubview) => void;
}) {
  const views: InventorySubview[] = ['stock', 'locations', 'movements'];

  return (
    <div className="inline-flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 bg-white p-1.5 shadow-sm">
      {views.map((view) => {
        const Icon = tabIcons[view];
        const active = activeView === view;

        return (
          <button
            key={view}
            type="button"
            onClick={() => onViewChange(view)}
            className={cn(
              'inline-flex h-11 items-center gap-2 rounded-lg px-4 text-sm font-black transition-all',
              active
                ? 'bg-[#FF6B5E] text-white shadow-sm shadow-[#FF6B5E]/25'
                : 'text-slate-600 hover:bg-slate-50 hover:text-slate-950',
            )}
          >
            <Icon className="h-4 w-4" />
            {t.subviews[view]}
          </button>
        );
      })}
    </div>
  );
}
