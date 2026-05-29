import type { ReactNode } from 'react';
import { AlertTriangle, CircleDollarSign, RefreshCw, RotateCcw, ShieldCheck } from 'lucide-react';
import { cn } from '../../../../components/ui/utils';
import type { SalesRecordsTranslations } from '../translations';
import type { SalesMetrics } from '../types/salesTypes';
import { formatSalesCurrency, formatSalesNumber } from '../utils/salesFormatters';

function SalesMetric({
  icon,
  value,
  label,
  valueClassName,
}: {
  icon: ReactNode;
  value: string;
  label: string;
  valueClassName: string;
}) {
  return (
    <span className="inline-flex items-center gap-3">
      <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
        {icon}
      </span>
      <span className="text-base font-semibold">
        <span className={cn('mr-2 font-bold', valueClassName)}>{value}</span>
        <span className="font-bold text-slate-600 dark:text-slate-300">{label}</span>
      </span>
    </span>
  );
}

export function SalesKpiStrip({
  metrics,
  t,
}: {
  metrics: SalesMetrics;
  t: SalesRecordsTranslations;
}) {
  return (
    <section className="flex flex-wrap items-center gap-x-6 gap-y-4 text-sm text-slate-600">
      <SalesMetric icon={<CircleDollarSign className="h-4 w-4" />} value={formatSalesCurrency(metrics.totalSalesAmount)} label={t.kpis.totalRevenue} valueClassName="text-[#FF6B5E]" />
      <SalesMetric icon={<RefreshCw className="h-4 w-4" />} value={formatSalesCurrency(metrics.recurringRevenue)} label={t.kpis.recurringRevenue} valueClassName="text-[#2563EB]" />
      <SalesMetric icon={<ShieldCheck className="h-4 w-4" />} value={formatSalesCurrency(metrics.renewalRevenue)} label={t.kpis.renewalRevenue} valueClassName="text-[#177d66]" />
      <SalesMetric icon={<RotateCcw className="h-4 w-4" />} value={formatSalesCurrency(metrics.recoveredRevenue)} label={t.kpis.recoveredRevenue} valueClassName="text-[#9a6b05]" />
      <SalesMetric icon={<AlertTriangle className="h-4 w-4" />} value={formatSalesNumber(metrics.customersAtRisk)} label={t.kpis.customersAtRisk} valueClassName="text-[#B63B32]" />
    </section>
  );
}
