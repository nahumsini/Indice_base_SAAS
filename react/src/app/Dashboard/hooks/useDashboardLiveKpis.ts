import { useEffect, useState } from 'react';
import type { DashboardKpiCardData } from '../dashboardData';
import type { MainDashboardTranslations } from '../translations';
import { usePreferredBusinessCurrency } from '../../BasicModules/shared/BusinessCurrencyContext';
import { executivePanelApi } from '../../BasicModules/Kpis/KPIs/executivePanelApi';
import type {
  ExecutiveKpiDomain,
  ExecutiveDomainMetric,
  ExecutiveKpiResponse,
} from '../../BasicModules/Kpis/KPIs/types';

type DashboardLiveKpiMap = Partial<Record<string, DashboardKpiCardData>>;

type MetricCardDefinition = {
  id: string;
  metricId: string;
  title: string;
};

const executiveMetricCards = (copy: MainDashboardTranslations): MetricCardDefinition[] => [
  { id: 'monthlyRevenue', metricId: 'netSales', title: copy.kpis.monthlyRevenue.title },
  { id: 'averageTicket', metricId: 'averageTicket', title: copy.kpis.averageTicket.title },
  { id: 'salesConversion', metricId: 'conversion', title: copy.kpis.salesConversion.title },
  { id: 'monthlyExpenses', metricId: 'expenseTotal', title: copy.kpis.monthlyExpenses.title },
  { id: 'budgetUtilization', metricId: 'budgetUsage', title: copy.kpis.budgetUtilization.title },
  { id: 'pendingExpenses', metricId: 'payables', title: copy.kpis.pendingExpenses.title },
  { id: 'overdueExpenses', metricId: 'overduePayables', title: copy.kpis.overdueExpenses.title },
  { id: 'pettyCashBalance', metricId: 'availableBalance', title: copy.kpis.pettyCashBalance.title },
  { id: 'inventoryValue', metricId: 'inventoryValue', title: copy.kpis.inventoryValue.title },
  { id: 'lowStockItems', metricId: 'lowStock', title: copy.kpis.lowStockItems.title },
  { id: 'taskCompletionRate', metricId: 'completionRate', title: copy.kpis.taskCompletionRate.title },
  { id: 'overdueTasks', metricId: 'overdueTasks', title: copy.kpis.overdueTasks.title },
];

const formatNumber = (value: number, locale: string) =>
  new Intl.NumberFormat(locale, { maximumFractionDigits: 2 }).format(value);

const formatCurrency = (value: number, locale: string, currency: string) => {
  try {
    return new Intl.NumberFormat(locale, {
      currency,
      maximumFractionDigits: 0,
      style: 'currency',
    }).format(value);
  } catch {
    return `${currency} ${formatNumber(value, locale)}`;
  }
};

const formatPercent = (value: number, locale: string) =>
  new Intl.NumberFormat(locale, {
    maximumFractionDigits: 1,
    style: 'percent',
  }).format(value / 100);

const formatMetricValue = (
  metric: ExecutiveDomainMetric,
  locale: string,
  preferredCurrency: string,
) => {
  if (!metric.available) return '—';
  if (metric.unit === 'money') return formatCurrency(metric.value, locale, preferredCurrency);
  if (metric.unit === 'percent') return formatPercent(metric.value, locale);
  return formatNumber(metric.value, locale);
};

const metricChangeLabel = (
  metric: ExecutiveDomainMetric,
  locale: string,
  copy: MainDashboardTranslations['kpiComparison'],
) => {
  if (!metric.available) return copy.unavailable;
  if (metric.comparisonAvailable && metric.percentChange !== null) {
    const formattedChange = new Intl.NumberFormat(locale, {
      maximumFractionDigits: 1,
      signDisplay: 'always',
      style: 'percent',
    }).format(metric.percentChange / 100);
    return `${formattedChange} ${copy.versusPrevious}`;
  }
  if (metric.basis === 'currentSnapshot') return copy.currentSnapshot;
  if (metric.basis === 'periodEnd') return copy.periodEnd;
  return copy.noComparison;
};

const metricTrend = (metric: ExecutiveDomainMetric): DashboardKpiCardData['trend'] => {
  if (!metric.comparisonAvailable || metric.absoluteChange === null || metric.absoluteChange === 0) return 'flat';
  return metric.absoluteChange > 0 ? 'up' : 'down';
};

const metricTone = (metric: ExecutiveDomainMetric): DashboardKpiCardData['tone'] => {
  if (!metric.available || metric.status === 'watch') return 'neutral';
  return metric.status === 'healthy' ? 'positive' : 'negative';
};

