import type { LucideIcon } from 'lucide-react';
import { cn } from '../../components/ui/utils';

export type KioskStatusNavigatorItem<Value extends string> = {
  icon: LucideIcon;
  label: string;
  tone: 'aqua' | 'green' | 'amber' | 'slate';
  value: Value;
  count: number;
};

const toneClasses = {
  aqua: {
    active: 'border-[#59C3A5] bg-[#59C3A5]/15 text-[#176B5B] dark:border-[#59C3A5]/70 dark:bg-emerald-950/40 dark:text-emerald-200',
    icon: 'bg-[#59C3A5]/15 text-[#177D66] dark:bg-emerald-950/60 dark:text-emerald-300',
  },
  green: {
    active: 'border-emerald-300 bg-emerald-50 text-emerald-800 dark:border-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-200',
    icon: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300',
  },
  amber: {
    active: 'border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-200',
    icon: 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300',
  },
  slate: {
    active: 'border-slate-400 bg-slate-100 text-slate-800 dark:border-slate-500 dark:bg-slate-800 dark:text-slate-100',
    icon: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300',
  },
} as const;

export function KioskStatusNavigator<Value extends string>({
  ariaLabel,
  items,
  onValueChange,
  value,
}: {
  ariaLabel: string;
  items: Array<KioskStatusNavigatorItem<Value>>;
  onValueChange: (value: Value) => void;
  value: Value;
}) {
  return (
    <section className="grid gap-3 sm:grid-cols-3" aria-label={ariaLabel}>
      {items.map((item) => {
        const active = item.value === value;
        const Icon = item.icon;
        return (
          <button
            key={item.value}
            type="button"
            aria-pressed={active}
            onClick={() => onValueChange(item.value)}
            className={cn(
              'flex min-h-20 items-center gap-3 rounded-2xl border bg-white p-4 text-left shadow-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#59C3A5]/40 dark:bg-slate-900',
              active
                ? toneClasses[item.tone].active
                : 'border-slate-200 text-slate-700 hover:border-[#59C3A5]/60 hover:bg-[#59C3A5]/5 dark:border-slate-700 dark:text-slate-200 dark:hover:border-emerald-700',
            )}
          >
            <span className={cn('grid h-10 w-10 shrink-0 place-items-center rounded-xl', toneClasses[item.tone].icon)}>
              <Icon aria-hidden="true" className="h-5 w-5" />
            </span>
            <span className="min-w-0">
              <span className="block text-xl font-medium tabular-nums text-slate-950 dark:text-white">{item.count}</span>
              <span className="block truncate text-xs font-normal text-slate-500 dark:text-slate-400">{item.label}</span>
            </span>
          </button>
        );
      })}
    </section>
  );
}
