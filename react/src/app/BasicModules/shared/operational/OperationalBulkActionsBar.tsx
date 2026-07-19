import type { ReactNode } from 'react';
import { Button } from '../../../components/ui/button';
import { cn } from '../../../components/ui/utils';

type OperationalBulkActionTone = 'default' | 'success' | 'danger' | 'brand';

export interface OperationalBulkAction {
  id: string;
  label: string;
  icon?: ReactNode;
  tone?: OperationalBulkActionTone;
  disabled?: boolean;
  onClick: () => void;
}

interface OperationalBulkActionsBarProps {
  actions: ReadonlyArray<OperationalBulkAction>;
  accent?: 'aqua' | 'blue';
  children?: ReactNode;
  selectedLabel: string;
  title: string;
}

const actionToneClassNames: Record<OperationalBulkActionTone, string> = {
  default:
    'border-slate-200 bg-white text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100',
  success:
    'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:border-emerald-900/60 dark:bg-emerald-950/60 dark:text-emerald-300',
  danger:
    'border-red-200 bg-red-50 text-red-700 hover:bg-red-100 dark:border-red-900/60 dark:bg-red-950/60 dark:text-red-300',
  brand:
    'border-[#59C3A5]/30 bg-white text-[#177d66] hover:bg-[#59C3A5]/10 dark:border-[#59C3A5]/30 dark:bg-slate-900 dark:text-emerald-300',
};

export function OperationalBulkActionsBar({
  actions,
  accent = 'aqua',
  children,
  selectedLabel,
  title,
}: OperationalBulkActionsBarProps) {
  if (actions.length === 0 && !children) {
    return null;
  }

  const isBlue = accent === 'blue';

  return (
    <section className={`sticky bottom-[calc(1rem+env(safe-area-inset-bottom))] z-30 mb-4 rounded-xl border px-4 py-3 shadow-lg shadow-slate-950/10 backdrop-blur sm:static sm:shadow-sm sm:backdrop-blur-0 ${isBlue
      ? 'border-blue-200 bg-blue-50/95 dark:border-blue-800 dark:bg-blue-950/90'
      : 'border-[#59C3A5]/25 bg-[#59C3A5]/10 dark:border-[#59C3A5]/40 dark:bg-[#59C3A5]/15'}`}>
      <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex flex-wrap items-center gap-2 text-sm font-semibold text-slate-800 dark:text-slate-100">
          <span className={`rounded-md border bg-white px-3 py-1 text-sm font-extrabold dark:bg-slate-800 ${isBlue
            ? 'border-blue-200 text-blue-700 dark:border-blue-800 dark:text-blue-200'
            : 'border-[#59C3A5]/30 text-[#177d66] dark:text-emerald-200'}`}>
            {selectedLabel}
          </span>
          <span className="text-slate-500 dark:text-slate-400">{title}</span>
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] sm:flex-wrap sm:overflow-visible sm:pb-0 [&::-webkit-scrollbar]:hidden">
          {actions.map((action) => (
            <Button
              key={action.id}
              type="button"
              variant="outline"
              className={cn('h-9 rounded-md px-3 text-sm font-semibold shadow-none', actionToneClassNames[action.tone ?? 'default'])}
              disabled={action.disabled}
              onClick={action.onClick}
            >
              {action.icon}
              {action.label}
            </Button>
          ))}
        </div>
      </div>
      {children ? (
        <div className={`mt-3 border-t pt-3 ${isBlue ? 'border-blue-200 dark:border-blue-800' : 'border-[#59C3A5]/20 dark:border-[#59C3A5]/30'}`}>
          {children}
        </div>
      ) : null}
    </section>
  );
}
