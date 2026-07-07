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
  convertBusinessCurrencyAmount,
  formatBusinessCurrencyAmount,
  normalizeBusinessCurrencyCode,
} from '../../shared/businessCurrency';
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

function formatNativeBreakdown(
  creditSales: CreditSale[],
  getAmount: (sale: CreditSale) => number,
  fallbackCurrency: string,
) {
  const totalsByCurrency = creditSales.reduce<Map<string, number>>((totals, sale) => {
    const currency = normalizeBusinessCurrencyCode(sale.currency, fallbackCurrency);
    totals.set(currency, (totals.get(currency) ?? 0) + getAmount(sale));
    return totals;
  }, new Map());

  if (totalsByCurrency.size === 0) {
    return formatBusinessCurrencyAmount(0, fallbackCurrency, moneyFormatOptions);
  }

  return Array.from(totalsByCurrency.entries())
    .map(([currency, total]) => formatBusinessCurrencyAmount(total, currency, moneyFormatOptions))
    .join(' / ');
}

function getPreferredTotal(
  creditSales: CreditSale[],
  preferredCurrency: string,
  exchangeRatesPerUsd: ReturnType<typeof usePreferredBusinessCurrency>['exchangeRatesPerUsd'],
  getAmount: (sale: CreditSale) => number,
) {
  return creditSales.reduce((total, sale) => (
    total + convertBusinessCurrencyAmount(
      getAmount(sale),
      sale.currency,
      preferredCurrency,
      exchangeRatesPerUsd,
    )
  ), 0);
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
  const { exchangeRatesPerUsd, preferredCurrency } = usePreferredBusinessCurrency();
  const labels = copy.kpiEngine.creditSales;
  const activeCount = creditSales.filter((sale) => sale.status === 'active').length;
  const setupCount = creditSales.filter((sale) => setupStatuses.has(sale.status)).length;
  const completedCount = creditSales.filter((sale) => sale.status === 'completed').length;
  const stoppedCount = creditSales.filter((sale) => stoppedStatuses.has(sale.status)).length;
  const currencyCount = new Set(creditSales.map((sale) => normalizeBusinessCurrencyCode(sale.currency, preferredCurrency))).size;
  const totalReceivable = getPreferredTotal(
    creditSales,
    preferredCurrency,
    exchangeRatesPerUsd,
    (sale) => sale.selectedSimulation.totalPayable,
  );
  const monthlyFlow = getPreferredTotal(
    creditSales,
    preferredCurrency,
    exchangeRatesPerUsd,
    (sale) => sale.selectedSimulation.monthlyPayment,
  );
  const totalInterest = getPreferredTotal(
    creditSales,
    preferredCurrency,
    exchangeRatesPerUsd,
    (sale) => sale.selectedSimulation.totalInterest,
  );
  const receivableTotalLabel = formatBusinessCurrencyAmount(totalReceivable, preferredCurrency, moneyFormatOptions);
  const monthlyFlowLabel = formatBusinessCurrencyAmount(monthlyFlow, preferredCurrency, moneyFormatOptions);
  const totalInterestLabel = formatBusinessCurrencyAmount(totalInterest, preferredCurrency, moneyFormatOptions);
  const nativeTotalLabel = formatNativeBreakdown(
    creditSales,
    (sale) => sale.selectedSimulation.totalPayable,
    preferredCurrency,
  );
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
      icon: <Gauge className="h-4 w-4" />,
      iconClassName: 'text-[#9A6B05]',
      label: labels.labels.totalInterest,
      value: totalInterestLabel,
      valueClassName: 'text-[#9A6B05]',
    },
    {
      id: 'completedSales',
      icon: <CheckCircle2 className="h-4 w-4" />,
      iconClassName: 'text-slate-500',
      label: labels.labels.completedSales,
      value: formatCount(completedCount),
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
    />
  );
}
