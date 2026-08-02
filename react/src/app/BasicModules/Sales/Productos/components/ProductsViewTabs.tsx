import { Grid2X2, Table2 } from 'lucide-react';
import { cn } from '../../../../components/ui/utils';
import type { ProductView } from '../types/productosTypes';

const viewOptions: Array<{
  id: ProductView;
  labelKey: 'table' | 'cards';
  icon: typeof Table2;
}> = [
  { id: 'table', labelKey: 'table', icon: Table2 },
  { id: 'cards', labelKey: 'cards', icon: Grid2X2 },
];

export function ProductsViewTabs({
  activeView,
  labels,
  onViewChange,
}: {
  activeView: ProductView;
  labels: Record<'table' | 'cards', string>;
  onViewChange: (view: ProductView) => void;
}) {
  return (
    <div className="inline-flex w-fit items-center rounded-lg border border-slate-200 bg-white p-1 shadow-sm">
      {viewOptions.map((view) => {
        const Icon = view.icon;
        const active = activeView === view.id;

        return (
          <button
            key={view.id}
            type="button"
            onClick={() => onViewChange(view.id)}
            className={cn(
              'inline-flex h-11 items-center gap-2 rounded-lg px-4 text-sm font-medium transition-all',
              active
                ? 'bg-[#FF6B5E] text-[#222831] shadow-sm shadow-[#FF6B5E]/20'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-950',
            )}
          >
            <Icon className="h-4 w-4" aria-hidden="true" />
            {labels[view.labelKey]}
          </button>
        );
      })}
    </div>
  );
}

