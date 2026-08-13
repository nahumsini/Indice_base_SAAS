import { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  Banknote,
  Clock3,
  Package,
  Receipt,
  RefreshCw,
  Scale,
  ShoppingCart,
  TrendingUp,
  Wallet,
} from 'lucide-react';
import { usePreferredBusinessCurrency } from '../../shared/BusinessCurrencyContext';
import { useKpiMonetaryAggregate, useKpiMonetaryAggregates, type KpiMonetaryBatchQuery } from '../../shared/kpiMonetaryApi';
import { useCompanyPrintIdentity } from '../../shared/print/useCompanyPrintIdentity';
import { printStandardKpiReport } from '../../shared/print/standardKpiPrintReport';
import { useLanguage } from '../../../shared/context';
import { PosKpiCashClosingTable } from './components/PosKpiCashClosingTable';
import { PosKpiContextStrip } from './components/PosKpiContextStrip';
import { PosKpiFilters } from './components/PosKpiFilters';
import { PosKpiGrid, type PosKpiCardItem } from './components/PosKpiCard';
import { PosKpiOperatingPanels } from './components/PosKpiOperatingPanels';
import { PosKpiSignals } from './components/PosKpiSignals';
import { PosKpiTitleBar } from './components/PosKpiTitleBar';
import { usePosKpiCashClosings } from './hooks/usePosKpiCashClosings';
import {
  buildPosKpiAnalytics,
  type PosKpiAnalytics,
  type PosKpiPeriod,
} from './utils/posKpiAnalytics';

const percent = (value: number) => `${value.toFixed(1)}%`;

