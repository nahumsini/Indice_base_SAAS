import type { ReactNode } from 'react';
import { Banknote, CircleDollarSign, ClipboardCheck, PackageCheck, ReceiptText, Truck, WalletCards } from 'lucide-react';
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
      <SalesMetric icon={<CircleDollarSign className="h-4 w-4" />} value={formatSalesCurrency(metrics.totalSalesAmount)} label={t.kpis.totalSalesAmount} valueClassName="text-[#FF6B5E]" />
      <SalesMetric icon={<Banknote className="h-4 w-4" />} value={formatSalesCurrency(metrics.totalCommissions)} label={t.kpis.totalCommissions} valueClassName="text-[#B63B32]" />
      <SalesMetric icon={<ReceiptText className="h-4 w-4" />} value={formatSalesCurrency(metrics.averageTicket)} label={t.kpis.averageTicket} valueClassName="text-[#2563EB]" />
      <SalesMetric icon={<ClipboardCheck className="h-4 w-4" />} value={formatSalesNumber(metrics.salesCount)} label={t.kpis.salesCount} valueClassName="text-slate-900 dark:text-white" />
      <SalesMetric icon={<WalletCards className="h-4 w-4" />} value={formatSalesNumber(metrics.pendingFinanceValidation)} label={t.kpis.pendingFinanceValidation} valueClassName="text-[#9a6b05]" />
      <SalesMetric icon={<PackageCheck className="h-4 w-4" />} value={formatSalesNumber(metrics.pendingInventoryMovement)} label={t.kpis.pendingInventoryMovement} valueClassName="text-[#9a6b05]" />
      <SalesMetric icon={<Truck className="h-4 w-4" />} value={formatSalesNumber(metrics.deliveredSales)} label={t.kpis.deliveredSales} valueClassName="text-emerald-600" />
    </section>
  );
}
