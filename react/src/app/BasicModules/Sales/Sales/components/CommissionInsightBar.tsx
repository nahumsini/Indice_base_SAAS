import { AlertCircle } from 'lucide-react';
import type { SalesRecordsTranslations } from '../translations';
import type { CommissionKpis } from '../types/commissions';
import { formatCommissionRate, formatSalesCurrency } from '../utils/salesFormatters';

export function CommissionInsightBar({
  kpis,
  visibleCount,
  t,
}: {
  kpis: CommissionKpis;
  visibleCount: number;
  t: SalesRecordsTranslations;
}) {
  return (
    <div className="flex items-start gap-3 rounded-lg border border-[#FF6B5E]/25 bg-[#FF6B5E]/10 px-5 py-4 text-sm font-semibold text-slate-700 shadow-sm shadow-[#FF6B5E]/5 dark:border-[#FF6B5E]/25 dark:bg-[#FF6B5E]/15 dark:text-slate-200">
      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-[#B63B32] dark:text-[#FFB0AA]" />
      <p>{t.commissions.insight.summary(
        visibleCount,
        formatSalesCurrency(kpis.pendingCommissions),
        formatSalesCurrency(kpis.paidCommissions),
        formatCommissionRate(kpis.commissionRate),
      )}</p>
    </div>
  );
}
