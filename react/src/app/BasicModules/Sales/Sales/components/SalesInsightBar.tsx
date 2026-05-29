import { AlertCircle } from 'lucide-react';
import type { SalesRecordsTranslations } from '../translations';
import type { SalesMetrics } from '../types/salesTypes';
import { formatSalesCurrency } from '../utils/salesFormatters';

export function SalesInsightBar({
  metrics,
  visibleCount,
  totalCount,
  t,
}: {
  metrics: SalesMetrics;
  visibleCount: number;
  totalCount: number;
  t: SalesRecordsTranslations;
}) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-[#FF6B5E]/25 bg-[#FF6B5E]/10 px-5 py-4 text-sm font-semibold text-slate-700 shadow-sm shadow-[#FF6B5E]/5 dark:border-[#FF6B5E]/25 dark:bg-[#FF6B5E]/15 dark:text-slate-200">
      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-[#B63B32] dark:text-[#FFB0AA]" />
      <p>{t.insight.summary(formatSalesCurrency(metrics.totalSalesAmount), formatSalesCurrency(metrics.totalCommissions), visibleCount, totalCount)}</p>
    </div>
  );
}
