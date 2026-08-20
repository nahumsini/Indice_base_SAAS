import {
  AlertTriangle,
  BadgeDollarSign,
  Banknote,
  CreditCard,
  Gauge,
  Landmark,
  ReceiptText,
  WalletCards,
} from 'lucide-react';
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
  const paymentMethods = [
    { id: 'cash', label: copy.kpis.cash, total: analytics.convertedCashSales },
    { id: 'card', label: copy.kpis.card, total: analytics.convertedCardSales },
    { id: 'transfer', label: copy.kpis.transfer, total: analytics.convertedTransferSales },
    { id: 'credit', label: copy.kpis.credit, total: analytics.convertedCreditSales },
  ];
  const paymentTotal = paymentMethods.reduce((total, method) => total + method.total, 0);
  const leadingPaymentMethod = paymentMethods.reduce((leading, method) => (
    method.total > leading.total ? method : leading
  ), paymentMethods[0]);
  const leadingPaymentShare = paymentTotal > 0
    ? Math.round((leadingPaymentMethod.total / paymentTotal) * 100)
    : 0;
  const nativeSalesLabel = analytics.salesCurrencyTotals.length > 0
    ? analytics.salesCurrencyTotals
      .map(({ currency, label }) => `${currency} ${label}`)
      .join(' / ')
    : `${analytics.preferredCurrency} ${formatCurrency(0, analytics.preferredCurrency)}`;
  const averageTicket = analytics.totalTickets > 0
    ? analytics.convertedSales / analytics.totalTickets
    : 0;
  const averageClosing = analytics.closingCount > 0
    ? analytics.convertedSales / analytics.closingCount
    : 0;
  const currencyInsight = analytics.hasMultipleSalesCurrencies
    ? copy.kpis.chargedMultiCurrency(nativeSalesLabel, analytics.convertedSalesLabel, analytics.preferredCurrency)
    : copy.kpis.chargedSingleCurrency(nativeSalesLabel, analytics.preferredCurrency);
  const insight = analytics.closingCount === 0
    ? copy.kpis.noClosingsInsight
    : paymentTotal <= 0
    ? copy.kpis.noPaymentSalesInsight(analytics.closingCount)
    : `${copy.kpis.leadingPaymentInsight(
      leadingPaymentMethod.label,
      leadingPaymentShare,
      analytics.closingCount,
      analytics.totalTickets,
    )} ${currencyInsight}`;

  return (
    <OperationalKpiArea
      metrics={[
        {
          id: 'sales',
          icon: <BadgeDollarSign className="h-4 w-4" />,
          iconClassName: 'text-[#FF6B5E]',
          label: copy.kpis.salesByCurrency,
          value: nativeSalesLabel,
          valueClassName: 'text-[#FF6B5E]',
        },
        {
          id: 'cash',
          icon: <Banknote className="h-4 w-4" />,
          iconClassName: 'text-emerald-600',
          label: copy.kpis.cash,
          value: formatCurrency(analytics.convertedCashSales, analytics.preferredCurrency),
          valueClassName: 'text-emerald-600',
        },
        {
          id: 'card',
          icon: <CreditCard className="h-4 w-4" />,
          iconClassName: 'text-blue-600',
          label: copy.kpis.card,
          value: formatCurrency(analytics.convertedCardSales, analytics.preferredCurrency),
          valueClassName: 'text-blue-600',
        },
        {
          id: 'transfer',
          icon: <Landmark className="h-4 w-4" />,
          iconClassName: 'text-violet-600',
          label: copy.kpis.transfer,
          value: formatCurrency(analytics.convertedTransferSales, analytics.preferredCurrency),
          valueClassName: 'text-violet-600',
        },
        {
          id: 'credit',
          icon: <WalletCards className="h-4 w-4" />,
          iconClassName: 'text-amber-600',
          label: copy.kpis.credit,
          value: formatCurrency(analytics.convertedCreditSales, analytics.preferredCurrency),
          valueClassName: 'text-amber-600',
        },
        {
          id: 'preferred-total',
          icon: <BadgeDollarSign className="h-4 w-4" />,
          iconClassName: 'text-[#B63B32]',
          label: copy.kpis.preferredTotal(analytics.preferredCurrency),
          value: analytics.convertedSalesLabel,
          valueClassName: 'text-[#B63B32]',
        },
        {
          id: 'average-ticket',
          icon: <Gauge className="h-4 w-4" />,
          iconClassName: 'text-blue-600',
          label: copy.kpis.averageTicket,
          value: formatCurrency(averageTicket, analytics.preferredCurrency),
          valueClassName: 'text-blue-600',
        },
        {
          id: 'average-closing',
          icon: <ReceiptText className="h-4 w-4" />,
          iconClassName: 'text-slate-600',
          label: copy.kpis.averageClosing,
          value: formatCurrency(averageClosing, analytics.preferredCurrency),
        },
      ]}
      alertChips={[
        ...(analytics.closingCount > 0 ? [{
          id: 'closings',
          icon: <ReceiptText className="h-3.5 w-3.5" />,
          label: copy.common.closingsCount(analytics.closingCount),
          tone: 'neutral' as const,
        }] : []),
        ...(analytics.totalTickets > 0 ? [{
          id: 'tickets',
          icon: <Gauge className="h-3.5 w-3.5" />,
          label: copy.common.ticketsCount(analytics.totalTickets),
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
      ]}
      distributionSegments={[
        {
          id: 'cash',
          className: 'bg-emerald-500',
          count: analytics.convertedCashSales,
          label: copy.kpis.cash,
        },
        {
          id: 'card',
          className: 'bg-blue-500',
          count: analytics.convertedCardSales,
          label: copy.kpis.card,
        },
        {
          id: 'transfer',
          className: 'bg-violet-500',
          count: analytics.convertedTransferSales,
          label: copy.kpis.transfer,
        },
        {
          id: 'credit',
          className: 'bg-amber-400',
          count: analytics.convertedCreditSales,
          label: copy.kpis.credit,
        },
      ]}
      insight={insight}
      insightIcon={hasDifference
        ? <AlertTriangle className="h-5 w-5" />
        : <BadgeDollarSign className="h-5 w-5" />}
    />
  );
}
