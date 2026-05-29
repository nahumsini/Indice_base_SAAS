import { BadgePercent, CircleDollarSign } from 'lucide-react';
import { Button } from '../../../../components/ui/button';
import { cn } from '../../../../components/ui/utils';
import type { SalesRecordsTranslations } from '../translations';
import type { CommissionViewMode } from '../types/commissions';

export function SalesViewSwitcher({
  activeView,
  t,
  onViewChange,
}: {
  activeView: CommissionViewMode;
  t: SalesRecordsTranslations;
  onViewChange: (view: CommissionViewMode) => void;
}) {
  const views: Array<{ id: CommissionViewMode; label: string; icon: typeof CircleDollarSign }> = [
    { id: 'sales', label: t.viewSwitcher.sales, icon: CircleDollarSign },
    { id: 'commissions', label: t.viewSwitcher.commissions, icon: BadgePercent },
  ];

  return (
    <div className="flex w-fit flex-wrap gap-1 rounded-lg border border-slate-200 bg-white p-1 shadow-sm dark:border-slate-700 dark:bg-slate-900">
      {views.map((view) => {
        const Icon = view.icon;
        const active = activeView === view.id;

        return (
          <Button
            key={view.id}
            type="button"
            variant={active ? 'default' : 'ghost'}
            className={cn(
              'h-10 rounded-lg px-4 text-sm font-bold',
              active
                ? 'bg-[#FF6B5E] text-white shadow-sm shadow-[#FF6B5E]/20 hover:bg-[#E8564B]'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-950 dark:text-slate-300 dark:hover:bg-slate-800',
            )}
            onClick={() => onViewChange(view.id)}
          >
            <Icon className="h-4 w-4" />
            {view.label}
          </Button>
        );
      })}
    </div>
  );
}
