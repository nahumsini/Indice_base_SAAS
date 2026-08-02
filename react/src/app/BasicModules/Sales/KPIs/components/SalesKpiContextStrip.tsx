import { Clock3, Database, RefreshCw } from 'lucide-react';
import type { SalesKpisTranslations } from '../translations';

export function SalesKpiContextStrip({
  copy,
  nativeBreakdown,
  preferredCurrency,
  rateDate,
  rateLabel,
  recordCount,
}: {
  copy: SalesKpisTranslations;
  nativeBreakdown?: string;
  preferredCurrency: string;
  rateDate: string;
  rateLabel: string;
  recordCount: number;
}) {
  return (
    <section className="flex flex-wrap items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-3 text-xs font-medium text-slate-600 shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
      <span className="inline-flex items-center gap-2 rounded-full border border-[#FF6B5E]/25 bg-[#FF6B5E]/10 px-3 py-1.5 text-[#B63B32] dark:border-[#FFB0AA]/25 dark:bg-[#FF6B5E]/15 dark:text-[#FFB0AA]">
        <RefreshCw className="h-3.5 w-3.5" />
        {copy.context.preferredCurrency}: {preferredCurrency}
      </span>
      <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 dark:border-slate-800 dark:bg-slate-950">
        <Clock3 className="h-3.5 w-3.5" />
        {rateLabel} - {rateDate}
      </span>
      <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 dark:border-slate-800 dark:bg-slate-950">
        <Database className="h-3.5 w-3.5" />
        {copy.context.records}: {recordCount}
      </span>
      {nativeBreakdown ? (
        <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 dark:border-slate-800 dark:bg-slate-950">
          {copy.context.native}: {nativeBreakdown}
        </span>
      ) : null}
    </section>
  );
}
