import type { CommissionSummary } from '../services/commissionSummaryApi';
import type { KpiMonetaryAggregate } from '../../../shared/kpiMonetaryApi';

export function commissionSummaryLabel(aggregate: KpiMonetaryAggregate | undefined, incomplete = false) {
  if (!aggregate || incomplete || aggregate.partial || !Number.isFinite(Number(aggregate.preferredTotal))) return '—';
  return `${aggregate.preferredCurrency} ${new Intl.NumberFormat(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(aggregate.preferredTotal))}`;
}
export function commissionSummaryKpis(summary: CommissionSummary | null, commissionCount: number) {
  return {
    totalCommissionsLabel: commissionSummaryLabel(summary?.total, summary?.incomplete),
    pendingCommissionsLabel: commissionSummaryLabel(summary?.pending, summary?.incomplete),
    approvedCommissionsLabel: commissionSummaryLabel(summary?.approved, summary?.incomplete),
    paidCommissionsLabel: commissionSummaryLabel(summary?.paid, summary?.incomplete),
    commissionRate: summary?.incomplete ? null : summary?.commissionRate ?? null,
    commissionCount,
  };
}
