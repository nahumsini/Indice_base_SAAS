import { AlertTriangle, Clock3, Coins, Database } from 'lucide-react';
import type { PosKpiCopy } from '../posKpiTranslations';

export function PosKpiContextStrip({
  closings,
  copy,
  excludedCurrencies,
  excludedRecords,
  nativeBreakdown,
  partial,
  preferredCurrency,
  rateDate,
  rateLabel,
  rateSource,
  totalCount,
}: {
  closings: number;
  copy: PosKpiCopy;
  excludedCurrencies: string[];
  excludedRecords: number;
  nativeBreakdown: string;
  partial: boolean;
  preferredCurrency: string;
  rateDate: string;
  rateLabel: string;
  rateSource: string;
  totalCount: number;
}) {
  return (
    <section className="flex flex-wrap items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-xs font-medium text-slate-600 shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
      <span className="inline-flex items-center gap-2 rounded-full border border-[#FF6B5E]/25 bg-[#FF6B5E]/10 px-3 py-1.5 text-[#B63B32] dark:border-[#FFB0AA]/25 dark:bg-[#FF6B5E]/15 dark:text-[#FFB0AA]">
        <Coins className="h-3.5 w-3.5" />
        {copy.context.preferredCurrency(preferredCurrency)}
      </span>
      <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 dark:border-slate-800 dark:bg-slate-950">
        <Clock3 className="h-3.5 w-3.5" />
        {[rateLabel, rateDate, rateSource].filter(Boolean).join(' · ')}
      </span>
      <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 dark:border-slate-800 dark:bg-slate-950">
        <Database className="h-3.5 w-3.5" />
        {copy.context.readClosings(closings, totalCount)}
      </span>
      <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 dark:border-slate-800 dark:bg-slate-950">
        {copy.context.native(nativeBreakdown)}
      </span>
      {partial || excludedRecords > 0 ? (
        <span className="inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 text-amber-800 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200">
          <AlertTriangle className="h-3.5 w-3.5" />
          {copy.context.partial(excludedRecords, excludedCurrencies.join(', '))}
        </span>
      ) : null}
    </section>
  );
}
