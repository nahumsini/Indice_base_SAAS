import {
  AlertTriangle,
  BadgeDollarSign,
  CheckCircle2,
  CircleDollarSign,
  Eye,
  Gauge,
  Timer,
} from 'lucide-react';
import {
  OperationalKpiArea,
  type OperationalAlertChip,
  type OperationalDistributionSegment,
  type OperationalKpiMetric,
} from '../../shared/operational';
import { usePreferredBusinessCurrency } from '../../shared/BusinessCurrencyContext';
import {
  formatBusinessCurrencyAmount,
  normalizeBusinessCurrencyCode,
} from '../../shared/businessCurrency';
import { useKpiMonetaryAggregate, type KpiMonetaryAggregate } from '../../shared/kpiMonetaryApi';
import type { ReceivablesTranslations } from '../translations';
import type { CreditSale, CreditSaleStatus } from '../types';

const moneyFormatOptions: Intl.NumberFormatOptions = {
  maximumFractionDigits: 2,
  minimumFractionDigits: 2,
};

const setupStatuses = new Set<CreditSaleStatus>(['draft', 'simulated', 'approved']);
const stoppedStatuses = new Set<CreditSaleStatus>(['cancelled', 'rejected']);

function formatCount(value: number) {
  return new Intl.NumberFormat().format(value);
}

function formatNativeBreakdown(aggregate: KpiMonetaryAggregate | null, fallbackCurrency: string) {
  if (!aggregate || aggregate.nativeTotals.length === 0) {
    return formatBusinessCurrencyAmount(0, fallbackCurrency, moneyFormatOptions);
  }
  return aggregate.nativeTotals
    .map(({ currency, amount }) => formatBusinessCurrencyAmount(amount, currency, moneyFormatOptions))
    .join(' / ');
}

