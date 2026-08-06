import { Clock3, Info, UserCheck, Users, UserX } from 'lucide-react';
import { OperationalKpiArea } from '../../../shared/operational';

interface UsersKpiStripProps {
  items: Array<{
    label: string;
    tone: 'blue' | 'green' | 'yellow' | 'slate';
    value: number;
  }>;
}

const toneClasses = {
  blue: 'text-[var(--indice-blue)] dark:text-blue-300',
  green: 'text-emerald-600 dark:text-emerald-300',
  yellow: 'text-amber-600 dark:text-amber-300',
  slate: 'text-slate-600 dark:text-slate-300',
} as const;

const segmentClasses = { blue: 'bg-blue-500', green: 'bg-emerald-500', yellow: 'bg-amber-500', slate: 'bg-slate-400' } as const;
const iconByTone = { blue: Users, green: UserCheck, yellow: Clock3, slate: UserX } as const;

export function UsersKpiStrip({ items }: UsersKpiStripProps) {
  const total = items[0]?.value ?? items.reduce((sum, item) => sum + item.value, 0);

  return (
    <OperationalKpiArea
      metrics={items.map((item, index) => {
        const Icon = iconByTone[item.tone];
        return { id: `${item.tone}-${index}`, icon: <Icon className="h-4 w-4" />, label: item.label, value: item.value, valueClassName: toneClasses[item.tone] };
      })}
      distributionSegments={items.slice(1).map((item, index) => ({
        id: `${item.tone}-${index}`,
        label: item.label,
        count: item.value,
        className: segmentClasses[item.tone],
      }))}
      insight={`${total} ${items[0]?.label?.toLocaleLowerCase() ?? 'registros'} en el alcance actual.`}
      insightIcon={<Info className="h-4 w-4" />}
    />
  );
}
