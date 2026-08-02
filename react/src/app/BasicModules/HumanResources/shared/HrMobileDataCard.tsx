import type { ReactNode } from 'react';
import { cn } from '../../../components/ui/utils';

export interface HrMobileDataPoint {
  label: string;
  value: ReactNode;
}

interface HrMobileDataCardProps {
  accent?: 'aqua' | 'amber' | 'blue' | 'red';
  actions?: ReactNode;
  badges?: ReactNode;
  details?: HrMobileDataPoint[];
  leading?: ReactNode;
  onClick?: () => void;
  selected?: boolean;
  selection?: ReactNode;
  subtitle?: ReactNode;
  title: ReactNode;
}

const accentClasses = {
  aqua: 'border-l-[#59C3A5]',
  amber: 'border-l-amber-400',
  blue: 'border-l-blue-500',
  red: 'border-l-rose-500',
};

export function HrMobileDataCard({
  accent = 'aqua',
  actions,
  badges,
  details = [],
  leading,
  onClick,
  selected = false,
  selection,
  subtitle,
  title,
}: HrMobileDataCardProps) {
  return (
    <article
      onClick={onClick}
      className={cn(
        'rounded-[22px] border border-l-4 border-slate-200 bg-white p-4 shadow-sm transition dark:border-slate-700 dark:bg-slate-800',
        accentClasses[accent],
        onClick && 'cursor-pointer active:scale-[0.99]',
        selected && 'bg-[#EAF8F4] ring-1 ring-[#59C3A5]/30 dark:bg-[#102F29]',
      )}
    >
      <div className="flex items-start gap-3">
        {selection ? <div onClick={(event) => event.stopPropagation()}>{selection}</div> : null}
        {leading ? <div className="shrink-0">{leading}</div> : null}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="min-w-0">
              <h3 className="break-words text-sm font-medium text-slate-950 dark:text-white">{title}</h3>
              {subtitle ? <div className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">{subtitle}</div> : null}
            </div>
            {badges ? <div className="flex flex-wrap items-center gap-1.5">{badges}</div> : null}
          </div>

          {details.length > 0 ? (
            <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 border-t border-slate-100 pt-3 dark:border-slate-700">
              {details.map((detail) => (
                <div key={detail.label} className="min-w-0">
                  <dt className="text-[10px] font-medium text-slate-400 dark:text-slate-500">
                    {detail.label}
                  </dt>
                  <dd className="mt-1 break-words text-sm font-medium text-slate-700 dark:text-slate-200">
                    {detail.value}
                  </dd>
                </div>
              ))}
            </dl>
          ) : null}

          {actions ? (
            <div
              className="mt-4 flex flex-wrap justify-end gap-2 border-t border-slate-100 pt-3 dark:border-slate-700"
              onClick={(event) => event.stopPropagation()}
            >
              {actions}
            </div>
          ) : null}
        </div>
      </div>
    </article>
  );
}
