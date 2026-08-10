import { Clock3, UserCheck, Users, UserX } from 'lucide-react';

type UsersKpiTone = 'blue' | 'green' | 'yellow' | 'slate';

interface UsersKpiItem {
  label: string;
  tone: UsersKpiTone;
  value: number | string;
}

interface UsersKpiStripProps {
  insight: string;
  items: UsersKpiItem[];
  statusItems: Array<UsersKpiItem & { value: number }>;
}

const toneClasses = {
  blue: 'text-[var(--indice-blue)] dark:text-blue-300',
  green: 'text-emerald-600 dark:text-emerald-300',
  yellow: 'text-amber-600 dark:text-amber-300',
  slate: 'text-slate-600 dark:text-slate-300',
} as const;

const segmentClasses = { blue: 'bg-blue-500', green: 'bg-emerald-500', yellow: 'bg-amber-500', slate: 'bg-slate-400' } as const;
const iconByTone = { blue: Users, green: UserCheck, yellow: Clock3, slate: UserX } as const;

export function UsersKpiStrip({ insight, items, statusItems }: UsersKpiStripProps) {
  const statusTotal = statusItems.reduce((sum, item) => sum + Math.max(0, item.value), 0);

  return (
    <div className="flex min-w-0 flex-1 flex-col gap-3 px-4 py-3 xl:flex-row xl:items-center xl:justify-between">
      <div className="flex gap-x-4 gap-y-3 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] sm:flex-wrap sm:overflow-visible sm:pb-0 [&::-webkit-scrollbar]:hidden">
        {items.map((item, index) => {
          const Icon = iconByTone[item.tone];
          return (
            <div key={`${item.tone}-${item.label}`} className="flex items-center gap-3">
              {index > 0 ? <span className="hidden text-slate-300 sm:inline dark:text-slate-600">|</span> : null}
              <span className="flex min-w-fit items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
                <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-white shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-700 ${toneClasses[item.tone]}`}>
                  <Icon aria-hidden="true" className="h-4 w-4" />
                </span>
                <strong className={`font-medium tabular-nums ${toneClasses[item.tone]}`}>{item.value}</strong>
                <span>{item.label}</span>
              </span>
            </div>
          );
        })}
      </div>

      <div className="min-w-0 xl:w-[36%] xl:max-w-md">
        <div className="flex h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-700" aria-hidden="true">
          {statusItems.map((item) => (
            <span
              key={`${item.tone}-${item.label}`}
              className={segmentClasses[item.tone]}
              style={{ width: statusTotal > 0 ? `${(item.value / statusTotal) * 100}%` : '0%' }}
            />
          ))}
        </div>
        <div className="mt-1.5 flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-[11px] text-slate-500 dark:text-slate-400">
          <span>{insight}</span>
          <span className="flex flex-wrap gap-2">
            {statusItems.map((item) => (
              <span key={item.label} className="inline-flex items-center gap-1">
                <span className={`h-1.5 w-1.5 rounded-full ${segmentClasses[item.tone]}`} />
                {item.value} {item.label}
              </span>
            ))}
          </span>
        </div>
      </div>
    </div>
  );
}
