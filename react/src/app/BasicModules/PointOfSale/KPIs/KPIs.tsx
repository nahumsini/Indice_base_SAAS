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
import { useCurrencyAwareMoney } from '../../shared/useCurrencyAwareMoney';
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
  const { convertToPreferred, formatPreferred, preferredCurrency, rateContext, summarize } = useCurrencyAwareMoney();
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

  const analytics = useMemo(() => buildPosKpiAnalytics({
    rows,
    details,
    period,
    totalCount,
    preferredCurrency,
    convertAmount: convertToPreferred,
  }), [convertToPreferred, details, period, preferredCurrency, rows, totalCount]);

  const formatCurrency = (amount: number) => formatPreferred(amount, preferredCurrency);
  const totalPages = Math.max(1, Math.ceil(rows.length / pageSize));
  const paginatedRows = rows.slice((page - 1) * pageSize, page * pageSize);
  const maxHourlySales = Math.max(...analytics.hourlySales.map((entry) => entry.sales), 0);
  const hasDifference = Math.abs(analytics.netDifference) >= 1;
  const insight = getInsight(analytics);
  const paymentBreakdownNote = detailError
    || (detailFetchLimited
      ? 'El desglose por metodo muestra efectivo del listado; usa un periodo mas corto para cargar todos los metodos.'
      : '');
  const nativeSummary = summarize(rows.map((row) => ({
    amount: Number(row.totalSalesAmount ?? 0),
    currency: row.currencyCode ?? preferredCurrency,
  })));

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

  return (
    <div className="space-y-5">
      <PosKpiTitleBar />

      <PosKpiFilters
        loading={loading}
        period={period}
        onPeriodChange={handlePeriodChange}
        onRefresh={refresh}
      />

      {loading ? (
        <div className="flex items-center gap-3 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-semibold text-blue-900 dark:border-blue-800 dark:bg-blue-900/20 dark:text-blue-100">
          <RefreshCw className="h-4 w-4 animate-spin" />
          Cargando cierres reales de POS para el periodo seleccionado.
        </div>
      ) : null}

      {error ? (
        <div className="flex flex-col gap-3 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-900 dark:border-rose-800 dark:bg-rose-900/20 dark:text-rose-100 sm:flex-row sm:items-center sm:justify-between">
          <span className="inline-flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            {error}
          </span>
          <button
            type="button"
            onClick={refresh}
            className="inline-flex min-h-9 items-center justify-center rounded-lg border border-rose-200 bg-white px-3 text-sm font-bold text-rose-700 transition hover:bg-rose-100 dark:border-rose-800 dark:bg-slate-900 dark:text-rose-300 dark:hover:bg-rose-900/30"
          >
            Reintentar
          </button>
        </div>
      ) : null}

      {!loading && !error && rows.length === 0 ? (
        <div className="rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-600 shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
          No hay cierres de caja reales en este periodo. Abre y cierra un turno para alimentar estos KPIs.
        </div>
      ) : null}

      <PosKpiContextStrip
        closings={analytics.closings}
        nativeBreakdown={nativeSummary.nativeBreakdown}
        preferredCurrency={preferredCurrency}
        rateDate={rateContext.effectiveDate}
        rateLabel={rateContext.label}
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
