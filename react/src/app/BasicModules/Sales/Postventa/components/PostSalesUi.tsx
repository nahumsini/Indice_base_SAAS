import type { ReactNode } from 'react';
import { Badge } from '../../../../components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../../../components/ui/select';
import { cn } from '../../../../components/ui/utils';
import type { SalesPostSaleCase } from '../../salesCrmContext';
import { riskClasses } from '../utils/postSalesPageUtils';

export function KpiMetric({
  icon,
  value,
  label,
  valueClassName = 'text-slate-950',
}: {
  icon: ReactNode;
  value: string | number;
  label: string;
  valueClassName?: string;
}) {
  return (
    <span className="inline-flex items-center gap-3">
      <span className="flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
        {icon}
      </span>
      <span className="text-base font-semibold">
        <span className={cn('mr-2 font-bold dark:text-white', valueClassName)}>{value}</span>
        <span className="text-slate-600 dark:text-slate-300">{label}</span>
      </span>
    </span>
  );
}

export function FilterSelect({
  label,
  value,
  onValueChange,
  options,
}: {
  label: string;
  value: string;
  onValueChange: (value: string) => void;
  options: Array<{ value: string; label: string }>;
}) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-bold text-slate-700 dark:text-slate-300">{label}</label>
      <Select value={value} onValueChange={onValueChange}>
        <SelectTrigger className="h-11 rounded-lg border-slate-200 bg-white px-4 text-base font-semibold text-slate-950 shadow-none dark:border-slate-700 dark:bg-slate-900 dark:text-white">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

export function ActionButton({
  label,
  icon,
  className,
  onClick,
  disabled = false,
}: {
  label: string;
  icon: ReactNode;
  className: string;
  onClick?: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      disabled={disabled}
      onClick={disabled ? undefined : onClick}
      className={cn(
        'inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF6B5E]/25 disabled:cursor-not-allowed disabled:opacity-40 dark:disabled:border-slate-700 dark:disabled:bg-slate-800 dark:disabled:text-slate-500',
        className,
      )}
    >
      {icon}
    </button>
  );
}

export function FollowUpLane({
  title,
  description,
  cases,
  emptyLabel,
  renderMeta,
}: {
  title: string;
  description: string;
  cases: SalesPostSaleCase[];
  emptyLabel: string;
  renderMeta: (postSaleCase: SalesPostSaleCase) => string;
}) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800">
      <div>
        <h3 className="text-lg font-black text-slate-950 dark:text-white">{title}</h3>
        <p className="mt-1 text-sm leading-6 text-slate-500 dark:text-slate-300">{description}</p>
      </div>
      <div className="mt-4 space-y-3">
        {cases.length === 0 ? (
          <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-4 text-center text-sm font-semibold text-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
            {emptyLabel}
          </div>
        ) : cases.map((postSaleCase) => (
          <article key={postSaleCase.id} className="rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-900">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate font-black text-slate-950 dark:text-white">{postSaleCase.clientName}</p>
                <p className="mt-1 text-sm font-semibold text-slate-500 dark:text-slate-300">{postSaleCase.nextAction}</p>
              </div>
              <Badge className={cn('rounded-full border px-2 py-1 text-xs font-bold', riskClasses[postSaleCase.riskLevel])}>
                {renderMeta(postSaleCase)}
              </Badge>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
