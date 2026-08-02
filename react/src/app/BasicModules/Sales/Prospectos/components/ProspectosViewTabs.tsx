import { CalendarDays, KanbanSquare, ListChecks } from 'lucide-react';
import { cn } from '../../../../components/ui/utils';
import type { ProspectosCopy } from '../translations';
import type { OpportunityView } from '../types/prospectosTypes';

const viewOptions: Array<{
  id: OpportunityView;
  icon: typeof ListChecks;
}> = [
  { id: 'table', icon: ListChecks },
  { id: 'kanban', icon: KanbanSquare },
  { id: 'agenda', icon: CalendarDays },
];

export function ProspectosViewTabs({
  labels,
  activeView,
  onViewChange,
}: {
  labels: ProspectosCopy['views'];
  activeView: OpportunityView;
  onViewChange: (view: OpportunityView) => void;
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
                ? 'bg-[#FF6B5E] text-[#222831] shadow-md shadow-[#FF6B5E]/25'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-950',
            )}
          >
            <Icon className="h-4 w-4" aria-hidden="true" />
            {labels[view.id]}
          </button>
        );
      })}
    </div>
  );
}