const metricIsFavorable = (metric: ExecutiveDomainMetric) => {
  if (!metric.available) return false;
  if (!metric.comparisonAvailable || metric.absoluteChange === null) return metric.status === 'healthy';
  if (metric.direction === 'up') return metric.absoluteChange >= 0;
  if (metric.direction === 'down') return metric.absoluteChange <= 0;
  return metric.status === 'healthy';
};

type MetricContext = {
  domain: ExecutiveKpiDomain;
  metric: ExecutiveDomainMetric;
};

const buildMetricMap = (response: ExecutiveKpiResponse) =>
  new Map(response.domains.items.flatMap((domain) => domain.metrics.map((metric) => [
    metric.id,
    { domain, metric } satisfies MetricContext,
  ] as const)));

const unavailableReason = (
  definition: MetricCardDefinition,
  context: MetricContext,
  copy: MainDashboardTranslations['kpiComparison'],
) => {
  if (context.metric.excludedCurrencies.length > 0) return copy.unavailable;
  if (definition.id === 'salesConversion') return copy.noClosedOpportunities;
  if (definition.id === 'lowStockItems') return copy.noTrackedInventory;
  if (definition.id === 'budgetUtilization') return copy.noBudgetCoverage;
  if (definition.id === 'taskCompletionRate') {
    return context.domain.dataQuality.invalidRecords > 0
      ? copy.taskDataQuality
      : copy.noScheduledTasks;
  }
  if (definition.id === 'overdueTasks' && context.domain.dataQuality.invalidRecords > 0) {
    return copy.taskDataQuality;
  }
  return copy.unavailable;
};

export function useDashboardLiveKpis(copy: MainDashboardTranslations, locale: string) {
  const {
    exchangeRateMetadata,
    exchangeRatesPerUsd,
    preferredCurrency,
  } = usePreferredBusinessCurrency();
  const [liveKpis, setLiveKpis] = useState<DashboardLiveKpiMap>({});

  useEffect(() => {
    let isMounted = true;

    const loadLiveKpis = async () => {
      const nextKpis: DashboardLiveKpiMap = {};
      const preferredRate = exchangeRatesPerUsd[preferredCurrency as keyof typeof exchangeRatesPerUsd] ?? 1;
      const preferredSource = exchangeRateMetadata.sourceDetails?.find(
        (source) => source.currencyCode === preferredCurrency,
      );
      const sourceLabel = preferredSource?.status === 'official'
        ? preferredSource.institution
        : copy.kpis.dailyExchangeRate.fallback;
      const sourceDate = preferredSource?.observedDate || exchangeRateMetadata.sourceDate;
      const formattedRate = new Intl.NumberFormat(locale, {
        maximumFractionDigits: preferredCurrency === 'COP' ? 2 : 4,
      }).format(preferredRate);

      nextKpis.dailyExchangeRate = {
        title: copy.kpis.dailyExchangeRate.title,
        value: `1 USD = ${formattedRate} ${preferredCurrency}`,
        change: [sourceLabel, sourceDate].filter(Boolean).join(' · '),
        isPositive: true,
        tone: 'neutral',
        trend: 'flat',
      };

      try {
        const response = await executivePanelApi.get({
          search: '',
          unitId: '',
          businessId: '',
          period: 'monthly',
          from: '',
          to: '',
          risk: 'all',
        }, preferredCurrency);

        if (!isMounted) return;

        const metrics = buildMetricMap(response);
        executiveMetricCards(copy).forEach((definition) => {
          const context = metrics.get(definition.metricId);
          if (!context) return;
          const { metric } = context;
          nextKpis[definition.id] = {
            title: definition.title,
            value: formatMetricValue(
              metric,
              locale,
              response.domains.preferredCurrency,
            ),
            change: metric.available
              ? metricChangeLabel(metric, locale, copy.kpiComparison)
              : unavailableReason(definition, context, copy.kpiComparison),
            isPositive: metricIsFavorable(metric),
            tone: metricTone(metric),
            trend: metricTrend(metric),
          };
        });
      } catch {
        executiveMetricCards(copy).forEach((definition) => {
          nextKpis[definition.id] = {
            title: definition.title,
            value: copy.kpiComparison.unavailable,
            change: copy.kpiComparison.unavailable,
            isPositive: false,
            tone: 'neutral',
            trend: 'flat',
          };
        });
      }

      if (isMounted) setLiveKpis(nextKpis);
    };

    void loadLiveKpis();

    return () => {
      isMounted = false;
    };
  }, [copy, exchangeRateMetadata, exchangeRatesPerUsd, locale, preferredCurrency]);

  return liveKpis;
}
