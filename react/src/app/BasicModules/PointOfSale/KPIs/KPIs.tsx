import { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  BarChart3,
  CircleDollarSign,
  MonitorCheck,
  ReceiptText,
  RefreshCw,
  RotateCcw,
  Scale,
  ShieldCheck,
  ShoppingCart,
} from 'lucide-react';
import type { IndiceFilterOption } from '../../../components/frontend-os';
import { configCenterApi } from '../../../api/configCenter';
import { usePreferredBusinessCurrency } from '../../shared/BusinessCurrencyContext';
import {
  useKpiMonetaryAggregates,
  type KpiMonetaryAggregate,
  type KpiMonetaryBatchQuery,
} from '../../shared/kpiMonetaryApi';
import { useCompanyPrintIdentity } from '../../shared/print/useCompanyPrintIdentity';
import { printStandardKpiReport } from '../../shared/print/standardKpiPrintReport';
import type { PosCashClosingSummaryRow } from '../shared/cashClosingHistory.types';
import {
  posBackendApi,
  type PosCashRegisterResponse,
  type PosWarehouseSummary,
} from '../Sale/services/posBackendApi';
import { PosKpiCashClosingTable } from './components/PosKpiCashClosingTable';
import { PosKpiContextStrip } from './components/PosKpiContextStrip';
import { PosKpiFilters } from './components/PosKpiFilters';
import { PosKpiGrid, type PosKpiCardItem } from './components/PosKpiCard';
import { PosKpiOperatingPanels } from './components/PosKpiOperatingPanels';
import { PosKpiSignals } from './components/PosKpiSignals';
import { PosKpiTitleBar } from './components/PosKpiTitleBar';
import { usePosKpiCashClosings } from './hooks/usePosKpiCashClosings';
import {
  comparison,
  getDateRangeForPeriod,
  getPreviousDateRange,
  groupRowsByDay,
  groupRowsByRegister,
  groupRowsByWarehouse,
  pointComparison,
  sumTickets,
  toNumber,
  uniqueRegistersWithSales,
  type PosKpiAnalytics,
  type PosKpiComparison,
  type PosKpiFiltersState,
  type PosKpiPaymentMixRow,
  type PosKpiPeriod,
  type PosKpiTrendRow,
} from './utils/posKpiAnalytics';
import { usePosKpiCopy } from './posKpiTranslations';

const initialRange = getDateRangeForPeriod('this_month');
const initialFilters: PosKpiFiltersState = {
  cashRegisterId: '',
  dateFrom: initialRange.dateFrom,
  dateTo: initialRange.dateTo,
  period: 'this_month',
  search: '',
  userId: '',
  warehouseId: '',
};

const metricDefinitions = {
  sales: 'POS_CLOSING_TOTAL',
  cash: 'POS_CLOSING_CASH_SALES',
  card: 'POS_CLOSING_CARD_SALES',
  transfer: 'POS_CLOSING_TRANSFER_SALES',
  credit: 'POS_CLOSING_CREDIT_SALES',
  netDifference: 'POS_CLOSING_DIFFERENCE',
  absoluteDifference: 'POS_CLOSING_ABSOLUTE_DIFFERENCE',
  shortage: 'POS_CLOSING_SHORTAGE',
  overage: 'POS_CLOSING_OVERAGE',
  refunds: 'POS_CLOSING_REFUNDS',
} as const;

type AggregateMetricName = keyof typeof metricDefinitions;

function buildMetricQueries(prefix: string, ids: number[]): KpiMonetaryBatchQuery[] {
  return (Object.entries(metricDefinitions) as Array<[AggregateMetricName, (typeof metricDefinitions)[AggregateMetricName]]>)
    .map(([key, metric]) => ({
      ids,
      key: `${prefix}-${key}`,
      metric,
      preferredCurrency: '',
    }));
}

function aggregateValue(data: Record<string, KpiMonetaryAggregate>, key: string) {
  return Number(data[key]?.preferredTotal ?? 0);
}

