import type { LucideIcon } from 'lucide-react';

interface DiscountKpiCardProps {
  icon: LucideIcon;
  label: string;
  value: string;
  tone?: 'gray' | 'green' | 'blue' | 'orange';
}

export function DiscountKpiCard({
  icon: Icon,
  label,
  value,
  tone = 'gray',
}: DiscountKpiCardProps) {
  const tones = {
    gray: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-200',
    green: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
    blue: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
    orange: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',
  };

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800">
      <div className="flex items-center gap-3">
        <span className={`flex h-10 w-10 items-center justify-center rounded-lg ${tones[tone]}`}>
          <Icon className="h-5 w-5" />
        </span>
        <div>
          <p className="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">{label}</p>
          <p className="text-lg font-black text-gray-950 dark:text-white">{value}</p>
        </div>
      </div>
    </div>
  );
}
