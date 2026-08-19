import { Clock3, Database, RefreshCw } from 'lucide-react';
import type { PosKpiCopy } from '../posKpiTranslations';

export function PosKpiContextStrip({
  closings,
  copy,
  nativeBreakdown,
  preferredCurrency,
  rateDate,
  rateLabel,
  totalCount,
}: {
  closings: number;
  copy: PosKpiCopy;
  nativeBreakdown?: string;
  preferredCurrency: string;
  rateDate: string;
  rateLabel: string;
  totalCount: number;
}) {
  return (
    <section className="flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-xs font-medium text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
      <span className="inline-flex items-center gap-2 rounded-full border border-[#FF6B5E]/25 bg-[#FF6B5E]/10 px-3 py-1.5 text-[#B63B32] dark:border-[#FFB0AA]/25 dark:bg-[#FF6B5E]/15 dark:text-[#FFB0AA]">
        <RefreshCw className="h-3.5 w-3.5" />
        {copy.context.preferredCurrency(preferredCurrency)}
      </span>
      <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 dark:border-slate-800 dark:bg-slate-950">
        <Clock3 className="h-3.5 w-3.5" />
        {rateLabel} - {rateDate}
      </span>
      <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 dark:border-slate-800 dark:bg-slate-950">
        <Database className="h-3.5 w-3.5" />
        {copy.context.readClosings(closings, totalCount)}
      </span>
      {nativeBreakdown ? (
        <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 dark:border-slate-800 dark:bg-slate-950">
          {copy.context.native(nativeBreakdown)}
        </span>
      ) : null}
    </section>
  );
}
