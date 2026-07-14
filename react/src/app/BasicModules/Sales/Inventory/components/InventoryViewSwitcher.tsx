import { Archive, History, Warehouse } from 'lucide-react';
import type { InventoryTranslations } from '../translations';
import type { InventoryOperationalView } from '../types/inventoryTypes';

const views: Array<{
  id: InventoryOperationalView;
  icon: typeof Archive;
}> = [
  { id: 'stock', icon: Archive },
  { id: 'warehouses', icon: Warehouse },
  { id: 'movements', icon: History },
];

export function InventoryViewSwitcher({
  activeView,
  t,
  onViewChange,
}: {
  activeView: InventoryOperationalView;
  t: InventoryTranslations;
  onViewChange: (view: InventoryOperationalView) => void;
}) {
  return (
    <div className="inline-flex rounded-lg border border-slate-200 bg-white p-1 shadow-sm dark:border-slate-700 dark:bg-slate-900">
      {views.map((view) => {
        const Icon = view.icon;
        const active = activeView === view.id;

        return (
          <button
            key={view.id}
            type="button"
            className={`flex h-10 items-center gap-2 rounded-lg px-4 text-sm font-medium transition ${
              active
                ? 'bg-[#FF6B5E] text-white shadow-md shadow-[#FF6B5E]/20'
                : 'text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800'
            }`}
            onClick={() => onViewChange(view.id)}
          >
            <Icon className="h-4 w-4" />
            {t.operational.views[view.id]}
          </button>
        );
      })}
    </div>
  );
}
