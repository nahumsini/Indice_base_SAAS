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
    gray: 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-200',
    green: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
    blue: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
    orange: 'bg-[#FFF3F1] text-[#B63B32] dark:bg-[#FF6B5E]/15 dark:text-[#FFB0AA]',
  };

  return (
    <div className="rounded-[20px] border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-gray-800">
      <div className="flex items-center gap-3">
        <span className={`flex h-10 w-10 items-center justify-center rounded-xl ${tones[tone]}`}>
          <Icon className="h-5 w-5" />
        </span>
        <div>
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">{label}</p>
          <p className="text-lg font-medium text-slate-950 dark:text-white">{value}</p>
        </div>
      </div>
    </div>
  );
}
