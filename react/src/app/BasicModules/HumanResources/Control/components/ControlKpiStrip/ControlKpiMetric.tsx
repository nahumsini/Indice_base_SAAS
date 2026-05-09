import type { ReactNode } from 'react';

interface ControlKpiMetricProps {
  icon: ReactNode;
  label: string;
  value: string | number;
  valueClassName?: string;
}

export function ControlKpiMetric({
  icon,
  label,
  value,
  valueClassName = 'text-slate-900 dark:text-white',
}: ControlKpiMetricProps) {
  return (
    <div className="flex min-w-fit items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white text-slate-500 shadow-sm ring-1 ring-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-700">
        {icon}
      </span>
      <span className={`font-semibold ${valueClassName}`}>{value}</span>
      <span>{label}</span>
    </div>
  );
}
