import { CalendarRange, Columns3, ListChecks } from 'lucide-react';
import { cn } from '../../../../components/ui/utils';
import type { AgendaTranslations } from '../translations';
import type { AgendaViewMode } from '../types';

const viewOptions: Array<{
  id: AgendaViewMode;
  icon: typeof ListChecks;
  label: keyof AgendaTranslations['header']['actions'];
}> = [
  { id: 'table', icon: ListChecks, label: 'table' },
  { id: 'kanban', icon: Columns3, label: 'kanban' },
  { id: 'diagram', icon: CalendarRange, label: 'diagram' },
];

export function AgendaViewTabs({
  activeView,
  labels,
  onViewChange,
}: {
  activeView: AgendaViewMode;
  labels: AgendaTranslations['header']['actions'];
  onViewChange: (view: AgendaViewMode) => void;
}) {
  return (
    <div className="mb-5 inline-flex max-w-full items-center overflow-x-auto rounded-lg border border-slate-200 bg-white p-1 shadow-sm dark:border-slate-700 dark:bg-slate-800">
      {viewOptions.map((view) => {
        const Icon = view.icon;
        const active = activeView === view.id;

        return (
          <button
            key={view.id}
            type="button"
            aria-pressed={active}
            onClick={() => onViewChange(view.id)}
            className={cn(
              'inline-flex h-11 shrink-0 items-center gap-2 rounded-lg px-4 text-sm font-medium transition-all',
              active
                ? 'bg-[#F4C84A] text-slate-950 shadow-md shadow-[#F4C84A]/25'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-950 dark:text-slate-300 dark:hover:bg-slate-700 dark:hover:text-white',
            )}
          >
            <Icon className="h-4 w-4" aria-hidden="true" />
            {labels[view.label]}
          </button>
        );
      })}
    </div>
  );
}
