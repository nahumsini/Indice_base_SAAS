import { AlertTriangle, BadgeCheck, BadgeDollarSign, Clock3, Percent, WalletCards } from 'lucide-react';
import type {
  OperationalAlertChip,
  OperationalDistributionSegment,
  OperationalKpiMetric,
} from '../../../shared/operational';
import { OperationalKpiArea } from '../../../shared/operational';
import type { SalesRecordsTranslations } from '../translations';
import type { CommissionKpis, CommissionRecord } from '../types/commissions';
import { formatCommissionRate, formatSalesNumber } from '../utils/salesFormatters';

export function CommissionKpiStrip({
  kpis,
  records,
  t,
}: {
  kpis: CommissionKpis;
  records: CommissionRecord[];
  t: SalesRecordsTranslations;
}) {
  const pendingCount = records.filter((record) => record.status === 'pending').length;
  const approvedCount = records.filter((record) => record.status === 'approved').length;
  const paidCount = records.filter((record) => record.status === 'paid').length;
  const cancelledCount = records.filter((record) => record.status === 'cancelled').length;
  const commissionRateLabel = formatCommissionRate(kpis.commissionRate);
  const metricItems: OperationalKpiMetric[] = [
    {
      id: 'visible',
      icon: <Clock3 className="h-4 w-4" />,
      label: t.commissions.kpiEngine.labels.visible,
      value: formatSalesNumber(records.length),
    },
    {
      id: 'totalCommissions',
      icon: <BadgeDollarSign className="h-4 w-4" />,
      label: t.commissions.kpiEngine.labels.totalCommissions,
      value: kpis.totalCommissionsLabel,
      iconClassName: 'text-[#B63B32]',
      valueClassName: 'text-[#FF6B5E]',
    },
    {
      id: 'pending',
      icon: <Clock3 className="h-4 w-4" />,
      label: t.commissions.kpiEngine.labels.pending,
      value: kpis.pendingCommissionsLabel,
      iconClassName: 'text-[#9A6B05]',
      valueClassName: 'text-[#9A6B05]',
    },
    {
      id: 'approved',
      icon: <BadgeCheck className="h-4 w-4" />,
      label: t.commissions.kpiEngine.labels.approved,
      value: kpis.approvedCommissionsLabel,
      iconClassName: 'text-[#2563EB]',
      valueClassName: 'text-[#2563EB]',
    },
    {
      id: 'paid',
      icon: <WalletCards className="h-4 w-4" />,
      label: t.commissions.kpiEngine.labels.paid,
      value: kpis.paidCommissionsLabel,
      iconClassName: 'text-emerald-600',
      valueClassName: 'text-emerald-600',
    },
    {
      id: 'commissionRate',
      icon: <Percent className="h-4 w-4" />,
      label: t.commissions.kpiEngine.labels.commissionRate,
      value: commissionRateLabel,
      iconClassName: 'text-slate-500',
      valueClassName: 'text-slate-950 dark:text-white',
    },
  ];
  const alertChips: OperationalAlertChip[] = [];

  if (pendingCount > 0) {
    alertChips.push({
      id: 'pending',
      icon: <Clock3 className="h-3.5 w-3.5" />,
      label: t.commissions.kpiEngine.alerts.pending(pendingCount),
      tone: 'warning',
    });
  }

  if (cancelledCount > 0) {
    alertChips.push({
      id: 'cancelled',
      icon: <AlertTriangle className="h-3.5 w-3.5" />,
      label: t.commissions.kpiEngine.alerts.cancelled(cancelledCount),
      tone: 'danger',
    });
  }
  const distributionSegments: OperationalDistributionSegment[] = [
    {
      id: 'pending',
      label: t.commissions.kpiEngine.segments.pending,
      count: pendingCount,
      className: 'bg-[#F4C84A]',
    },
    {
      id: 'approved',
      label: t.commissions.kpiEngine.segments.approved,
      count: approvedCount,
      className: 'bg-[#2563EB]',
    },
    {
      id: 'paid',
      label: t.commissions.kpiEngine.segments.paid,
      count: paidCount,
      className: 'bg-emerald-500',
    },
    {
      id: 'cancelled',
      label: t.commissions.kpiEngine.segments.cancelled,
      count: cancelledCount,
      className: 'bg-slate-400',
    },
  ];

  return (
    <OperationalKpiArea
      alertChips={alertChips}
      distributionSegments={distributionSegments}
      insight={t.commissions.kpiEngine.insight({
        count: records.length,
        paid: paidCount,
        pending: pendingCount,
        rate: commissionRateLabel,
      })}
      insightIcon={<Percent className="h-4 w-4" />}
      metrics={metricItems}
    />
  );
}
