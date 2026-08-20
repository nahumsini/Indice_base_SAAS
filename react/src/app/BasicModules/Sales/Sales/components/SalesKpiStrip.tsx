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
import {
  formatBusinessCurrencyAmount,
  formatBusinessCurrencyBreakdown,
} from '../../../shared/businessCurrency';
import { useKpiMonetaryAggregates } from '../../../shared/kpiMonetaryApi';
import type { SalesRecordsTranslations } from '../translations';
import type { SaleRecord, SalesMetrics } from '../types/salesTypes';
import { formatSalesNumber } from '../utils/salesFormatters';
import { isSalesCreditPaymentMethod } from '../utils/salesPaymentMethods';

function hasNumericId(value: string | number | null | undefined) {
  return Number.isSafeInteger(Number(value)) && Number(value) > 0;
}

function matchesVisibleSale(account: ReceivableAccount, records: SaleRecord[]) {
  return records.some((record) => (
    Boolean(record.backendId && account.salesRecordId === record.backendId)
    || account.saleNumber.trim().toLocaleLowerCase() === record.saleNumber.trim().toLocaleLowerCase()
  ));
}

export function SalesKpiStrip({
  metrics,
  records,
  receivableAccounts,
  receivablePayments,
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
  const directCollectedRecords = records.filter((record) => (
    !isSalesCreditPaymentMethod(record.paymentMethod)
    && record.financeStatus === 'approved'
    && record.commercialStatus !== 'cancelled'
    && record.commercialStatus !== 'rejected'
  ));
  const directCollectedIds = directCollectedRecords.map((record) => record.backendId).filter((id): id is number => Boolean(id));
  const visibleAccounts = receivableAccounts.filter((account) => matchesVisibleSale(account, records));
  const visibleAccountIds = new Set(visibleAccounts.map((account) => account.id));
  const visibleSaleNumbers = new Set(records.map((record) => record.saleNumber.trim().toLocaleLowerCase()));
  const visiblePayments = receivablePayments.filter((payment) => (
    visibleAccountIds.has(payment.receivableId)
    || visibleSaleNumbers.has(payment.saleNumber.trim().toLocaleLowerCase())
  ));
  const receivableIds = visibleAccounts.map((account) => account.id).filter(hasNumericId);
  const paymentIds = visiblePayments.map((payment) => payment.id).filter(hasNumericId);

  const queries = [
    ...(saleIds.length ? [{ key: 'revenue', metric: 'SALES_TOTAL' as const, preferredCurrency: metrics.preferredCurrency, ids: saleIds }] : []),
    ...(directCollectedIds.length ? [{ key: 'directCollected', metric: 'SALES_TOTAL' as const, preferredCurrency: metrics.preferredCurrency, ids: directCollectedIds }] : []),
    ...(receivableIds.length ? [{ key: 'receivableBalance', metric: 'RECEIVABLE_BALANCE' as const, preferredCurrency: metrics.preferredCurrency, ids: receivableIds }] : []),
    ...(paymentIds.length ? [{ key: 'creditPayments', metric: 'RECEIVABLE_PAYMENT_AMOUNT' as const, preferredCurrency: metrics.preferredCurrency, ids: paymentIds }] : []),
  ];
  const { data: monetaryAggregates } = useKpiMonetaryAggregates(queries);
  const preferredRevenue = monetaryAggregates.revenue?.preferredTotal;
  const preferredDirectCollected = monetaryAggregates.directCollected?.preferredTotal;
  const preferredCreditPayments = monetaryAggregates.creditPayments?.preferredTotal;
  const preferredReceivableBalance = monetaryAggregates.receivableBalance?.preferredTotal;
  const revenueLabel = preferredRevenue !== undefined
    ? formatBusinessCurrencyAmount(preferredRevenue, metrics.preferredCurrency)
    : formatBusinessCurrencyBreakdown(records, (record) => record.totalAmount, (record) => record.currency);
  const collectedFallback = [
    ...directCollectedRecords.map((record) => ({ amount: record.totalAmount, currency: record.currency })),
    ...visiblePayments.map((payment) => ({ amount: payment.amount, currency: payment.currency ?? metrics.preferredCurrency })),
  ];
  const hasCompleteCollectedAggregate = (
    (directCollectedIds.length === 0 || preferredDirectCollected !== undefined)
    && (paymentIds.length === 0 || preferredCreditPayments !== undefined)
  );
  const collectedLabel = hasCompleteCollectedAggregate
    ? formatBusinessCurrencyAmount((preferredDirectCollected ?? 0) + (preferredCreditPayments ?? 0), metrics.preferredCurrency)
    : formatBusinessCurrencyBreakdown(collectedFallback, (item) => item.amount, (item) => item.currency);
  const receivableBalanceLabel = preferredReceivableBalance !== undefined
    ? formatBusinessCurrencyAmount(preferredReceivableBalance, metrics.preferredCurrency)
    : formatBusinessCurrencyBreakdown(visibleAccounts, (account) => account.balance, (account) => account.currency);
  const grossMarginLabel = formatBusinessCurrencyBreakdown(records, (record) => record.marginTotal, (record) => record.currency);
  const visibleCurrencies = new Set(records.map((record) => record.currency.trim().toUpperCase()));
  const averageTicketLabel = records.length === 0
    ? formatBusinessCurrencyAmount(0, metrics.preferredCurrency)
    : preferredRevenue !== undefined
      ? formatBusinessCurrencyAmount(preferredRevenue / records.length, metrics.preferredCurrency)
      : visibleCurrencies.size <= 1
        ? formatBusinessCurrencyAmount(records.reduce((total, record) => total + record.totalAmount, 0) / records.length, records[0]?.currency)
        : t.common.notAvailable;
  const nativeRevenueLabel = formatBusinessCurrencyBreakdown(records, (record) => record.totalAmount, (record) => record.currency);

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
