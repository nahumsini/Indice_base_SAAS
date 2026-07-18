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
    <section className="rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm dark:border-slate-700 dark:bg-slate-800 sm:px-6">
      <div className="grid grid-cols-2 divide-x divide-slate-200 dark:divide-slate-700 sm:grid-cols-4">
        {items.map((item) => (
          <div key={item.label} className="flex items-center justify-center gap-3 px-3 py-2 first:pl-0 last:pr-0">
            {(() => {
              const Icon = iconByTone[item.tone];
              return (
                <span className="hidden h-10 w-10 items-center justify-center rounded-xl bg-slate-50 text-slate-500 dark:bg-slate-900 dark:text-slate-300 lg:flex">
                  <Icon aria-hidden="true" className="h-5 w-5" />
                </span>
              );
            })()}
            <div className="text-center sm:text-left">
              <div className={`text-2xl font-bold leading-none sm:text-3xl ${toneClasses[item.tone]}`}>{item.value}</div>
              <div className="mt-1 text-xs font-medium text-slate-600 dark:text-slate-300 sm:text-sm">{item.label}</div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
import { Clock3, UserCheck, Users, UserX } from 'lucide-react';
