import {
  AlertTriangle,
  CheckCircle2,
  CircleDollarSign,
  Eye,
  Gauge,
  PackageCheck,
  ShieldAlert,
  Timer,
} from 'lucide-react';
import type {
  OperationalAlertChip,
  OperationalDistributionSegment,
  OperationalKpiMetric,
} from '../../../shared/operational';
import { OperationalKpiArea } from '../../../shared/operational';
import type { SalesRecordsTranslations } from '../translations';
import type { SalesMetrics } from '../types/salesTypes';
import { formatSalesNumber } from '../utils/salesFormatters';
import type { SaleRecord } from '../types/salesTypes';
import { useKpiMonetaryAggregate } from '../../../shared/kpiMonetaryApi';
import { formatBusinessCurrencyAmount } from '../../../shared/businessCurrency';

export function SalesKpiStrip({
  metrics,
  records,
  totalCount,
  visibleCount,
  t,
}: {
  metrics: SalesMetrics;
  records: SaleRecord[];
  totalCount: number;
  visibleCount: number;
  t: SalesRecordsTranslations;
}) {
  const backendIds = records.map((record) => record.backendId).filter((id): id is number => Boolean(id));
  const { data: revenue, error: revenueError } = useKpiMonetaryAggregate({
    metric: 'SALES_TOTAL',
    preferredCurrency: metrics.preferredCurrency,
    ids: backendIds,
  });
  const preferredRevenueLabel = formatBusinessCurrencyAmount(
    revenue?.preferredTotal ?? 0,
    metrics.preferredCurrency,
  );
  const nativeRevenueLabel = revenue?.nativeTotals.map(({ amount, currency }) => (
    formatBusinessCurrencyAmount(amount, currency)
  )).join(' / ') ?? '';
  const metricItems: OperationalKpiMetric[] = [
    {
      id: 'visibleRevenue',
      icon: <CircleDollarSign className="h-4 w-4" />,
      label: t.kpiEngine.labels.visibleRevenue,
      value: revenueError ? 'No disponible' : preferredRevenueLabel,
      iconClassName: 'text-[#B63B32]',
      valueClassName: 'text-[#FF6B5E]',
    },
    {
      id: 'visibleSales',
      icon: <Eye className="h-4 w-4" />,
      label: t.kpiEngine.labels.visibleSales,
      value: formatSalesNumber(visibleCount),
    },
    {
      id: 'openSales',
      icon: <Timer className="h-4 w-4" />,
      label: t.kpiEngine.labels.openSales,
      value: formatSalesNumber(metrics.openSales),
      iconClassName: 'text-[#2563EB]',
      valueClassName: 'text-[#2563EB]',
    },
    {
      id: 'deliveredSales',
      icon: <CheckCircle2 className="h-4 w-4" />,
      label: t.kpiEngine.labels.deliveredSales,
      value: formatSalesNumber(metrics.deliveredSales),
      iconClassName: 'text-emerald-600',
      valueClassName: 'text-emerald-600',
    },
    {
      id: 'financePending',
      icon: <ShieldAlert className="h-4 w-4" />,
      label: t.kpiEngine.labels.financePending,
      value: formatSalesNumber(metrics.pendingFinanceValidation),
      iconClassName: 'text-[#9A6B05]',
      valueClassName: 'text-[#9A6B05]',
    },
    {
      id: 'inventoryPending',
      icon: <PackageCheck className="h-4 w-4" />,
      label: t.kpiEngine.labels.inventoryPending,
      value: formatSalesNumber(metrics.pendingInventoryMovement),
      iconClassName: 'text-[#2563EB]',
      valueClassName: 'text-[#2563EB]',
    },
    {
      id: 'deliveryProgress',
      icon: <Gauge className="h-4 w-4" />,
      label: t.kpiEngine.labels.deliveryProgress,
      value: `${metrics.deliveryProgress}%`,
      iconClassName: 'text-slate-500',
      valueClassName: 'text-slate-950 dark:text-white',
    },
  ];
  const alertChips: OperationalAlertChip[] = [];

  if (metrics.pendingFinanceValidation > 0) {
    alertChips.push({
      id: 'financePending',
      icon: <ShieldAlert className="h-3.5 w-3.5" />,
      label: t.kpiEngine.alerts.financePending(metrics.pendingFinanceValidation),
      tone: 'warning',
    });
  }

  if (metrics.pendingInventoryMovement > 0) {
    alertChips.push({
      id: 'inventoryPending',
      icon: <PackageCheck className="h-3.5 w-3.5" />,
      label: t.kpiEngine.alerts.inventoryPending(metrics.pendingInventoryMovement),
      tone: 'info',
    });
  }

  if (metrics.customersAtRisk > 0) {
    alertChips.push({
      id: 'customersAtRisk',
      icon: <AlertTriangle className="h-3.5 w-3.5" />,
      label: t.kpiEngine.alerts.customersAtRisk(metrics.customersAtRisk),
      tone: 'danger',
    });
  }

  if (nativeRevenueLabel && nativeRevenueLabel !== preferredRevenueLabel) {
    alertChips.push({
      id: 'nativeCurrencyTotal',
      icon: <CircleDollarSign className="h-3.5 w-3.5" />,
      label: t.kpiEngine.alerts.nativeCurrencyTotal(nativeRevenueLabel),
      tone: 'info',
    });
  }
  const distributionSegments: OperationalDistributionSegment[] = [
    {
      id: 'active',
      label: t.kpiEngine.segments.active,
      count: metrics.activeSales,
      className: 'bg-[#2563EB]',
    },
    {
      id: 'pendingFinance',
      label: t.kpiEngine.segments.pendingFinance,
      count: metrics.pendingFinanceSales,
      className: 'bg-[#F4C84A]',
    },
    {
      id: 'pendingInventory',
      label: t.kpiEngine.segments.pendingInventory,
      count: metrics.pendingInventorySales,
      className: 'bg-[#2563EB]',
    },
    {
      id: 'delivered',
      label: t.kpiEngine.segments.delivered,
      count: metrics.completedSales,
      className: 'bg-emerald-500',
    },
    {
      id: 'cancelled',
      label: t.kpiEngine.segments.cancelled,
      count: metrics.cancelledSales,
      className: 'bg-slate-400',
    },
  ];

  return (
    <OperationalKpiArea
      alertChips={alertChips}
      distributionSegments={distributionSegments}
      insight={t.kpiEngine.insight({
        customersAtRisk: metrics.customersAtRisk,
        delivered: metrics.deliveredSales,
        pendingFinance: metrics.pendingFinanceValidation,
        pendingInventory: metrics.pendingInventoryMovement,
        preferredCurrency: metrics.preferredCurrency,
        nativeTotal: nativeRevenueLabel,
        exchangeRateDate: metrics.exchangeRateDateLabel,
        progress: metrics.deliveryProgress,
        total: totalCount,
        visible: visibleCount,
      })}
      insightIcon={<Gauge className="h-4 w-4" />}
      metrics={metricItems}
    />
  );
}
