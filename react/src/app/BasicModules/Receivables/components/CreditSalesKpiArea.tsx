import {
  AlertTriangle,
  BadgeDollarSign,
  CircleDollarSign,
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
import { useKpiMonetaryAggregates, type KpiMonetaryAggregate } from '../../shared/kpiMonetaryApi';
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
  activeStatus,
  copy,
  creditSales,
  onStatusChange,
  totalCreditSales,
}: {
  activeStatus: string;
  copy: ReceivablesTranslations;
  creditSales: CreditSale[];
  onStatusChange: (status: string) => void;
  totalCreditSales: number;
}) {
  const { preferredCurrency } = usePreferredBusinessCurrency();
  const labels = copy.kpiEngine.creditSales;
  const ids = creditSales.map((sale) => sale.id);
  const aggregates = useKpiMonetaryAggregates([
    { key: 'receivable', metric: 'CREDIT_SALES_TOTAL_PAYABLE', preferredCurrency, ids },
    { key: 'monthly', metric: 'CREDIT_SALES_MONTHLY_PAYMENT', preferredCurrency, ids },
    { key: 'interest', metric: 'CREDIT_SALES_INTEREST', preferredCurrency, ids },
  ]);
  const receivable = aggregates.data.receivable ?? null;
  const monthly = aggregates.data.monthly ?? null;
  const interest = aggregates.data.interest ?? null;
  const activeCount = creditSales.filter((sale) => sale.status === 'active').length;
  const setupCount = creditSales.filter((sale) => setupStatuses.has(sale.status)).length;
  const completedCount = creditSales.filter((sale) => sale.status === 'completed').length;
  const stoppedCount = creditSales.filter((sale) => stoppedStatuses.has(sale.status)).length;
  const currencyCount = new Set(creditSales.map((sale) => normalizeBusinessCurrencyCode(sale.currency, preferredCurrency))).size;
  const formatAggregate = (aggregate: KpiMonetaryAggregate | null) => (
    aggregate && !aggregates.loading
      ? formatBusinessCurrencyAmount(aggregate.preferredTotal, preferredCurrency, moneyFormatOptions)
      : '—'
  );
  const receivableTotalLabel = formatAggregate(receivable);
  const monthlyFlowLabel = formatAggregate(monthly);
  const totalInterestLabel = formatAggregate(interest);
  const nativeTotalLabel = formatNativeBreakdown(receivable, preferredCurrency);
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
      id: 'activeSales',
      icon: <Timer className="h-4 w-4" />,
      iconClassName: 'text-blue-600',
      label: labels.labels.activeSales,
      value: formatCount(activeCount),
      valueClassName: 'text-blue-600',
      active: activeStatus === 'active',
      onClick: () => onStatusChange('active'),
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
      active: activeStatus === 'active',
      onClick: () => onStatusChange('active'),
    });
  }

  if (setupCount > 0) {
    alertChips.push({
      id: 'setup',
      icon: <Gauge className="h-3.5 w-3.5" />,
      label: labels.alerts.simulated(setupCount),
      tone: 'warning',
      active: activeStatus === 'setup',
      onClick: () => onStatusChange('setup'),
    });
  }

  if (stoppedCount > 0) {
    alertChips.push({
      id: 'stopped',
      icon: <AlertTriangle className="h-3.5 w-3.5" />,
      label: labels.alerts.blocked(stoppedCount),
      tone: 'danger',
      active: activeStatus === 'stopped',
      onClick: () => onStatusChange('stopped'),
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
      active: activeStatus === 'active',
      onClick: () => onStatusChange('active'),
    },
    {
      id: 'setup',
      className: 'bg-[#F4C84A]',
      count: setupCount,
      label: labels.segments.setup,
      active: activeStatus === 'setup',
      onClick: () => onStatusChange('setup'),
    },
    {
      id: 'completed',
      className: 'bg-emerald-500',
      count: completedCount,
      label: labels.segments.completed,
      active: activeStatus === 'completed',
      onClick: () => onStatusChange('completed'),
    },
    {
      id: 'stopped',
      className: 'bg-rose-500',
      count: stoppedCount,
      label: labels.segments.stopped,
      active: activeStatus === 'stopped',
      onClick: () => onStatusChange('stopped'),
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
        rateLabel: receivable?.exchangeRate.mode === 'daily'
          ? copy.kpiEngine.currency.dailyRate
          : copy.kpiEngine.currency.unavailable,
        effectiveDate: receivable?.exchangeRate.effectiveDate,
        source: receivable?.exchangeRate.source,
        isPartial: Boolean(aggregates.error || receivable?.partial),
        excludedCount: receivable?.excludedRecords ?? (aggregates.error ? creditSales.length : 0),
        labels: copy.kpiEngine.currency,
      }}
    />
  );
}
