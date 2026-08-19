import { RefreshCw, SlidersHorizontal } from 'lucide-react';
import { Button } from '../../../../components/ui/button';
import { pointOfSaleTitleBarSecondaryActionClassName } from '../../shared/components/PointOfSaleTitleBar';
import type { PosKpiPeriod } from '../utils/posKpiAnalytics';
import type { PosKpiCopy } from '../posKpiTranslations';

export function PosKpiFilters({
  copy,
  loading,
  period,
  onPeriodChange,
  onRefresh,
}: {
  copy: PosKpiCopy;
  loading: boolean;
  period: PosKpiPeriod;
  onPeriodChange: (period: PosKpiPeriod) => void;
  onRefresh: () => void;
}) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
      <div className="mb-4 flex items-center gap-2 text-sm font-medium text-[#B63B32] dark:text-[#FFB0AA]">
        <SlidersHorizontal className="h-4 w-4" />
        {copy.filters.title}
      </div>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="inline-grid grid-cols-2 gap-2 rounded-xl border border-slate-200 bg-slate-50 p-1 dark:border-slate-800 dark:bg-slate-950 sm:flex">
          {copy.period.options.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => onPeriodChange(option.value as PosKpiPeriod)}
              className={`min-h-11 rounded-xl px-4 text-sm font-medium transition ${
                period === option.value
                  ? 'bg-[#FF6B5E] text-[#222831]'
                  : 'text-slate-600 hover:bg-white dark:text-slate-300 dark:hover:bg-slate-900'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>

        <Button
          type="button"
          variant="outline"
          onClick={onRefresh}
          disabled={loading}
          className={pointOfSaleTitleBarSecondaryActionClassName}
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          {copy.filters.refresh}
        </Button>
      </div>
    </section>
  );
}
