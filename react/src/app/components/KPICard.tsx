import { Card } from './ui/card';
import { TrendingUp, TrendingDown } from 'lucide-react';

interface KPICardProps {
  title: string;
  value: string | number;
  change: string;
  isPositive: boolean;
  orderNumber?: number;
}

export function KPICard({ title, value, change, isPositive, orderNumber }: KPICardProps) {
  const trendClasses = isPositive
    ? {
        icon: TrendingUp,
        badge: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-300 dark:border-emerald-700',
        accent: 'bg-emerald-500',
      }
    : {
        icon: TrendingDown,
        badge: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-900/20 dark:text-rose-300 dark:border-rose-700',
        accent: 'bg-rose-500',
      };
  const TrendIcon = trendClasses.icon;

  return (
    <Card className="group relative min-h-[148px] w-full snap-center overflow-hidden rounded-[8px] border border-slate-200 bg-white p-0 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md dark:border-slate-700 dark:bg-slate-900 dark:hover:border-slate-600">
      <div className={`absolute inset-y-0 left-0 w-1 ${trendClasses.accent}`} />
      {orderNumber !== undefined && (
        <div className="absolute right-3 top-3 rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs font-semibold text-slate-600 shadow-sm dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
          #{orderNumber}
        </div>
      )}

      <div className="flex h-full flex-col justify-between gap-5 px-5 py-4 pl-6">
        <div className="pr-12">
          <p className="line-clamp-2 text-sm font-semibold leading-snug text-slate-600 dark:text-slate-300">
            {title}
          </p>
        </div>

        <div className="space-y-3">
          <p className="text-[2rem] font-bold leading-none tracking-normal text-slate-950 dark:text-white">
            {value}
          </p>
          <div className={`inline-flex max-w-full items-center gap-1.5 rounded-full border px-2.5 py-1 text-sm font-semibold ${trendClasses.badge}`}>
            <TrendIcon className="h-4 w-4 shrink-0" />
            <span className="truncate">{change}</span>
          </div>
        </div>
      </div>
    </Card>
  );
}
