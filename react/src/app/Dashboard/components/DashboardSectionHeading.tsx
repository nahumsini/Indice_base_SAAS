import type { ReactNode } from 'react';

interface DashboardSectionHeadingProps {
  icon: ReactNode;
  title: string;
  description?: string;
  count?: number;
  action?: ReactNode;
}

export function DashboardSectionHeading({ icon, title, description, count, action }: DashboardSectionHeadingProps) {
  return (
    <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-5">
      <div className="min-w-0">
        <div className="flex items-center gap-3">
          <span aria-hidden="true" className="flex size-8 shrink-0 items-center justify-center text-[28px] leading-none">{icon}</span>
          <h2 className="min-w-0 text-xl font-semibold leading-tight tracking-tight text-slate-900 dark:text-white sm:text-2xl lg:text-[28px]">{title}</h2>
          {count !== undefined && count > 0 && (
            <span className="shrink-0 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium tabular-nums text-slate-600 dark:bg-slate-800 dark:text-slate-300">{count}</span>
          )}
        </div>
        {description && <p className="mt-1.5 pl-11 text-sm leading-5 text-slate-600 dark:text-slate-300">{description}</p>}
      </div>
      {action && <div className="shrink-0 self-start">{action}</div>}
    </div>
  );
}
