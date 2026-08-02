import { Clock3, UserCheck, Users, UserX } from 'lucide-react';

interface UsersKpiStripProps {
  items: Array<{
    label: string;
    tone: 'blue' | 'green' | 'yellow' | 'slate';
    value: number;
  }>;
}

const toneClasses: Record<UsersKpiStripProps['items'][number]['tone'], string> = {
  blue: 'text-[var(--indice-blue)] dark:text-blue-300',
  green: 'text-emerald-600 dark:text-emerald-300',
  yellow: 'text-amber-600 dark:text-amber-300',
  slate: 'text-slate-600 dark:text-slate-300',
};

const iconByTone = {
  blue: Users,
  green: UserCheck,
  yellow: Clock3,
  slate: UserX,
} as const;

export function UsersKpiStrip({ items }: UsersKpiStripProps) {
  return (
    <div className="grid grid-cols-2 gap-px bg-slate-200 dark:bg-slate-700 sm:grid-cols-4">
      {items.map((item) => {
        const Icon = iconByTone[item.tone];

        return (
          <div key={item.label} className="flex min-w-0 items-center gap-2.5 bg-white px-3 py-3 dark:bg-slate-800 sm:px-4">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-50 text-slate-500 dark:bg-slate-900 dark:text-slate-300">
              <Icon aria-hidden="true" className="h-4 w-4" />
            </span>
            <div className="min-w-0">
              <div className={`text-xl font-medium tabular-nums leading-none ${toneClasses[item.tone]}`}>{item.value}</div>
              <div className="mt-1 truncate text-xs text-slate-500 dark:text-slate-400">{item.label}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
