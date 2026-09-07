import {
  AlertTriangle,
  Banknote,
  CheckCircle2,
  CircleDollarSign,
  PackageCheck,
  ReceiptText,
  ShieldAlert,
  Timer,
  TrendingUp,
  WalletCards,
} from 'lucide-react';
import type { ReceivableAccount, ReceivablePayment } from '../../../Receivables/types';
import type {
  OperationalAlertChip,
  OperationalDistributionSegment,
  OperationalKpiMetric,
} from '../../../shared/operational';
import { OperationalKpiArea } from '../../../shared/operational';
import { useKpiMonetaryAggregates } from '../../../shared/kpiMonetaryApi';
import type { SalesRecordsTranslations } from '../translations';
import type { SaleRecord, SalesMetrics } from '../types/salesTypes';
import { formatSalesNumber } from '../utils/salesFormatters';
import { buildSalesKpiAmounts } from '../utils/salesKpiAmounts';

export function SalesKpiStrip({
  metrics,
  records,
  totalCount,
  visibleCount,
  t,
}: {
  metrics: SalesMetrics;
  records: SaleRecord[];
  receivableAccounts: ReceivableAccount[];
  receivablePayments: ReceivablePayment[];
  totalCount: number;
  visibleCount: number;
  t: SalesRecordsTranslations;
}) {
  const saleIds = records.map((record) => record.backendId).filter((id): id is number => Boolean(id));
  const queries = saleIds.length ? [
    { key: 'revenue', metric: 'SALES_TOTAL' as const, preferredCurrency: metrics.preferredCurrency, ids: saleIds },
    { key: 'collected', metric: 'SALES_COLLECTED' as const, preferredCurrency: metrics.preferredCurrency, ids: saleIds },
    { key: 'receivableBalance', metric: 'SALES_RECEIVABLE_BALANCE' as const, preferredCurrency: metrics.preferredCurrency, ids: saleIds },
  ] : [];
  const { data: monetaryAggregates } = useKpiMonetaryAggregates(queries);
  const { revenueLabel, collectedLabel, receivableBalanceLabel, grossMarginLabel, averageTicketLabel, nativeRevenueLabel }
    = buildSalesKpiAmounts(records, metrics.preferredCurrency, monetaryAggregates, t.common.notAvailable);

  const metricItems: OperationalKpiMetric[] = [
    { id: 'revenue', icon: <CircleDollarSign className="h-4 w-4" />, label: t.kpis.totalSalesAmount, value: revenueLabel, iconClassName: 'text-[#B63B32]', valueClassName: 'text-[#FF6B5E]' },
    { id: 'collected', icon: <Banknote className="h-4 w-4" />, label: t.kpis.collectedAmount, value: collectedLabel, iconClassName: 'text-emerald-600', valueClassName: 'text-emerald-600' },
    { id: 'receivableBalance', icon: <WalletCards className="h-4 w-4" />, label: t.kpis.receivableBalance, value: receivableBalanceLabel, iconClassName: 'text-[#9A6B05]', valueClassName: 'text-[#9A6B05]' },
    { id: 'grossMargin', icon: <TrendingUp className="h-4 w-4" />, label: t.kpis.grossMargin, value: grossMarginLabel, iconClassName: 'text-[#2563EB]', valueClassName: 'text-[#2563EB]' },
    { id: 'averageTicket', icon: <ReceiptText className="h-4 w-4" />, label: t.kpis.averageTicket, value: averageTicketLabel },
    { id: 'openSales', icon: <Timer className="h-4 w-4" />, label: t.kpiEngine.labels.openSales, value: formatSalesNumber(metrics.openSales), iconClassName: 'text-[#2563EB]', valueClassName: 'text-[#2563EB]' },
    { id: 'deliveredSales', icon: <CheckCircle2 className="h-4 w-4" />, label: t.kpiEngine.labels.deliveredSales, value: formatSalesNumber(metrics.deliveredSales), iconClassName: 'text-emerald-600', valueClassName: 'text-emerald-600' },
  ];
  const alertChips: OperationalAlertChip[] = [];

  if (metrics.pendingFinanceValidation > 0) {
    alertChips.push({ id: 'financePending', icon: <ShieldAlert className="h-3.5 w-3.5" />, label: t.kpiEngine.alerts.financePending(metrics.pendingFinanceValidation), tone: 'warning' });
  }
  if (metrics.pendingInventoryMovement > 0) {
    alertChips.push({ id: 'inventoryPending', icon: <PackageCheck className="h-3.5 w-3.5" />, label: t.kpiEngine.alerts.inventoryPending(metrics.pendingInventoryMovement), tone: 'info' });
  }
  if (metrics.customersAtRisk > 0) {
    alertChips.push({ id: 'customersAtRisk', icon: <AlertTriangle className="h-3.5 w-3.5" />, label: t.kpiEngine.alerts.customersAtRisk(metrics.customersAtRisk), tone: 'danger' });
  }

  const distributionSegments: OperationalDistributionSegment[] = [
    { id: 'active', label: t.kpiEngine.segments.active, count: metrics.activeSales, className: 'bg-[#2563EB]' },
    { id: 'pendingFinance', label: t.kpiEngine.segments.pendingFinance, count: metrics.pendingFinanceSales, className: 'bg-[#F4C84A]' },
    { id: 'pendingInventory', label: t.kpiEngine.segments.pendingInventory, count: metrics.pendingInventorySales, className: 'bg-[#2563EB]' },
    { id: 'delivered', label: t.kpiEngine.segments.delivered, count: metrics.completedSales, className: 'bg-emerald-500' },
    { id: 'cancelled', label: t.kpiEngine.segments.cancelled, count: metrics.cancelledSales, className: 'bg-slate-400' },
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
      insightIcon={<TrendingUp className="h-4 w-4" />}
      metrics={metricItems}
    />
  );
}
