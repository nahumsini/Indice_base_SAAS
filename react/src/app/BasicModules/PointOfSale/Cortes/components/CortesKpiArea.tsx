import { AlertTriangle, BadgeDollarSign, Banknote, CheckCircle2, Gauge, ReceiptText } from 'lucide-react';
import { OperationalKpiArea } from '../../../shared/operational/OperationalKpiArea';
import type { CortesCopy } from '../cortesTranslations';
import type { CortesAnalytics } from '../utils/cortesUtils';
import { formatCurrency } from '../utils/cortesUtils';

interface CortesKpiAreaProps {
  analytics: CortesAnalytics;
  copy: CortesCopy;
}

export function CortesKpiArea({
  analytics,
  copy,
}: CortesKpiAreaProps) {
  const hasDifference = analytics.shortCount > 0 || analytics.overCount > 0;
  const differenceLabel = analytics.convertedNetDifference > 0
    ? copy.kpis.netOver(formatCurrency(analytics.convertedNetDifference, analytics.preferredCurrency))
    : analytics.convertedNetDifference < 0
    ? copy.kpis.netShort(formatCurrency(Math.abs(analytics.convertedNetDifference), analytics.preferredCurrency))
    : copy.kpis.noNetDifference;

  const insight = analytics.closingCount === 0
    ? copy.kpis.noClosingsInsight
    : hasDifference
    ? copy.kpis.reviewInsight(analytics.shortCount + analytics.overCount)
    : copy.kpis.balancedInsight(analytics.closingCount);
  const currencyInsight = analytics.hasMultipleSalesCurrencies
    ? copy.kpis.chargedMultiCurrency(analytics.totalSalesLabel, analytics.convertedSalesLabel, analytics.preferredCurrency)
    : copy.kpis.chargedSingleCurrency(analytics.totalSalesLabel, analytics.preferredCurrency);

  return (
    <OperationalKpiArea
      metrics={[
        {
          id: 'sales',
          icon: <BadgeDollarSign className="h-4 w-4" />,
          iconClassName: 'text-[#FF6B5E]',
          label: copy.kpis.salesLabel(analytics.preferredCurrency),
          value: analytics.convertedSalesLabel,
          valueClassName: 'text-[#FF6B5E]',
        },
        {
          id: 'closings',
          icon: <ReceiptText className="h-4 w-4" />,
          label: copy.kpis.closings,
          value: analytics.closingCount,
        },
        {
          id: 'tickets',
          icon: <Gauge className="h-4 w-4" />,
          iconClassName: 'text-blue-600',
          label: copy.kpis.tickets,
          value: analytics.totalTickets,
          valueClassName: 'text-blue-600',
        },
        {
          id: 'expected',
          icon: <Banknote className="h-4 w-4" />,
          iconClassName: 'text-emerald-600',
          label: copy.kpis.expected(analytics.preferredCurrency),
          value: formatCurrency(analytics.convertedExpectedCash, analytics.preferredCurrency),
          valueClassName: 'text-emerald-600',
        },
        {
          id: 'difference',
          icon: <AlertTriangle className="h-4 w-4" />,
          iconClassName: hasDifference ? 'text-amber-600' : 'text-emerald-600',
          label: copy.kpis.difference(analytics.preferredCurrency),
          value: formatCurrency(analytics.convertedNetDifference, analytics.preferredCurrency),
          valueClassName: hasDifference ? 'text-amber-700' : 'text-emerald-600',
        },
      ]}
      alertChips={[
        ...(analytics.closingCount > 0 ? [{
          id: 'currency-breakdown',
          icon: <BadgeDollarSign className="h-3.5 w-3.5" />,
          label: analytics.totalSalesLabel,
          tone: 'info' as const,
        }] : []),
        ...(analytics.shortCount > 0 ? [{
          id: 'short',
          icon: <AlertTriangle className="h-3.5 w-3.5" />,
          label: copy.kpis.shortChip(analytics.shortCount),
          tone: 'danger' as const,
        }] : []),
        ...(analytics.overCount > 0 ? [{
          id: 'over',
          icon: <AlertTriangle className="h-3.5 w-3.5" />,
          label: copy.kpis.overChip(analytics.overCount),
          tone: 'warning' as const,
        }] : []),
        ...(analytics.balancedCount > 0 ? [{
          id: 'balanced',
          icon: <CheckCircle2 className="h-3.5 w-3.5" />,
          label: copy.kpis.balancedChip(analytics.balancedCount),
          tone: 'success' as const,
        }] : []),
      ]}
      distributionSegments={[
        {
          id: 'balanced',
          className: 'bg-emerald-500',
          count: analytics.balancedCount,
          label: copy.kpis.balanced,
        },
        {
          id: 'over',
          className: 'bg-[#F4C84A]',
          count: analytics.overCount,
          label: copy.kpis.over,
        },
        {
          id: 'short',
          className: 'bg-rose-500',
          count: analytics.shortCount,
          label: copy.kpis.short,
        },
      ]}
      insight={analytics.closingCount > 0 ? `${insight} ${differenceLabel}. ${currencyInsight}` : insight}
      insightIcon={<AlertTriangle className="h-5 w-5" />}
    />
  );
}