export function CreditSalesKpiArea({
  copy,
  creditSales,
  totalCreditSales,
}: {
  copy: ReceivablesTranslations;
  creditSales: CreditSale[];
  totalCreditSales: number;
}) {
  const { preferredCurrency } = usePreferredBusinessCurrency();
  const labels = copy.kpiEngine.creditSales;
  const ids = creditSales.map((sale) => sale.id);
  const receivable = useKpiMonetaryAggregate({ metric: 'CREDIT_SALES_TOTAL_PAYABLE', preferredCurrency, ids });
  const monthly = useKpiMonetaryAggregate({ metric: 'CREDIT_SALES_MONTHLY_PAYMENT', preferredCurrency, ids });
  const interest = useKpiMonetaryAggregate({ metric: 'CREDIT_SALES_INTEREST', preferredCurrency, ids });
  const activeCount = creditSales.filter((sale) => sale.status === 'active').length;
  const setupCount = creditSales.filter((sale) => setupStatuses.has(sale.status)).length;
  const completedCount = creditSales.filter((sale) => sale.status === 'completed').length;
  const stoppedCount = creditSales.filter((sale) => stoppedStatuses.has(sale.status)).length;
  const currencyCount = new Set(creditSales.map((sale) => normalizeBusinessCurrencyCode(sale.currency, preferredCurrency))).size;
  const formatAggregate = (aggregate: typeof receivable) => (
    aggregate.data && !aggregate.loading
      ? formatBusinessCurrencyAmount(aggregate.data.preferredTotal, preferredCurrency, moneyFormatOptions)
      : '—'
  );
  const receivableTotalLabel = formatAggregate(receivable);
  const monthlyFlowLabel = formatAggregate(monthly);
  const totalInterestLabel = formatAggregate(interest);
  const nativeTotalLabel = formatNativeBreakdown(receivable.data, preferredCurrency);
  const metrics: OperationalKpiMetric[] = [
    {
      id: 'receivableTotal',
      icon: <CircleDollarSign className="h-4 w-4" />,
      iconClassName: 'text-[#147514]',
      label: labels.labels.receivableTotal,
      value: receivableTotalLabel,
      valueClassName: 'text-[#147514]',
    },
    {
      id: 'visibleSales',
      icon: <Eye className="h-4 w-4" />,
      label: labels.labels.visibleSales,
      value: formatCount(creditSales.length),
    },
    {
      id: 'activeSales',
      icon: <Timer className="h-4 w-4" />,
      iconClassName: 'text-blue-600',
      label: labels.labels.activeSales,
      value: formatCount(activeCount),
      valueClassName: 'text-blue-600',
    },
    {
      id: 'monthlyFlow',
      icon: <BadgeDollarSign className="h-4 w-4" />,
      iconClassName: 'text-emerald-600',
      label: labels.labels.monthlyFlow,
      value: monthlyFlowLabel,
      valueClassName: 'text-emerald-600',
    },
    {
      id: 'totalInterest',
      icon: <BadgeDollarSign className="h-4 w-4" />,
      iconClassName: 'text-amber-600',
      label: labels.labels.totalInterest,
      value: totalInterestLabel,
      valueClassName: 'text-amber-600',
    },
  ];
  const alertChips: OperationalAlertChip[] = [];

  if (activeCount > 0) {
    alertChips.push({
      id: 'active',
      icon: <Timer className="h-3.5 w-3.5" />,
      label: labels.alerts.active(activeCount),
      tone: 'success',
    });
  }

  if (setupCount > 0) {
    alertChips.push({
      id: 'setup',
      icon: <Gauge className="h-3.5 w-3.5" />,
      label: labels.alerts.simulated(setupCount),
      tone: 'warning',
    });
  }

  if (stoppedCount > 0) {
    alertChips.push({
      id: 'stopped',
      icon: <AlertTriangle className="h-3.5 w-3.5" />,
      label: labels.alerts.blocked(stoppedCount),
      tone: 'danger',
    });
  }

  if (creditSales.length > 0) {
    alertChips.push({
      id: 'nativeTotal',
      icon: <CircleDollarSign className="h-3.5 w-3.5" />,
      label: labels.alerts.nativeCurrencyTotal(nativeTotalLabel),
      tone: 'neutral',
    });
  }

  if (currencyCount > 1) {
    alertChips.push({
      id: 'multiCurrency',
      icon: <BadgeDollarSign className="h-3.5 w-3.5" />,
      label: labels.alerts.multiCurrency(currencyCount),
      tone: 'info',
    });
  }

  const distributionSegments: OperationalDistributionSegment[] = [
    {
      id: 'active',
      className: 'bg-[#147514]',
      count: activeCount,
      label: labels.segments.active,
    },
    {
      id: 'setup',
      className: 'bg-[#F4C84A]',
      count: setupCount,
      label: labels.segments.setup,
    },
    {
      id: 'completed',
      className: 'bg-emerald-500',
      count: completedCount,
      label: labels.segments.completed,
    },
    {
      id: 'stopped',
      className: 'bg-rose-500',
      count: stoppedCount,
      label: labels.segments.stopped,
    },
  ];

  return (
    <OperationalKpiArea
      alertChips={alertChips}
      className="mb-6"
      distributionSegments={distributionSegments}
      insight={labels.insight({
        active: activeCount,
        blocked: stoppedCount,
        completed: completedCount,
        nativeTotal: nativeTotalLabel,
        preferredCurrency,
        receivableTotal: receivableTotalLabel,
        setup: setupCount,
        total: totalCreditSales,
        visible: creditSales.length,
      })}
      insightIcon={<AlertTriangle className="h-4 w-4" />}
      metrics={metrics}
      currencyContext={{
        preferredCurrency,
        nativeBreakdown: nativeTotalLabel,
        rateLabel: receivable.data?.exchangeRate.mode === 'daily'
          ? copy.kpiEngine.currency.dailyRate
          : copy.kpiEngine.currency.unavailable,
        effectiveDate: receivable.data?.exchangeRate.effectiveDate,
        source: receivable.data?.exchangeRate.source,
        isPartial: Boolean(receivable.error || receivable.data?.partial),
        excludedCount: receivable.data?.excludedRecords ?? (receivable.error ? creditSales.length : 0),
        labels: copy.kpiEngine.currency,
      }}
    />
  );
}
