import type { ReactNode } from 'react';
import { BadgeCheck, BadgeDollarSign, Clock3, Percent, WalletCards } from 'lucide-react';
import { cn } from '../../../../components/ui/utils';
import type { SalesRecordsTranslations } from '../translations';
import type { CommissionKpis } from '../types/commissions';
import { formatCommissionRate, formatSalesCurrency } from '../utils/salesFormatters';

function CommissionMetric({
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

export function CommissionKpiStrip({
  kpis,
  t,
}: {
  kpis: CommissionKpis;
  t: SalesRecordsTranslations;
}) {
  return (
    <section className="flex flex-wrap items-center gap-x-6 gap-y-4 text-sm text-slate-600">
      <CommissionMetric icon={<BadgeDollarSign className="h-4 w-4" />} value={formatSalesCurrency(kpis.totalCommissions)} label={t.commissions.kpis.totalCommissions} valueClassName="text-[#FF6B5E]" />
      <CommissionMetric icon={<Clock3 className="h-4 w-4" />} value={formatSalesCurrency(kpis.pendingCommissions)} label={t.commissions.kpis.pending} valueClassName="text-[#9a6b05]" />
      <CommissionMetric icon={<BadgeCheck className="h-4 w-4" />} value={formatSalesCurrency(kpis.approvedCommissions)} label={t.commissions.kpis.approved} valueClassName="text-[#2563EB]" />
      <CommissionMetric icon={<WalletCards className="h-4 w-4" />} value={formatSalesCurrency(kpis.paidCommissions)} label={t.commissions.kpis.paid} valueClassName="text-[#177d66]" />
      <CommissionMetric icon={<Percent className="h-4 w-4" />} value={formatCommissionRate(kpis.commissionRate)} label={t.commissions.kpis.commissionRate} valueClassName="text-[#B63B32]" />
    </section>
  );
}
