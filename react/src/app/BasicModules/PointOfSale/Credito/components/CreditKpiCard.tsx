import type { LucideIcon } from 'lucide-react';

interface CreditKpiCardProps {
  icon: LucideIcon;
  label: string;
  value: string;
  tone?: 'gray' | 'green' | 'blue' | 'orange' | 'red';
}

const toneClasses: Record<NonNullable<CreditKpiCardProps['tone']>, string> = {
  gray: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-200',
  green: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
  blue: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  orange: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',
  red: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
};

export function CreditKpiCard({ icon: Icon, label, value, tone = 'gray' }: CreditKpiCardProps) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800">
      <div className="flex items-center gap-3">
        <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${toneClasses[tone]}`}>
          <Icon className="h-5 w-5" />
        </span>
        <div className="min-w-0">
          <p className="truncate text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">{label}</p>
          <p className="truncate text-lg font-black text-gray-950 dark:text-white">{value}</p>
        </div>
      </div>
    </div>
  );
}