export default function KPIs() {
  const { currentLanguage } = useLanguage();
  const { preferredCurrency } = usePreferredBusinessCurrency();
  const { identity: companyPrintIdentity, isReady: isCompanyPrintIdentityReady } = useCompanyPrintIdentity();
  const [period, setPeriod] = useState<PosKpiPeriod>('today');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const {
    rows,
    details,
    loading,
    error,
    detailError,
    detailFetchLimited,
    totalCount,
    refresh,
  } = usePosKpiCashClosings(period);

  const closingIds = rows.map((row) => row.id);
  const revenueAggregate = useKpiMonetaryAggregate({ metric: 'POS_CLOSING_TOTAL', preferredCurrency, ids: closingIds });
  const cashAggregate = useKpiMonetaryAggregate({ metric: 'POS_CLOSING_CASH_SALES', preferredCurrency, ids: closingIds });
  const expectedAggregate = useKpiMonetaryAggregate({ metric: 'POS_CLOSING_EXPECTED_CASH', preferredCurrency, ids: closingIds });
  const countedAggregate = useKpiMonetaryAggregate({ metric: 'POS_CLOSING_COUNTED_CASH', preferredCurrency, ids: closingIds });
  const differenceAggregate = useKpiMonetaryAggregate({ metric: 'POS_CLOSING_DIFFERENCE', preferredCurrency, ids: closingIds });
  const groupedQueries = useMemo<KpiMonetaryBatchQuery[]>(() => {
    const groups = new Map<string, typeof rows>();
    rows.forEach((row) => {
      const keys = [`warehouse-${row.warehouseId}`, `register-${row.cashRegisterId}`, `hour-${new Date(row.closedAt).getHours()}`];
      keys.forEach((key) => groups.set(key, [...(groups.get(key) ?? []), row]));
    });
    return Array.from(groups.entries()).slice(0, 100).map(([key, groupRows]) => ({
      key, metric: 'POS_CLOSING_TOTAL' as const, preferredCurrency, ids: groupRows.map((row) => row.id),
    }));
  }, [preferredCurrency, rows]);
  const groupedAggregates = useKpiMonetaryAggregates(groupedQueries);
  const baseAnalytics = useMemo(() => buildPosKpiAnalytics({
    rows,
    details,
    period,
    totalCount,
    preferredCurrency,
  }), [details, period, preferredCurrency, rows, totalCount]);
  const analytics = useMemo<PosKpiAnalytics>(() => {
    const revenue = revenueAggregate.data?.preferredTotal ?? 0;
    const totalCashSales = cashAggregate.data?.preferredTotal ?? 0;
    const netDifference = differenceAggregate.data?.preferredTotal ?? 0;
    const tickets = baseAnalytics.tickets;
    const registerNames = new Map(details.map((detail) => [String(detail.cashRegisterId), detail.cashRegister?.name || detail.cashRegister?.code || `Caja ${detail.cashRegisterId}`]));
    const warehouses = Array.from(new Set(rows.map((row) => row.warehouseId))).map((id) => ({ name: `Almacen ${id}`, value: groupedAggregates.data[`warehouse-${id}`]?.preferredTotal ?? 0, detail: 'venta cerrada' }));
    const registers = Array.from(new Set(rows.map((row) => row.cashRegisterId))).map((id) => ({ name: registerNames.get(String(id)) ?? `Caja ${id}`, value: groupedAggregates.data[`register-${id}`]?.preferredTotal ?? 0, detail: 'venta cerrada' }));
    const hours = Array.from(new Set(rows.map((row) => new Date(row.closedAt).getHours()))).sort((a, b) => a - b).map((hour) => ({ hour: String(hour), sales: groupedAggregates.data[`hour-${hour}`]?.preferredTotal ?? 0 }));
    return {
      ...baseAnalytics,
      revenue,
      totalCashSales,
      averageTicket: tickets > 0 ? revenue / tickets : 0,
      netDifference,
      overShortRate: totalCashSales > 0 ? Math.abs(netDifference / totalCashSales) * 100 : 0,
      expectedCash: expectedAggregate.data?.preferredTotal ?? 0,
      countedCash: countedAggregate.data?.preferredTotal ?? 0,
      paymentMix: [],
      hourlySales: hours,
      topCashRegisters: registers.sort((a, b) => b.value - a.value).slice(0, 5),
      topWarehouses: warehouses.sort((a, b) => b.value - a.value).slice(0, 5),
    };
  }, [baseAnalytics, cashAggregate.data, countedAggregate.data, details, differenceAggregate.data, expectedAggregate.data, groupedAggregates.data, revenueAggregate.data, rows]);

  const formatCurrency = (amount: number, currency = preferredCurrency) => new Intl.NumberFormat(currentLanguage.code, { style: 'currency', currency }).format(amount);
  const totalPages = Math.max(1, Math.ceil(rows.length / pageSize));
  const paginatedRows = rows.slice((page - 1) * pageSize, page * pageSize);
  const maxHourlySales = Math.max(...analytics.hourlySales.map((entry) => entry.sales), 0);
  const hasDifference = Math.abs(analytics.netDifference) >= 1;
  const insight = getInsight(analytics);
  const paymentBreakdownNote = detailError
    || (detailFetchLimited
      ? 'El desglose por metodo muestra efectivo del listado; usa un periodo mas corto para cargar todos los metodos.'
      : 'El desglose monetario por método se mostrará cuando el backend entregue la agregación autoritativa por forma de pago.');
  const nativeBreakdown = revenueAggregate.data?.nativeTotals.map(({ amount, currency }) => formatCurrency(amount, currency)).join(' / ') ?? '—';

  useEffect(() => {
    setPage((current) => Math.min(current, totalPages));
  }, [totalPages]);

  const handlePeriodChange = (nextPeriod: PosKpiPeriod) => {
    setPeriod(nextPeriod);
    setPage(1);
  };

  const handlePageSizeChange = (nextPageSize: number) => {
    setPageSize(nextPageSize);
    setPage(1);
  };

  const kpiCards = useMemo<PosKpiCardItem[]>(() => [
    {
      detail: analytics.periodLabel,
      icon: ShoppingCart,
      label: 'Venta POS',
      tone: 'coral',
      value: formatCurrency(analytics.revenue),
    },
    {
      detail: `Ticket prom. ${formatCurrency(analytics.averageTicket)}`,
      icon: Receipt,
      label: 'Tickets',
      tone: 'blue',
      value: String(analytics.tickets),
    },
    {
      detail: 'Cobro cash registrado',
      icon: Banknote,
      label: 'Venta efectivo',
      tone: 'green',
      value: formatCurrency(analytics.totalCashSales),
    },
    {
      detail: `${percent(analytics.overShortRate)} sobre efectivo`,
      icon: Scale,
      label: 'Diferencia caja',
      tone: hasDifference ? 'red' : 'green',
      value: `${analytics.netDifference > 0 ? '+' : ''}${formatCurrency(analytics.netDifference)}`,
    },
    {
      detail: 'Calculado por backend',
      icon: TrendingUp,
      label: 'Efectivo esperado',
      tone: 'blue',
      value: formatCurrency(analytics.expectedCash),
    },
    {
      detail: 'Reportado en cierres',
      icon: Wallet,
      label: 'Efectivo contado',
      tone: 'purple',
      value: formatCurrency(analytics.countedCash),
    },
    {
      detail: `${analytics.totalCount} registros disponibles`,
      icon: Clock3,
      label: 'Cierres',
      tone: 'coral',
      value: String(analytics.closings),
    },
    {
      detail: analytics.topWarehouses[0]?.name ?? 'Sin almacen dominante',
      icon: Package,
      label: 'Almacen lider',
      tone: 'yellow',
      value: analytics.topWarehouses[0] ? formatCurrency(analytics.topWarehouses[0].value) : formatCurrency(0),
    },
  ], [analytics, formatCurrency, hasDifference]);

  const handlePrintReport = () => {
    const registerNameById = new Map(details.map((detail) => [
      String(detail.cashRegisterId),
      detail.cashRegister?.name || detail.cashRegister?.code || `Caja ${detail.cashRegisterId}`,
    ]));
    const dateFormatter = new Intl.DateTimeFormat(currentLanguage.code, {
      dateStyle: 'medium',
      timeStyle: 'short',
    });

    printStandardKpiReport({
      charts: [
        {
          rows: analytics.paymentMix.map((item) => ({
            label: item.method,
            value: item.amount,
            valueLabel: `${formatCurrency(item.amount)} · ${item.percentage}%`,
          })),
          title: 'Mezcla de pago',
        },
        {
          rows: analytics.hourlySales.map((item) => ({
            label: `${item.hour}:00`,
            value: item.sales,
            valueLabel: formatCurrency(item.sales),
          })),
          title: 'Venta por hora',
        },
        {
          rows: analytics.topCashRegisters.map((item) => ({
            label: item.name,
            value: item.value,
            valueLabel: formatCurrency(item.value),
          })),
          title: 'Cajas con mayor venta',
        },
        {
          rows: analytics.topWarehouses.map((item) => ({
            label: item.name,
            value: item.value,
            valueLabel: formatCurrency(item.value),
          })),
          title: 'Almacenes con mayor venta',
        },
      ],
      companyIdentity: companyPrintIdentity,
      documentName: 'KPIs de punto de venta',
      locale: currentLanguage.code,
      meta: [
        { label: 'Periodo', value: analytics.periodLabel },
        { label: 'Moneda preferida', value: preferredCurrency },
        { label: 'Cierres incluidos', value: String(analytics.closings) },
        { label: 'Registros disponibles', value: String(analytics.totalCount) },
      ],
      metrics: kpiCards.map((card) => ({ detail: card.detail, label: card.label, value: card.value })),
      reportTitle: 'KPIs de punto de venta',
      subtitle: 'Lectura ejecutiva de cierres, tickets, mezcla de pago y diferencias de caja por periodo.',
      tables: [
        {
          emptyLabel: 'No hay cierres de caja en el periodo.',
          headers: ['Cierre', 'Fecha', 'Caja', 'Almacén', 'Tickets', 'Venta', 'Diferencia'],
          rows: rows.map((row) => {
            const currency = row.currencyCode ?? preferredCurrency;
            return [
              String(row.id),
              dateFormatter.format(new Date(row.closedAt)),
              registerNameById.get(String(row.cashRegisterId)) ?? `Caja ${row.cashRegisterId}`,
              `Almacén ${row.warehouseId}`,
              String(row.ticketsCount),
              formatCurrency(Number(row.totalSalesAmount ?? 0), currency),
              `${Number(row.overShortAmount ?? 0) > 0 ? '+' : ''}${formatCurrency(Number(row.overShortAmount ?? 0), currency)}`,
            ];
          }),
          title: 'Detalle de cierres de caja',
        },
      ],
    });
  };

  return (
    <div className="space-y-5">
      <PosKpiTitleBar disabled={!isCompanyPrintIdentityReady || loading} onPrint={handlePrintReport} />

      <PosKpiFilters
        loading={loading}
        period={period}
        onPeriodChange={handlePeriodChange}
        onRefresh={refresh}
      />

      {loading ? (
        <div className="flex items-center gap-3 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-medium text-blue-900 dark:border-blue-800 dark:bg-blue-900/20 dark:text-blue-100">
          <RefreshCw className="h-4 w-4 animate-spin" />
          Cargando cierres reales de POS para el periodo seleccionado.
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
            Reintentar
          </button>
        </div>
      ) : null}

      {!loading && !error && rows.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
          No hay cierres de caja reales en este periodo. Abre y cierra un turno para alimentar estos KPIs.
        </div>
      ) : null}

      <PosKpiContextStrip
        closings={analytics.closings}
        nativeBreakdown={nativeBreakdown}
        preferredCurrency={preferredCurrency}
        rateDate={revenueAggregate.data?.exchangeRate.effectiveDate ?? ''}
        rateLabel={revenueAggregate.data?.exchangeRate.mode === 'configured' ? 'Tasa configurada' : 'Tasa diaria'}
        totalCount={analytics.totalCount}
      />

      <PosKpiGrid items={kpiCards} />

      <PosKpiSignals analytics={analytics} insight={insight} />

      <PosKpiOperatingPanels
        analytics={analytics}
        formatCurrency={formatCurrency}
        maxHourlySales={maxHourlySales}
        paymentBreakdownNote={paymentBreakdownNote}
        preferredCurrency={preferredCurrency}
      />

      <PosKpiCashClosingTable
        formatCurrency={formatCurrency}
        items={paginatedRows}
        page={page}
        pageSize={pageSize}
        totalItems={rows.length}
        onPageChange={setPage}
        onPageSizeChange={handlePageSizeChange}
      />
    </div>
  );
}

function getInsight(analytics: PosKpiAnalytics) {
  if (Math.abs(analytics.netDifference) >= 1) {
    return {
      tone: 'risk' as const,
      text: `Hay una diferencia neta de caja de ${analytics.netDifference > 0 ? '+' : ''}${analytics.netDifference.toFixed(2)} ${analytics.primaryCurrency}; revisa arqueos antes de cerrar el periodo.`,
    };
  }

  if (analytics.closings === 0) {
    return {
      tone: 'info' as const,
      text: `No hay cierres POS visibles en ${analytics.periodLabel}; los KPIs se activan cuando se cierre el primer turno.`,
    };
  }

  if (analytics.tickets > 0) {
    return {
      tone: 'success' as const,
      text: `${analytics.tickets} tickets cerrados en ${analytics.periodLabel}; la venta POS ya esta lista para seguimiento financiero.`,
    };
  }

  return {
    tone: 'info' as const,
    text: `${analytics.closings} cierres sin tickets en ${analytics.periodLabel}; revisa operaciones antes de comparar ventas.`,
  };
}
