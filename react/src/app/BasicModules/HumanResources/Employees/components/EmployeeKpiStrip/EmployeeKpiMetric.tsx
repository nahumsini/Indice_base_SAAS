import type { ReactNode } from 'react';

interface EmployeeKpiMetricProps {
  icon: ReactNode;
  label: string;
  value: string | number;
  valueClassName?: string;
  helper?: string;
}

export function EmployeeKpiMetric({
  icon,
  label,
  value,
  valueClassName = 'text-slate-900 dark:text-white',
  helper,
}: EmployeeKpiMetricProps) {
  return (
    <div className="flex min-w-fit items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white text-slate-500 shadow-sm ring-1 ring-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-700">
        {icon}
      </span>
      <span className={`font-semibold ${valueClassName}`}>{value}</span>
      <span>{label}</span>
      {helper ? (
        <span className="text-xs text-slate-400 dark:text-slate-500">{helper}</span>
      ) : null}
    </div>
  );
}

