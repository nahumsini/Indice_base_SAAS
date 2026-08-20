import { ArrowDownRight, ArrowRight, ArrowUpRight, Minus, type LucideIcon } from 'lucide-react';
import { cn } from '../../../../components/ui/utils';

type PosKpiCardTone = 'blue' | 'coral' | 'green' | 'yellow' | 'red' | 'purple';

const toneClasses: Record<PosKpiCardTone, string> = {
  blue: 'border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900 dark:bg-blue-950/30 dark:text-blue-200',
  coral: 'border-[#FF6B5E]/30 bg-[#FF6B5E]/10 text-[#B63B32] dark:border-[#FFB0AA]/25 dark:bg-[#FF6B5E]/15 dark:text-[#FFB0AA]',
  green: 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-200',
  purple: 'border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-900 dark:bg-violet-950/30 dark:text-violet-200',
  red: 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-200',
  yellow: 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200',
};

export type PosKpiCardItem = {
  comparison?: {
    direction: 'up' | 'down' | 'flat' | 'unavailable';
    label: string;
    positiveWhenDown?: boolean;
  };
  detail: string;
  icon: LucideIcon;
  label: string;
  tone?: PosKpiCardTone;
  value: string;
};

export function PosKpiCard({ comparison, detail, icon: Icon, label, tone = 'coral', value }: PosKpiCardItem) {
  const comparisonIsPositive = comparison
    ? comparison.direction === 'flat'
      || (comparison.positiveWhenDown ? comparison.direction === 'down' : comparison.direction === 'up')
    : false;
  const ComparisonIcon = comparison?.direction === 'up'
    ? ArrowUpRight
    : comparison?.direction === 'down'
      ? ArrowDownRight
      : comparison?.direction === 'flat'
        ? ArrowRight
        : Minus;

  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="mb-4 flex items-start justify-between gap-3">
        <span className={cn('flex h-11 w-11 items-center justify-center rounded-xl border', toneClasses[tone])}>
          <Icon className="h-5 w-5" />
        </span>
        {comparison ? (
          <span className={cn(
            'inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium',
            comparison.direction === 'unavailable'
              ? 'border-slate-200 bg-slate-50 text-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400'
              : comparisonIsPositive
                ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-200'
                : 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-200',
          )}>
            <ComparisonIcon className="h-3.5 w-3.5" />
            {comparison.label}
          </span>
        ) : null}
      </div>
      <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{label}</p>
      <p className="mt-2 truncate text-3xl font-medium tracking-normal text-slate-950 dark:text-white">{value}</p>
      <p className="mt-2 min-h-[40px] text-sm leading-5 text-slate-600 dark:text-slate-300">{detail}</p>
    </article>
  );
}

export function PosKpiGrid({ items }: { items: PosKpiCardItem[] }) {
  return (
    <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {items.map((item) => (
        <PosKpiCard key={item.label} {...item} />
      ))}
    </section>
  );
}
