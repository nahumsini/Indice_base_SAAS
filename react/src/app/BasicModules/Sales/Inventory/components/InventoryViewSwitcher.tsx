import type { InventoryTranslations } from '../translations';
import type { InventoryOperationalView } from '../types/inventoryTypes';

const views: InventoryOperationalView[] = ['stock', 'warehouses', 'movements'];

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
    <div className="inline-flex rounded-lg border border-slate-200 bg-white p-1 shadow-sm">
      {views.map((view) => (
        <button
          key={view}
          type="button"
          className={`h-9 rounded-md px-4 text-sm font-black transition ${activeView === view ? 'bg-[#FF6B5E] text-white shadow-sm' : 'text-slate-600 hover:bg-slate-50'}`}
          onClick={() => onViewChange(view)}
        >
          {t.operational.views[view]}
        </button>
      ))}
    </div>
  );
}
