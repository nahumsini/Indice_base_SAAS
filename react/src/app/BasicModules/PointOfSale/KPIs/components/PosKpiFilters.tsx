import { RefreshCw, SlidersHorizontal } from 'lucide-react';
import { Button } from '../../../../components/ui/button';
import { pointOfSaleTitleBarSecondaryActionClassName } from '../../shared/components/PointOfSaleTitleBar';
import { periodOptions, type PosKpiPeriod } from '../utils/posKpiAnalytics';

export function PosKpiFilters({
  loading,
  period,
  onPeriodChange,
  onRefresh,
}: {
  loading: boolean;
  period: PosKpiPeriod;
  onPeriodChange: (period: PosKpiPeriod) => void;
  onRefresh: () => void;
}) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-[#B63B32] dark:text-[#FFB0AA]">
        <SlidersHorizontal className="h-4 w-4" />
        Filtros de lectura POS
      </div>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="inline-grid grid-cols-2 gap-2 rounded-lg border border-slate-200 bg-slate-50 p-1 dark:border-slate-800 dark:bg-slate-950 sm:flex">
          {periodOptions.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => onPeriodChange(option.value)}
              className={`min-h-10 rounded-lg px-4 text-sm font-semibold transition ${
                period === option.value
                  ? 'bg-[#FF6B5E] text-white shadow-sm shadow-[#FF6B5E]/20'
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
          Actualizar KPIs
        </Button>
      </div>
    </section>
  );
}