function dateKeys(from: string, to: string) {
  const current = new Date(`${from}T00:00:00`);
  const end = new Date(`${to}T00:00:00`);
  const keys: string[] = [];
  while (current <= end) {
    keys.push(current.toISOString().slice(0, 10));
    current.setDate(current.getDate() + 1);
  }
  return keys;
}

function percentageLabel(value: number) {
  const prefix = value > 0 ? '+' : '';
  return `${prefix}${value.toFixed(1)}%`;
}

function pointLabel(value: number) {
  const prefix = value > 0 ? '+' : '';
  return `${prefix}${value.toFixed(1)}`;
}

export default function KPIs() {
  const { copy, locale } = usePosKpiCopy();
  const { preferredCurrency } = usePreferredBusinessCurrency();
  const { identity: companyPrintIdentity, isReady: isCompanyPrintIdentityReady } = useCompanyPrintIdentity();
  const [filters, setFilters] = useState<PosKpiFiltersState>(initialFilters);
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [warehouses, setWarehouses] = useState<PosWarehouseSummary[]>([]);
  const [cashRegisters, setCashRegisters] = useState<PosCashRegisterResponse[]>([]);
  const [cashierOptions, setCashierOptions] = useState<IndiceFilterOption[]>([]);
  const [optionsError, setOptionsError] = useState('');

  useEffect(() => {
    const timeoutId = window.setTimeout(() => setDebouncedSearch(filters.search), 300);
    return () => window.clearTimeout(timeoutId);
  }, [filters.search]);

  const queryFilters = useMemo(() => ({
    ...filters,
    search: debouncedSearch,
  }), [debouncedSearch, filters]);

  const {
    error,
    loading,
    partial: rowsPartial,
    previousRows,
    refresh,
    rows,
    totalCount,
  } = usePosKpiCashClosings(queryFilters);

  useEffect(() => {
    let cancelled = false;
    async function loadOptions() {
      setOptionsError('');
      const [contextResult, usersResult] = await Promise.allSettled([
        posBackendApi.context(),
        configCenterApi.getUsers(),
      ]);
      if (cancelled) return;
      if (contextResult.status === 'fulfilled') {
        setWarehouses(Array.isArray(contextResult.value.warehouses) ? contextResult.value.warehouses : []);
        setCashRegisters(Array.isArray(contextResult.value.cashRegisters) ? contextResult.value.cashRegisters : []);
      } else {
        setOptionsError(contextResult.reason instanceof Error ? contextResult.reason.message : String(contextResult.reason));
      }
      if (usersResult.status === 'fulfilled') {
        setCashierOptions(usersResult.value.users.map((user) => ({
          label: [user.nombres, user.apellidos].filter(Boolean).join(' ') || user.email,
          value: String(user.id),
        })).sort((first, second) => first.label.localeCompare(second.label, locale)));
      }
    }
    void loadOptions();
    return () => {
      cancelled = true;
    };
  }, [locale]);

  const currentRegisterGroups = useMemo(() => groupRowsByRegister(rows), [rows]);
  const currentWarehouseGroups = useMemo(() => groupRowsByWarehouse(rows), [rows]);
  const currentDayGroups = useMemo(() => groupRowsByDay(rows), [rows]);
  const previousDayGroups = useMemo(() => groupRowsByDay(previousRows), [previousRows]);
  const previousRange = useMemo(
    () => getPreviousDateRange(filters.dateFrom, filters.dateTo),
    [filters.dateFrom, filters.dateTo],
  );
  const currentDates = useMemo(() => dateKeys(filters.dateFrom, filters.dateTo), [filters.dateFrom, filters.dateTo]);
  const previousDates = useMemo(
    () => dateKeys(previousRange.dateFrom, previousRange.dateTo),
    [previousRange.dateFrom, previousRange.dateTo],
  );

  const monetaryQueries = useMemo<KpiMonetaryBatchQuery[]>(() => {
    const queries = [
      ...buildMetricQueries('current', rows.map((row) => row.id)),
      ...buildMetricQueries('previous', previousRows.map((row) => row.id)),
    ];

    currentDates.forEach((date) => {
      queries.push({
        ids: (currentDayGroups.get(date) ?? []).map((row) => row.id),
        key: `current-day-${date}`,
        metric: 'POS_CLOSING_TOTAL',
        preferredCurrency: '',
      });
    });
    previousDates.forEach((date) => {
      queries.push({
        ids: (previousDayGroups.get(date) ?? []).map((row) => row.id),
        key: `previous-day-${date}`,
        metric: 'POS_CLOSING_TOTAL',
        preferredCurrency: '',
      });
    });
    currentWarehouseGroups.forEach((groupRows, id) => {
      queries.push({
        ids: groupRows.map((row) => row.id),
        key: `warehouse-${id}-sales`,
        metric: 'POS_CLOSING_TOTAL',
        preferredCurrency: '',
      });
    });
    currentRegisterGroups.forEach((groupRows, id) => {
      const ids = groupRows.map((row) => row.id);
      (['sales', 'cash', 'absoluteDifference', 'refunds'] as AggregateMetricName[]).forEach((key) => {
        queries.push({
          ids,
          key: `register-${id}-${key}`,
          metric: metricDefinitions[key],
          preferredCurrency: '',
        });
      });
    });

    return queries.map((query) => ({ ...query, preferredCurrency }));
  }, [
    currentDates,
    currentDayGroups,
    currentRegisterGroups,
    currentWarehouseGroups,
    preferredCurrency,
    previousDates,
    previousDayGroups,
    previousRows,
    rows,
  ]);

  const {
    data: monetary,
    error: monetaryError,
    loading: monetaryLoading,
  } = useKpiMonetaryAggregates(monetaryQueries);

  const activeRegisters = useMemo(() => cashRegisters.filter((register) => (
    register.active !== false
    && register.status !== 'INACTIVE'
    && (!filters.warehouseId || String(register.warehouseId) === filters.warehouseId)
    && (!filters.cashRegisterId || String(register.id) === filters.cashRegisterId)
  )), [cashRegisters, filters.cashRegisterId, filters.warehouseId]);

  const analytics = useMemo<PosKpiAnalytics>(() => {
    const revenue = aggregateValue(monetary, 'current-sales');
    const previousRevenue = aggregateValue(monetary, 'previous-sales');
    const tickets = sumTickets(rows);
    const previousTickets = sumTickets(previousRows);
    const closings = rows.length;
    const previousClosings = previousRows.length;
    const averageTicket = tickets > 0 ? revenue / tickets : 0;
    const previousAverageTicket = previousTickets > 0 ? previousRevenue / previousTickets : 0;
    const averageClosing = closings > 0 ? revenue / closings : 0;
    const previousAverageClosing = previousClosings > 0 ? previousRevenue / previousClosings : 0;
    const totalCashSales = aggregateValue(monetary, 'current-cash');
    const previousCashSales = aggregateValue(monetary, 'previous-cash');
    const absoluteDifference = aggregateValue(monetary, 'current-absoluteDifference');
    const previousAbsoluteDifference = aggregateValue(monetary, 'previous-absoluteDifference');
    const cashAccuracy = totalCashSales > 0 ? Math.max(0, 100 - (absoluteDifference / totalCashSales) * 100) : null;
    const previousCashAccuracy = previousCashSales > 0
      ? Math.max(0, 100 - (previousAbsoluteDifference / previousCashSales) * 100)
      : null;
    const refunds = aggregateValue(monetary, 'current-refunds');
    const previousRefunds = aggregateValue(monetary, 'previous-refunds');
    const registersWithSales = uniqueRegistersWithSales(rows);
    const previousRegistersWithSales = uniqueRegistersWithSales(previousRows);
    const registerCoverage = activeRegisters.length > 0 ? (registersWithSales / activeRegisters.length) * 100 : 0;
    const previousCoverage = activeRegisters.length > 0 ? (previousRegistersWithSales / activeRegisters.length) * 100 : 0;
    const paymentMix = (['cash', 'card', 'transfer', 'credit'] as const).map((key) => ({
      amount: aggregateValue(monetary, `current-${key}`),
      method: key.toUpperCase() as PosKpiPaymentMixRow['method'],
      percentage: 0,
    }));
    const paymentsTotal = paymentMix.reduce((total, item) => total + item.amount, 0);
    paymentMix.forEach((item) => {
      item.percentage = paymentsTotal > 0 ? (item.amount / paymentsTotal) * 100 : 0;
    });

    const trendFormatter = new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short' });
    const trend: PosKpiTrendRow[] = currentDates.map((date, index) => ({
      current: aggregateValue(monetary, `current-day-${date}`),
      key: date,
      label: trendFormatter.format(new Date(`${date}T12:00:00`)),
      previous: aggregateValue(monetary, `previous-day-${previousDates[index] ?? ''}`),
    }));
    const topCashRegisters = Array.from(currentRegisterGroups.entries()).map(([id, groupRows]) => {
      const value = aggregateValue(monetary, `register-${id}-sales`);
      const first = groupRows[0];
      return {
        closings: groupRows.length,
        id,
        name: first?.cashRegisterName || first?.cashRegisterCode || `Caja ${id}`,
        share: revenue > 0 ? (value / revenue) * 100 : 0,
        tickets: sumTickets(groupRows),
        value,
      };
    }).sort((first, second) => second.value - first.value).slice(0, 5);
    const topWarehouses = Array.from(currentWarehouseGroups.entries()).map(([id, groupRows]) => {
      const value = aggregateValue(monetary, `warehouse-${id}-sales`);
      const first = groupRows[0];
      return {
        closings: groupRows.length,
        id,
        name: first?.warehouseName || `Almacén ${id}`,
        share: revenue > 0 ? (value / revenue) * 100 : 0,
        tickets: sumTickets(groupRows),
        value,
      };
    }).sort((first, second) => second.value - first.value).slice(0, 5);
    const performance = Array.from(currentRegisterGroups.entries()).map(([id, groupRows]) => {
      const first = groupRows[0];
      const sales = aggregateValue(monetary, `register-${id}-sales`);
      const cash = aggregateValue(monetary, `register-${id}-cash`);
      const difference = aggregateValue(monetary, `register-${id}-absoluteDifference`);
      const registerTickets = sumTickets(groupRows);
      return {
        cashAccuracy: cash > 0 ? Math.max(0, 100 - (difference / cash) * 100) : null,
        cashRegisterCode: first?.cashRegisterCode || String(id),
        cashRegisterId: id,
        cashRegisterName: first?.cashRegisterName || first?.cashRegisterCode || `Caja ${id}`,
        closings: groupRows.length,
        averageTicket: registerTickets > 0 ? sales / registerTickets : 0,
        lastClosingAt: groupRows.reduce((latest, row) => row.closedAt > latest ? row.closedAt : latest, groupRows[0]?.closedAt ?? ''),
        refunds: aggregateValue(monetary, `register-${id}-refunds`),
        sales,
        tickets: registerTickets,
        warehouseId: first?.warehouseId ?? 0,
        warehouseName: first?.warehouseName || `Almacén ${first?.warehouseId ?? 0}`,
      };
    });

    return {
      absoluteDifference,
      activeRegisters: activeRegisters.length,
      averageClosing,
      averageTicket,
      cashAccuracy,
      closings,
      comparisons: {
        absoluteDifference: comparison(absoluteDifference, previousAbsoluteDifference),
        averageClosing: comparison(averageClosing, previousAverageClosing),
        averageTicket: comparison(averageTicket, previousAverageTicket),
        cashAccuracy: pointComparison(cashAccuracy, previousCashAccuracy),
        refunds: comparison(refunds, previousRefunds),
        registerCoverage: pointComparison(registerCoverage, previousCoverage),
        revenue: comparison(revenue, previousRevenue),
        tickets: comparison(tickets, previousTickets),
      },
      currencyTotals: monetary['current-sales']?.nativeTotals.map((item) => ({
        amount: Number(item.amount),
        currency: item.currency,
      })) ?? [],
      netDifference: aggregateValue(monetary, 'current-netDifference'),
      overage: aggregateValue(monetary, 'current-overage'),
      paymentMix,
      performance,
      periodLabel: copy.period.labels[filters.period],
      refunds,
      refundRate: revenue > 0 ? (refunds / revenue) * 100 : 0,
      registerCoverage,
      registersWithSales,
      revenue,
      shortage: aggregateValue(monetary, 'current-shortage'),
      tickets,
      topCashRegisters,
      topWarehouses,
      totalCashSales,
      totalCount,
      trend,
    };
  }, [
    activeRegisters.length,
    copy.period.labels,
    currentDates,
    currentRegisterGroups,
    currentWarehouseGroups,
    filters.period,
    locale,
    monetary,
    previousDates,
    previousRows,
    rows,
    totalCount,
  ]);

  const formatCurrency = (amount: number, currency = preferredCurrency) => (
    new Intl.NumberFormat(locale, { style: 'currency', currency }).format(amount)
  );
  const nativeBreakdown = analytics.currencyTotals.length > 0
    ? analytics.currencyTotals.map(({ amount, currency }) => `${formatCurrency(amount, currency)} ${currency}`).join(' / ')
    : '—';
  const primaryAggregate = monetary['current-sales'];
  const dataPartial = rowsPartial || Boolean(monetaryError) || Boolean(primaryAggregate?.partial);
  const busy = loading || monetaryLoading;

  const comparisonBadge = (
    value: PosKpiComparison,
    options: { points?: boolean; positiveWhenDown?: boolean } = {},
  ) => ({
    direction: value.direction,
    label: value.delta === null
      ? copy.comparison.unavailable
      : options.points
        ? copy.comparison.points(pointLabel(value.delta))
        : copy.comparison.previous(percentageLabel(value.delta)),
    positiveWhenDown: options.positiveWhenDown,
  });

  const kpiCards = useMemo<PosKpiCardItem[]>(() => [
    {
      comparison: comparisonBadge(analytics.comparisons.revenue),
      detail: copy.cards.salesDetail,
      icon: ShoppingCart,
      label: copy.cards.revenue,
      tone: 'coral',
      value: formatCurrency(analytics.revenue),
    },
    {
      comparison: comparisonBadge(analytics.comparisons.tickets),
      detail: copy.cards.ticketsDetail(analytics.closings),
      icon: ReceiptText,
      label: copy.cards.tickets,
      tone: 'blue',
      value: String(analytics.tickets),
    },
    {
      comparison: comparisonBadge(analytics.comparisons.averageTicket),
      detail: copy.cards.averageTicketDetail,
      icon: CircleDollarSign,
      label: copy.cards.averageTicket,
      tone: 'green',
      value: formatCurrency(analytics.averageTicket),
    },
    {
      comparison: comparisonBadge(analytics.comparisons.averageClosing),
      detail: copy.cards.averageClosingDetail,
      icon: BarChart3,
      label: copy.cards.averageClosing,
      tone: 'purple',
      value: formatCurrency(analytics.averageClosing),
    },
    {
      comparison: comparisonBadge(analytics.comparisons.cashAccuracy, { points: true }),
      detail: copy.cards.accuracyDetail,
      icon: ShieldCheck,
      label: copy.cards.cashAccuracy,
      tone: analytics.cashAccuracy === null ? 'yellow' : analytics.cashAccuracy >= 99.5 ? 'green' : analytics.cashAccuracy >= 98 ? 'yellow' : 'red',
      value: analytics.cashAccuracy === null ? copy.common.unavailable : `${analytics.cashAccuracy.toFixed(1)}%`,
    },
    {
      comparison: comparisonBadge(analytics.comparisons.absoluteDifference, { positiveWhenDown: true }),
      detail: copy.cards.differenceDetail(formatCurrency(analytics.shortage), formatCurrency(analytics.overage)),
      icon: Scale,
      label: copy.cards.cashDifference,
      tone: analytics.absoluteDifference >= 1 ? 'red' : 'green',
      value: formatCurrency(analytics.absoluteDifference),
    },
    {
      comparison: comparisonBadge(analytics.comparisons.refunds, { positiveWhenDown: true }),
      detail: copy.cards.refundDetail(analytics.refundRate.toFixed(1)),
      icon: RotateCcw,
      label: copy.cards.refunds,
      tone: analytics.refundRate >= 5 ? 'red' : 'yellow',
      value: formatCurrency(analytics.refunds),
    },
    {
      comparison: comparisonBadge(analytics.comparisons.registerCoverage, { points: true }),
      detail: copy.cards.coverageDetail(analytics.registersWithSales, analytics.activeRegisters),
      icon: MonitorCheck,
      label: copy.cards.coverage,
      tone: analytics.registerCoverage >= 80 ? 'green' : analytics.registerCoverage > 0 ? 'yellow' : 'blue',
      value: analytics.activeRegisters > 0 ? `${analytics.registerCoverage.toFixed(1)}%` : copy.common.unavailable,
    },
  ], [analytics, copy, formatCurrency]);

  const warehouseOptions = useMemo<IndiceFilterOption[]>(() => warehouses.map((warehouse) => ({
    label: [warehouse.name, warehouse.unitName, warehouse.businessName].filter(Boolean).join(' · '),
    value: String(warehouse.id),
  })).sort((first, second) => first.label.localeCompare(second.label, locale)), [locale, warehouses]);
  const cashRegisterOptions = useMemo<IndiceFilterOption[]>(() => cashRegisters
    .filter((register) => !filters.warehouseId || String(register.warehouseId) === filters.warehouseId)
    .map((register) => ({
      label: `${register.name} · ${register.code}`,
      value: String(register.id),
    }))
    .sort((first, second) => first.label.localeCompare(second.label, locale)), [cashRegisters, filters.warehouseId, locale]);

  const handleFilterChange = <Key extends keyof PosKpiFiltersState>(key: Key, value: PosKpiFiltersState[Key]) => {
    setFilters((current) => ({ ...current, [key]: value }));
  };

  const handlePrintReport = () => {
    const dateFormatter = new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short' });
    printStandardKpiReport({
      charts: [
        {
          rows: analytics.paymentMix.map((item) => ({
            label: copy.operating.paymentMethods[item.method],
            value: item.amount,
            valueLabel: `${formatCurrency(item.amount)} · ${item.percentage.toFixed(1)}%`,
          })),
          title: copy.report.paymentMix,
        },
        {
          rows: analytics.trend.map((item) => ({
            label: item.label,
            value: item.current,
            valueLabel: formatCurrency(item.current),
          })),
          title: copy.report.salesTrend,
        },
        {
          rows: analytics.topCashRegisters.map((item) => ({
            label: item.name,
            value: item.value,
            valueLabel: formatCurrency(item.value),
          })),
          title: copy.report.topRegisters,
        },
        {
          rows: analytics.topWarehouses.map((item) => ({
            label: item.name,
            value: item.value,
            valueLabel: formatCurrency(item.value),
          })),
          title: copy.report.topWarehouses,
        },
      ],
      companyIdentity: companyPrintIdentity,
      documentName: copy.report.documentName,
      locale,
      meta: [
        { label: copy.report.period, value: analytics.periodLabel },
        { label: copy.report.preferredCurrency, value: preferredCurrency },
        { label: copy.report.includedClosings, value: String(analytics.closings) },
        { label: copy.report.availableRecords, value: String(analytics.totalCount) },
      ],
      metrics: kpiCards.map((card) => ({ detail: card.detail, label: card.label, value: card.value })),
      reportTitle: copy.report.title,
      subtitle: copy.report.subtitle,
      tables: [{
        emptyLabel: copy.report.emptyTable,
        headers: [...copy.report.headers],
        rows: analytics.performance.map((row) => [
          row.cashRegisterName,
          row.warehouseName,
          formatCurrency(row.sales),
          String(row.tickets),
          formatCurrency(row.averageTicket),
          row.cashAccuracy === null ? copy.common.unavailable : `${row.cashAccuracy.toFixed(1)}%`,
          formatCurrency(row.refunds),
          dateFormatter.format(new Date(row.lastClosingAt)),
        ]),
        title: copy.report.tableTitle,
      }],
    });
  };

  return (
    <div className="space-y-5">
      <PosKpiTitleBar
        copy={copy}
        disabled={!isCompanyPrintIdentityReady || busy || Boolean(error)}
        onPrint={handlePrintReport}
      />

      <PosKpiFilters
        cashiers={cashierOptions}
        cashRegisters={cashRegisterOptions}
        copy={copy}
        filters={filters}
        onChange={handleFilterChange}
        warehouses={warehouseOptions}
      />

      {busy ? (
        <div className="flex items-center gap-3 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-medium text-blue-900 dark:border-blue-800 dark:bg-blue-900/20 dark:text-blue-100">
          <RefreshCw className="h-4 w-4 animate-spin" />
          {copy.states.loading}
        </div>
      ) : null}

      {error ? (
        <div className="flex flex-col gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-900 dark:border-rose-800 dark:bg-rose-900/20 dark:text-rose-100 sm:flex-row sm:items-center sm:justify-between">
          <span className="inline-flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            {error}
          </span>
          <button
            type="button"
            onClick={refresh}
            className="inline-flex min-h-11 items-center justify-center rounded-xl border border-rose-200 bg-white px-3 text-sm font-medium text-rose-700 transition hover:bg-rose-100 dark:border-rose-800 dark:bg-slate-900 dark:text-rose-300 dark:hover:bg-rose-900/30"
          >
            {copy.common.retry}
          </button>
        </div>
      ) : null}

      {!busy && !error && rows.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white px-4 py-4 text-sm font-medium text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
          {copy.states.empty}
        </div>
      ) : null}

      {optionsError ? (
        <span className="sr-only">{optionsError}</span>
      ) : null}

      <PosKpiContextStrip
        closings={analytics.closings}
        copy={copy}
        excludedCurrencies={primaryAggregate?.excludedCurrencies ?? []}
        excludedRecords={primaryAggregate?.excludedRecords ?? 0}
        nativeBreakdown={nativeBreakdown}
        partial={dataPartial}
        preferredCurrency={preferredCurrency}
        rateDate={primaryAggregate?.exchangeRate.effectiveDate ?? ''}
        rateLabel={primaryAggregate?.exchangeRate.mode === 'configured' ? copy.context.configuredRate : copy.context.dailyRate}
        rateSource={primaryAggregate?.exchangeRate.source ?? ''}
        totalCount={analytics.totalCount}
      />

      <PosKpiGrid items={kpiCards} />

      <PosKpiOperatingPanels
        analytics={analytics}
        copy={copy}
        formatCurrency={formatCurrency}
        onSelectCashRegister={(id) => {
          const register = cashRegisters.find((item) => item.id === id);
          setFilters((current) => ({
            ...current,
            cashRegisterId: String(id),
            warehouseId: register ? String(register.warehouseId) : current.warehouseId,
          }));
        }}
        onSelectWarehouse={(id) => setFilters((current) => ({
          ...current,
          cashRegisterId: '',
          warehouseId: String(id),
        }))}
      />

      <PosKpiSignals
        analytics={analytics}
        copy={copy}
        dataPartial={dataPartial}
        formatCurrency={formatCurrency}
      />

      <PosKpiCashClosingTable
        copy={copy}
        dateFrom={filters.dateFrom}
        dateTo={filters.dateTo}
        formatCurrency={formatCurrency}
        locale={locale}
        rows={analytics.performance}
      />
    </div>
  );
}
